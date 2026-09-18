import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@tripspec/agent/runner";
import { runTool } from "@tripspec/agent/tools";

export const runtime = "nodejs";

type Body = {
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
};

function inferForceTools(
  lastUser: string,
): Array<{
  name: "search_flights" | "search_hotels";
  arguments: Record<string, unknown>;
}> {
  const t = lastUser.toLowerCase();
  if (/hotel/.test(t)) {
    return [
      {
        name: "search_hotels",
        arguments: {
          city: "Bali",
          preferCheaper: /murah/.test(t),
          limit: 3,
        },
      },
    ];
  }
  if (
    /(jakarta|cgk)/.test(t) &&
    /(bali|dps|denpasar)/.test(t) &&
    /(oktober|okt|tanggal|\d)/.test(t)
  ) {
    return [
      {
        name: "search_flights",
        arguments: { origin: "Jakarta", destination: "Bali", limit: 3 },
      },
    ];
  }
  if (/cari tiket|3 opsi|list.*opsi|yang tersedia/.test(t)) {
    return [
      {
        name: "search_flights",
        arguments: { origin: "Jakarta", destination: "Bali", limit: 3 },
      },
    ];
  }
  return [];
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
  const forceTools = lastUser ? inferForceTools(lastUser.content) : [];

  try {
    const result = await runAgent({
      messages,
      forceTools,
    });

    const toolPreview = forceTools.map((c) => runTool(c));

    return NextResponse.json({
      reply: result.reply,
      model: result.model,
      packVersion: result.packVersion,
      usedTemplateFallback: result.usedTemplateFallback,
      tools: (result.toolResults.length ? result.toolResults : toolPreview).map(
        (t) => ({ name: t.name, summary: t.summary }),
      ),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `Ollama/agent error: ${message}. Cek OLLAMA_BASE_URL dan model (${process.env.OLLAMA_CHAT_MODEL ?? "qwen3.5:latest"}).`,
      },
      { status: 502 },
    );
  }
}
