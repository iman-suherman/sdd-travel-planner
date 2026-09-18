import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@tripspec/agent/runner";
import { runTool } from "@tripspec/agent/tools";

export const runtime = "nodejs";

type Body = {
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
};

function placeQuery(text: string): string {
  const t = text.toLowerCase();
  if (/jepang|japan|tokyo|nrt|shinjuku/.test(t)) return "Tokyo";
  if (/singap/.test(t)) return "Singapore";
  if (/bali|denpasar|dps|kuta|ubud/.test(t)) return "Bali";
  return "";
}

function inferForceTools(
  history: string,
  lastUser: string,
): Array<{
  name:
    | "get_destination_guide"
    | "search_flights"
    | "search_hotels"
    | "plan_notifications";
  arguments: Record<string, unknown>;
}> {
  const t = lastUser.toLowerCase();
  const place = placeQuery(`${history}\n${lastUser}`) || "Bali";
  const tools: Array<{
    name:
      | "get_destination_guide"
      | "search_flights"
      | "search_hotels"
      | "plan_notifications";
    arguments: Record<string, unknown>;
  }> = [];

  if (/kunci|ingatkan|pengingat|notifikasi/.test(t)) {
    tools.push({
      name: "plan_notifications",
      arguments: { destination: place, departDate: "" },
    });
  }
  if (/hotel/.test(t)) {
    tools.push({
      name: "search_hotels",
      arguments: { city: place, preferCheaper: /murah|nomor 2|lebih murah/.test(t), limit: 3 },
    });
  }
  if (/bali|jepang|japan|tokyo|singap|denpasar|liburan|mau ke/.test(t)) {
    tools.push({
      name: "get_destination_guide",
      arguments: { query: placeQuery(lastUser) || place },
    });
  }
  const ready =
    /(jakarta|cgk|surabaya)/.test(t) &&
    Boolean(placeQuery(lastUser) || placeQuery(history)) &&
    /(oktober|okt|tanggal|januari|februari|maret|april|mei|juni|juli|agustus|september|november|desember|\d{1,2})/.test(
      t,
    );
  if (ready && !/900rb|jam 3 pagi/.test(t)) {
    tools.push({
      name: "search_flights",
      arguments: {
        origin: /surabaya/.test(t) ? "Surabaya" : "Jakarta",
        destination: placeQuery(lastUser) || place,
        limit: 3,
      },
    });
  }
  return tools;
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
  const forceTools = lastUser ? inferForceTools(history, lastUser.content) : [];

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
