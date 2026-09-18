import {
  composeSystemPrompt,
  loadLatestTrainingReport,
  loadPack,
  templateFallback,
  type CapabilityPack,
} from "./compose";
import {
  runTool,
  TOOL_DEFINITIONS,
  type ToolCall,
  type ToolName,
  type ToolResult,
} from "./tools";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

export type RunOptions = {
  pack?: CapabilityPack;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Force tool use for demos / evals without relying on model tool-calling. */
  forceTools?: ToolCall[];
  maxToolRounds?: number;
  /** Line-oriented trace for `npm run train`. Omitted by the chat UI. */
  onTrace?: (line: string) => void;
  /** Chat demo only. Eval must leave this false so the score does not depend on a previous report. */
  useTrainingResults?: boolean;
};

export type RunResult = {
  reply: string;
  usedTemplateFallback: boolean;
  toolResults: ToolResult[];
  model: string;
  packVersion: string;
  trainingResultsPath: string | null;
};

function env(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function showsPrice(text: string): boolean {
  return /Rp\s*[\d.]/i.test(text) || /\b\d+(?:[.,]\d+)?\s*(rb|ribu|juta)\b/i.test(text);
}

function isUngrounded(reply: string): boolean {
  return showsPrice(reply);
}

const TOOL_MEANING: Record<string, string> = {
  get_destination_guide:
    "Local guide only. Jepang maps to Tokyo. Returns areas, day plan, visa note. No fare and no web search.",
  search_flights:
    "Mock flights for the itinerary. Airline, flight number, and times. No fare. Does not book.",
  search_hotels:
    "Places to stay after a pick. Name and area only. No nightly rate.",
  plan_notifications:
    "In-app reminders only (14 days, 7 days, 1 day). No email, WhatsApp, SMS, or push.",
};

function previewSystem(content: string): string[] {
  const all = content.split("\n");
  const out: string[] = [];
  for (const line of all.slice(0, 6)) {
    if (line.trim()) out.push(line);
  }
  if (all.length > 6) {
    out.push(
      `… ${all.length - 6} more lines in this system message (hard rules, few-shot). Composed from the pack, not a second prompt in code.`,
    );
  }
  const factAt = all.findIndex((line) => line.startsWith("GROUNDED FACTS"));
  if (factAt >= 0) {
    out.push(
      "GROUNDED FACTS are this turn's guide and flight or stay names. Do not add a price.",
    );
    const facts = all.slice(factAt, factAt + 18);
    for (const line of facts) out.push(line.length > 160 ? `${line.slice(0, 160)}…` : line);
    const hidden = all.length - factAt - facts.length;
    if (hidden > 0) out.push(`… ${hidden} more fact lines`);
  }
  return out;
}

function tracePayload(
  url: string,
  apiKey: string | undefined,
  body: Record<string, unknown>,
  onTrace: (line: string) => void,
) {
  const messages = (body.messages as ChatMessage[] | undefined) ?? [];
  const tools =
    (body.tools as Array<{ function?: { name?: string; description?: string } }> | undefined) ??
    [];
  onTrace(`   API  POST ${url}`);
  onTrace("   Payload  JSON body of that POST. This is the whole request the model sees.");
  onTrace(`   Payload  model ${String(body.model)}`);
  onTrace(`   Payload  temperature ${String(body.temperature ?? "default")}`);
  onTrace(
    "   Payload  stream false (field omitted). Ollama keeps the connection open and returns one JSON when generation finishes. Tokens are not printed as they are chosen.",
  );
  onTrace(
    apiKey
      ? "   Payload  header Authorization Bearer (key not printed)"
      : "   Payload  header Content-Type application/json. No API key.",
  );
  messages.forEach((message, index) => {
    const calls = message.tool_calls?.map((call) => call.function.name).join(", ");
    onTrace(
      `   Payload  messages[${index}] ${message.role}  ${(message.content ?? "").length} chars${calls ? `  tool_calls ${calls}` : ""}`,
    );
    const lines =
      message.role === "system"
        ? previewSystem(message.content ?? "")
        : [(message.content ?? "").replace(/\s+/g, " ").trim()].filter(Boolean);
    for (const line of lines) {
      const shown = line.length > 220 ? `${line.slice(0, 220)}…` : line;
      onTrace(`   Payload  | ${shown}`);
    }
  });
  onTrace(
    "   Tools  the tools array is a menu of functions, not a result. If the model returns tool_calls, this process runs them on the local inventory and POSTs again. They are not HTTP calls to an airline.",
  );
  for (const tool of tools) {
    const name = tool.function?.name ?? "unknown";
    onTrace(`   Tools  ${name} — ${TOOL_MEANING[name] ?? tool.function?.description ?? "offered to the model"}`);
  }
  onTrace(
    "   Wait  under the hood: fetch() blocks this script. The scenario does not score, and the next scenario does not start, until this response arrives.",
  );
  onTrace(
    "   Wait  Ollama reads the local GGUF for this model, samples the next token, appends it, and repeats. The file on disk is not rewritten. This is not training.",
  );
  onTrace("   waiting for Ollama…");
}

function formatBytes(n: number): string {
  if (!n) return "size unknown";
  const gb = n / 1024 ** 3;
  if (gb >= 0.1) return `${gb.toFixed(1)} GB`;
  return `${Math.round(n / 1024 ** 2)} MB`;
}

function startOllamaWatch(
  baseUrl: string,
  model: string,
  onTrace?: (line: string) => void,
): () => void {
  if (!onTrace) return () => {};
  const url = `${baseUrl.replace(/\/$/, "")}/api/ps`;
  let stopped = false;
  let last = "";
  const tick = async () => {
    if (stopped) return;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (!res.ok) {
        const line = `   Ollama now  GET ${url} returned HTTP ${res.status}. The chat POST is still running.`;
        if (line !== last) {
          last = line;
          onTrace(line);
        }
        return;
      }
      const data = (await res.json()) as {
        models?: Array<{
          name?: string;
          model?: string;
          size?: number;
          size_vram?: number;
          context_length?: number;
          details?: { parameter_size?: string; quantization_level?: string };
        }>;
      };
      const models = data.models ?? [];
      const stem = model.split(":")[0];
      const hit =
        models.find((item) => (item.name ?? item.model ?? "").includes(stem)) ?? models[0];
      const line = hit
        ? `   Ollama now  ${hit.name ?? hit.model ?? model} is in memory (${formatBytes(hit.size_vram || hit.size || 0)}${hit.details?.parameter_size ? `, ${hit.details.parameter_size}` : ""}${hit.details?.quantization_level ? ` ${hit.details.quantization_level}` : ""}${hit.context_length ? `, context ${hit.context_length}` : ""}). It is on the token loop for this POST.`
        : `   Ollama now  GET ${url} shows no model yet. It is loading the GGUF into memory, then the token loop starts.`;
      if (line !== last) {
        last = line;
        onTrace(line);
      }
    } catch {
      const line = `   Ollama now  could not read ${url}. The POST is still in flight. Silence here is generation, not a hang.`;
      if (line !== last) {
        last = line;
        onTrace(line);
      }
    }
  };
  const first = setTimeout(() => void tick(), 600);
  const timer = setInterval(() => void tick(), 4000);
  return () => {
    stopped = true;
    clearTimeout(first);
    clearInterval(timer);
  };
}

