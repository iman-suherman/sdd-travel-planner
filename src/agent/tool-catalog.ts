import type { CapabilityPack, PackTool } from "./compose";

export type ForcedTool = {
  name: string;
  arguments: Record<string, unknown>;
};

function rx(pattern: string): RegExp {
  return new RegExp(pattern, "i");
}

function firstMatch(
  text: string,
  rows: Array<{ value: string; match: string }> | undefined,
): string {
  for (const row of rows ?? []) {
    if (rx(row.match).test(text)) return row.value;
  }
  return "";
}

export function toolSpecRel(tool: Pick<PackTool, "name" | "spec">): string {
  return tool.spec ?? `specs/tools/${tool.name.replaceAll("_", "-")}.md`;
}

/** Human checklist copied into specs/training/results. Paths come from the catalog. */
export function chatCheckLines(pack: CapabilityPack): string[] {
  const catalog = pack.modules.tools?.catalog ?? [];
  const spec = (name: string) => {
    const tool = catalog.find((item) => item.name === name);
    return tool ? `\`${toolSpecRel(tool)}\`` : `\`${name}\``;
  };
  return [
    "Train scores one turn at a time. The chatbot is the same pack and the same model. It does not re-run the judges.",
    "Each tool the bubble names is a catalog entry. The chip opens the spec generated from that entry. The model does not read the markdown.",
    "",
    ...catalog.map((tool) => `- \`${tool.name}\` — ${tool.when}. ${spec(tool.name)}`),
    "",
    "Leave this terminal. In a second one:",
    "",
    "```bash",
    "npm run demo",
    "```",
    "",
    `Open http://localhost:3000. Under the composer the footer should show \`qwen3.5:latest\`, pack \`${pack.pack_id}@${pack.version}\`, and a link to \`specs/training/results/latest.md\`. The same footer lists the tool specs above. If it says \`template fallback\`, the bubble is the template.`,
    "The end of a good thread is an itinerary: guide details, numbered days, then flight options with no price.",
    "",
    `- **S1.** Click \`Mau ke Jepang\`. Expect Tokyo, Shinjuku, Hari 1 and Hari 2, and one question. No price. Spec: ${spec("get_destination_guide")}.`,
    `- **S2.** Click \`Dari Jakarta ke Bali tanggal 12–15 Oktober, 2 orang\`. Expect the Bali itinerary, then QZ-751, GA-404, and JT-39 with times only. No Rp. Specs: ${spec("get_destination_guide")}, ${spec("search_flights")}.`,
    `- **S3.** Run S2, then type \`Yang nomor 2, sekalian hotel di Bali\`. Expect stay names and areas. No nightly rate. Spec: ${spec("search_hotels")}.`,
    `- **S4.** Type \`Ada tiket Garuda jam 3 pagi harga 900rb?\`. Expect a refusal of that flight and no price in the reply. Spec: ${spec("search_flights")}.`,
    `- **S5.** Click \`Kunci opsi 2 dan ingatkan aku sebelum berangkat\`. Expect the three in-app titles. No price. Spec: ${spec("plan_notifications")}.`,
    `- **S6.** After S1, type \`berangkat dari Jakarta, besok, saya dan istri aja\`. Expect the three Tokyo flights and no repeat of the guide. besok is the date. Spec: ${spec("search_flights")}.`,
    "",
    "A green pass bar does not mean these bubbles will match. Read the reply.",
  ];
}

export function toolMeaning(pack: CapabilityPack, name: string): string | undefined {
  return pack.modules.tools?.catalog?.find((tool) => tool.name === name)?.meaning;
}

export function resolvedDate(text: string, now = new Date()): string {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  const lower = text.toLowerCase();
  if (/\bbesok\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return fmt(d);
  }
  if (/\blusa\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    return fmt(d);
  }
  if (/hari ini/.test(lower)) return fmt(now);
  return "";
}

/** Which catalog tools this sentence should run. Rules live on the pack, not in the chat route. */
export function inferForceTools(
  pack: CapabilityPack,
  history: string,
  lastUser: string,
): ForcedTool[] {
  const tools = pack.modules.tools;
  const catalog = tools?.catalog ?? [];
  const resolve = tools?.resolve;
  const last = lastUser.toLowerCase();
  const combined = `${history}\n${lastUser}`.toLowerCase();
  const place = firstMatch(combined, resolve?.places) || resolve?.default_place || "";
  const query = firstMatch(last, resolve?.places) || place;
  const origin = firstMatch(last, resolve?.origins) || "Jakarta";
  const cheaper = resolve?.cheaper ? rx(resolve.cheaper).test(last) : false;
  const dateText = resolvedDate(last) || resolvedDate(history);
  const out: ForcedTool[] = [];

  for (const tool of catalog) {
    const invoke = tool.invoke;
    if (!invoke) continue;
    if (invoke.match && !rx(invoke.match).test(last)) continue;
    if (invoke.unless && rx(invoke.unless).test(last)) continue;
    const ready = (invoke.require ?? []).every((need) => {
      if (need === "origin") return Boolean(firstMatch(last, resolve?.origins));
      if (need === "place") {
        return Boolean(firstMatch(last, resolve?.places) || firstMatch(history, resolve?.places));
      }
      if (need === "date") return Boolean(resolve?.date && rx(resolve.date).test(last));
      return false;
    });
    if (!ready) continue;
    const args: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(invoke.arguments ?? {})) {
      if (raw === "@place") args[key] = place;
      else if (raw === "@query") args[key] = query;
      else if (raw === "@origin") args[key] = origin;
      else if (raw === "@cheaper") args[key] = cheaper;
      else if (raw === "@date") args[key] = dateText;
      else args[key] = raw;
    }
    out.push({ name: tool.name, arguments: args });
  }
  return out;
}
