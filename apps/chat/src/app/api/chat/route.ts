import { NextRequest, NextResponse } from "next/server";
import { loadLatestTrainingReport, loadPack } from "@tripspec/agent/compose";
import { inferForceTools, toolSpecRel } from "@tripspec/agent/tool-catalog";
import { runAgent } from "@tripspec/agent/runner";
import { runTool } from "@tripspec/agent/tools";
import { cursorFileHref, generateToolSpecs } from "@tripspec/specs/generate-tool-specs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProgressLine(text: string): boolean {
  return (
    text.startsWith("Working") ||
    text.startsWith("Ollama now") ||
    text.startsWith("waiting") ||
    text.startsWith("Chat round") ||
    text.startsWith("Local tools") ||
    text.startsWith("Training results") ||
    text.startsWith("←") ||
    text.includes("→")
  );
}

type Body = {
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
};

function decorateTools(
  tools: Array<{ name: string; summary: string }>,
) {
  const pack = loadPack();
  const catalog = pack.modules.tools?.catalog ?? [];
  return tools.map((tool) => {
    const spec = catalog.find((item) => item.name === tool.name);
    const file = spec ? toolSpecRel(spec) : undefined;
    return {
      name: tool.name,
      summary: tool.summary,
      meaning: spec?.meaning,
      when: spec?.when,
      spec: file,
      href: file ? cursorFileHref(file) : undefined,
    };
  });
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }

  const messages = body.messages?.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );
  if (!messages?.length) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const history = messages.map((m) => m.content).join("\n");
  const pack = loadPack();
  generateToolSpecs(pack);
  const forceTools = lastUser ? inferForceTools(pack, history, lastUser.content) : [];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const emit = (raw: string) => {
        const text = raw.trim();
        if (!text || !isProgressLine(text)) return;
        console.log(`[chat] ${text}`);
        send("log", { text });
      };

      emit("Working  turn started. Local tools first, then Ollama writes the reply.");
      await new Promise((resolve) => setTimeout(resolve, 20));

      const training = loadLatestTrainingReport();
      if (!training) {
        send("error", {
          error:
            "Belum ada hasil training. Jalankan npm run train. Chatbot demo hanya memakai specs/training/results/latest.md.",
        });
        controller.close();
        return;
      }

      try {
        const result = await runAgent({
          messages,
          forceTools,
          useTrainingResults: true,
          onTrace: emit,
        });
        const reply = result.reply || "(kosong)";
        const toolPreview = forceTools.map((c) => runTool(c));
        for (const ch of reply) {
          send("delta", { text: ch });
        }
        send("done", {
          model: result.model,
          packVersion: result.packVersion,
          usedTemplateFallback: result.usedTemplateFallback,
          trainingResults: "specs/training/results/latest.md",
          trainingResultsHref: cursorFileHref("specs/training/results/latest.md"),
          catalog: (pack.modules.tools?.catalog ?? []).map((tool) => {
            const spec = toolSpecRel(tool);
            return { name: tool.name, spec, href: cursorFileHref(spec) };
          }),
          tools: decorateTools(
            (result.toolResults.length ? result.toolResults : toolPreview).map((t) => ({
              name: t.name,
              summary: t.summary,
            })),
          ),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send("error", {
          error: `Ollama/agent error: ${message}. Cek OLLAMA_BASE_URL dan model (${process.env.OLLAMA_CHAT_MODEL ?? "qwen3.5:latest"}).`,
        });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