async function ollamaChat(
  baseUrl: string,
  apiKey: string | undefined,
  body: Record<string, unknown>,
  onTrace?: (line: string) => void,
): Promise<{
  message?: ChatMessage & {
    tool_calls?: ChatMessage["tool_calls"];
  };
  choices?: Array<{ message: ChatMessage }>;
}> {
  const url = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  if (onTrace) tracePayload(url, apiKey, body, onTrace);
  const stopWatch = startOllamaWatch(baseUrl, String(body.model ?? ""), onTrace);

  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    if (!res.ok) {
      const text = await res.text();
      onTrace?.(`        ← HTTP ${res.status} in ${elapsed}s`);
      throw new Error(`Ollama chat failed (${res.status}): ${text.slice(0, 400)}`);
    }
    const data = (await res.json()) as {
      message?: ChatMessage;
      choices?: Array<{ message: ChatMessage }>;
    };
    const msg = data.choices?.[0]?.message ?? data.message;
    const calls = msg?.tool_calls?.map((t) => t.function.name).join(", ");
    onTrace?.(
      `        ← HTTP ${res.status} in ${elapsed}s  ${calls ? `tool_calls ${calls}` : `reply ${(msg?.content ?? "").trim().length} chars`}`,
    );
    return data;
  } finally {
    stopWatch();
  }
}

function assistantMessage(data: Awaited<ReturnType<typeof ollamaChat>>): ChatMessage {
  if (data.choices?.[0]?.message) return data.choices[0].message;
  if (data.message) return data.message;
  throw new Error("No assistant message in Ollama response");
}

