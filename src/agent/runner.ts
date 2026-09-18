import {
  composeSystemPrompt,
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
};

export type RunResult = {
  reply: string;
  usedTemplateFallback: boolean;
  toolResults: ToolResult[];
  model: string;
  packVersion: string;
};

function env(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function extractPricesAndNames(text: string): string[] {
  const found: string[] = [];
  const priceRe = /Rp\s*[\d.]+(?:\.\d{3})*/gi;
  for (const m of text.match(priceRe) ?? []) found.push(m.replace(/\s+/g, " "));
  return found;
}

function factStrings(toolResults: ToolResult[]): Set<string> {
  const s = new Set<string>();
  for (const tr of toolResults) {
    const raw = JSON.stringify(tr.facts);
    for (const m of raw.match(/Rp\s*[\d.]+/gi) ?? []) {
      s.add(m.replace(/\s+/g, " "));
    }
    for (const flight of (tr.facts.flights as Array<{ flightNo?: string; name?: string }>) ?? []) {
      if (flight.flightNo) s.add(flight.flightNo);
    }
    for (const hotel of (tr.facts.hotels as Array<{ name?: string }>) ?? []) {
      if (hotel.name) s.add(hotel.name);
    }
  }
  return s;
}

function isUngrounded(reply: string, toolResults: ToolResult[]): boolean {
  if (!toolResults.length) return false;
  const allowed = factStrings(toolResults);
  if (!allowed.size) return false;
  const prices = extractPricesAndNames(reply);
  if (!prices.length) return false;
  // Normalize for comparison: strip dots in thousands
  const norm = (p: string) => p.replace(/\s/g, "").toLowerCase();
  const allowedNorm = new Set([...allowed].map(norm));
  for (const p of prices) {
    const n = norm(p);
    let ok = false;
    for (const a of allowedNorm) {
      if (a.includes(n) || n.includes(a) || a.replace(/\./g, "") === n.replace(/\./g, "")) {
        ok = true;
        break;
      }
    }
    if (!ok) return true;
  }
  return false;
}

async function ollamaChat(
  baseUrl: string,
  apiKey: string | undefined,
  body: Record<string, unknown>,
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

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama chat failed (${res.status}): ${text.slice(0, 400)}`);
  }
  return (await res.json()) as {
    message?: ChatMessage;
    choices?: Array<{ message: ChatMessage }>;
  };
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

  const toolResults: ToolResult[] = [];

  if (opts.forceTools?.length) {
    for (const call of opts.forceTools) {
      toolResults.push(runTool(call));
    }
  }

  const factsPayload = toolResults.length
    ? JSON.stringify(
        toolResults.map((t) => ({ tool: t.name, facts: t.facts })),
        null,
        2,
      )
    : undefined;

  const system = composeSystemPrompt(pack, factsPayload);
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let reply = "";
  let rounds = 0;

  while (rounds <= maxToolRounds) {
    rounds += 1;
    const data = await ollamaChat(baseUrl, apiKey, {
      model,
      messages,
      tools: TOOL_DEFINITIONS,
      temperature: 0.3,
    });
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

  if ((!reply || isUngrounded(reply, toolResults)) && preferTemplate) {
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
  };
}