export async function runAgent(opts: RunOptions): Promise<RunResult> {
  const pack = opts.pack ?? loadPack();
  const model = opts.model ?? env("OLLAMA_CHAT_MODEL", "qwen3.5:latest");
  const baseUrl = opts.baseUrl ?? env("OLLAMA_BASE_URL", "http://127.0.0.1:11434");
  const apiKey = opts.apiKey ?? process.env.OLLAMA_API_KEY;
  const maxToolRounds = opts.maxToolRounds ?? 2;
  const trace = opts.onTrace;

  const toolResults: ToolResult[] = [];

  if (opts.forceTools?.length) {
    trace?.("   Local tools (no HTTP, inventory in this repo):");
    for (const call of opts.forceTools) {
      const result = runTool(call);
      toolResults.push(result);
      const arg = JSON.stringify(call.arguments);
      trace?.(`        ${call.name} ${arg} → ${result.ok ? "ok" : "empty"}`);
      const meaning = TOOL_MEANING[call.name];
      if (meaning) trace?.(`   Tools  ${call.name} — ${meaning}`);
    }
  } else {
    trace?.("   Local tools: none for this scenario.");
  }

  const factsPayload = toolResults.length
    ? JSON.stringify(
        toolResults.map((t) => ({ tool: t.name, facts: t.facts })),
        null,
        2,
      )
    : undefined;

  let trainingResultsPath: string | null = null;
  let trainingText: string | undefined;
  if (opts.useTrainingResults) {
    const report = loadLatestTrainingReport();
    if (!report) {
      throw new Error(
        "No persisted training results at specs/training/results/latest.md. Run npm run train before the chatbot demo.",
      );
    }
    trainingResultsPath = report.path;
    trainingText = report.text;
    trace?.(
      "   Training results  chatbot is using the saved report. npm run train does not load this file.",
    );
    trace?.(`   Training results  ${report.path}`);
  }

  const system = composeSystemPrompt(pack, factsPayload, trainingText);
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let reply = "";
  let rounds = 0;

  while (rounds <= maxToolRounds) {
    rounds += 1;
    trace?.(`   Chat round ${rounds}:`);
    const data = await ollamaChat(
      baseUrl,
      apiKey,
      {
        model,
        messages,
        tools: TOOL_DEFINITIONS,
        temperature: 0.3,
      },
      trace,
    );
    const msg = assistantMessage(data);

    if (msg.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: msg.content || "",
        tool_calls: msg.tool_calls,
      });
      for (const tc of msg.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }
        const result = runTool({
          name: tc.function.name as ToolName,
          arguments: args,
        });
        toolResults.push(result);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result.facts),
        });
      }
      // Refresh system facts for next round by appending a facts note
      messages.push({
        role: "system",
        content:
          "Updated grounded facts:\n" +
          JSON.stringify(
            toolResults.map((t) => ({ tool: t.name, facts: t.facts })),
            null,
            2,
          ),
      });
      continue;
    }

    reply = (msg.content || "").trim();
    break;
  }

  let usedTemplateFallback = false;
  const preferTemplate =
    pack.modules.reply_rules.prefer_template_when_ungrounded !== false;

  if ((!reply || isUngrounded(reply)) && preferTemplate) {
    const lastFlights = toolResults
      .filter((t) => t.name === "search_flights")
      .at(-1);
    const lastHotels = toolResults
      .filter((t) => t.name === "search_hotels")
      .at(-1);
    const lastGuide = toolResults
      .filter((t) => t.name === "get_destination_guide")
      .at(-1);
    const lastNotes = toolResults
      .filter((t) => t.name === "plan_notifications")
      .at(-1);
    const flights =
      (lastFlights?.facts.flights as Array<{
        flightNo: string;
        departTime: string;
        priceLabel: string;
      }>) ?? [];
    const hotels =
      (lastHotels?.facts.hotels as Array<{
        name: string;
        area: string;
        priceLabel: string;
      }>) ?? [];
    const guide = lastGuide?.facts.guide as
      | {
          city?: string;
          summary?: string;
          days?: Array<{ day: number; title: string; detail: string }>;
          visaNote?: string;
        }
      | undefined;
    const notifications =
      (lastNotes?.facts.notifications as Array<{
        when?: string;
        offsetLabel?: string;
        title: string;
        channel?: string;
      }>) ?? [];
    if (flights.length || hotels.length || guide || notifications.length) {
      reply = templateFallback({
        flights,
        hotels,
        guide: guide ?? undefined,
        notifications,
      });
      usedTemplateFallback = true;
    } else if (!reply) {
      reply = templateFallback({});
      usedTemplateFallback = true;
    }
  }

  return {
    reply,
    usedTemplateFallback,
    toolResults,
    model,
    packVersion: pack.version,
    trainingResultsPath,
  };
}
