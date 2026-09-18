import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type PackTool = {
  name: string;
  meaning: string;
  description: string;
  when: string;
  /** Repo-relative markdown the generator writes. */
  spec?: string;
  parameters?: Array<{ name: string; type: string; description?: string }>;
  invoke?: {
    match?: string;
    unless?: string;
    require?: Array<"origin" | "place" | "date">;
    arguments?: Record<string, string | number | boolean>;
  };
};

export type CapabilityPack = {
  pack_id: string;
  version: string;
  status: string;
  spec_ref: string;
  locked_invariants: string[];
  modules: {
    persona: {
      name: string;
      role?: string;
      voice: string;
      languages: string[];
      address_fallback: string;
    };
    reply_rules: {
      system_preamble: string;
      hard_rules: string[];
      cta: string;
      style?: string;
      max_words?: number;
      prefer_template_when_ungrounded?: boolean;
    };
    few_shot: {
      good: Array<{ user: string; assistant: string; why?: string }>;
      bad: Array<{ user: string; assistant: string; why?: string }>;
    };
    tools?: {
      allowed?: string[];
      resolve?: {
        default_place?: string;
        date?: string;
        cheaper?: string;
        places?: Array<{ value: string; match: string }>;
        origins?: Array<{ value: string; match: string }>;
      };
      catalog?: PackTool[];
    };
  };
};

export function repoRoot(): string {
  const fromModule = join(dirname(fileURLToPath(import.meta.url)), "../..");
  const candidates = [
    process.env.TRIPSPEC_ROOT,
    process.cwd(),
    join(process.cwd(), "../.."),
    fromModule,
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (existsSync(join(c, "contracts/vibe.md"))) {
      return c;
    }
  }
  return fromModule;
}

export function defaultPackPath(): string {
  return join(repoRoot(), "contracts/packs/tripspec-nl.baseline.json");
}

export function loadPack(path = defaultPackPath()): CapabilityPack {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as CapabilityPack;
}

/** Latest `npm run train` report. The chatbot demo reads this. The eval does not. */
export function loadLatestTrainingReport(): { path: string; text: string } | null {
  const path = join(repoRoot(), "specs/training/results/latest.md");
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf8");
  const text = raw.split(/^## Check the same pack/m)[0]?.trim();
  if (!text) return null;
  return { path, text };
}

/**
 * Build the system prompt from the capability pack.
 * The chatbot demo may also append the persisted train report.
 * `npm run train` does not pass that report.
 */
export function composeSystemPrompt(
  pack: CapabilityPack,
  factsJson?: string,
  trainingResults?: string,
): string {
  const { persona, reply_rules, few_shot } = pack.modules;
  const lines: string[] = [];

  lines.push(reply_rules.system_preamble);
  lines.push("");
  lines.push(`Persona: ${persona.name} — ${persona.voice}`);
  lines.push(`Address traveler as: ${persona.address_fallback}`);
  lines.push(`Languages: ${persona.languages.join(", ")} (Bahasa first)`);
  lines.push(`Pack: ${pack.pack_id}@${pack.version} (spec_ref=${pack.spec_ref})`);
  lines.push("");
  lines.push("HARD RULES:");
  for (const rule of reply_rules.hard_rules) {
    lines.push(`- ${rule}`);
  }
  lines.push("");
  lines.push(`CTA: ${reply_rules.cta}`);
  if (reply_rules.style) lines.push(`Style: ${reply_rules.style}`);
  if (reply_rules.max_words) {
    lines.push(`Max words: ~${reply_rules.max_words}`);
  }
  lines.push("");
  lines.push("LOCKED INVARIANTS:");
  for (const inv of pack.locked_invariants) {
    lines.push(`- ${inv}`);
  }

  if (few_shot.good.length) {
    lines.push("");
    lines.push("GOOD EXAMPLES (imitate):");
    for (const ex of few_shot.good.slice(0, 4)) {
      lines.push(`User: ${ex.user}`);
      lines.push(`Assistant: ${ex.assistant}`);
    }
  }
  if (few_shot.bad.length) {
    lines.push("");
    lines.push("BAD EXAMPLES (avoid):");
    for (const ex of few_shot.bad.slice(0, 3)) {
      lines.push(`User: ${ex.user}`);
      lines.push(`Assistant: ${ex.assistant}`);
      if (ex.why) lines.push(`Why bad: ${ex.why}`);
    }
  }

  if (factsJson) {
    lines.push("");
    lines.push("GROUNDED FACTS (guide text, flight options, stay names). Never quote a price.");
    lines.push(factsJson);
  }

  if (trainingResults) {
    lines.push("");
    lines.push("PERSISTED TRAINING RESULTS");
    lines.push(
      "Saved by npm run train at specs/training/results/latest.md. Imitate a PASS reply only when the latest traveler sentence matches that scenario. If this thread already contains the guide or the flight list, do not paste that PASS reply again. Continue from the new slots. besok, lusa, and hari ini are dates; do not ask for tanggal spesifik after one of them. Do not repeat a pattern the report marks FAIL. The GGUF was not updated.",
    );
    lines.push(trainingResults);
  }

  lines.push("");
  const names =
    pack.modules.tools?.catalog?.map((tool) => tool.name) ??
    pack.modules.tools?.allowed ??
    [];
  lines.push(
    names.length
      ? `When you need inventory, call only these tools: ${names.join(", ")}. Never invent tool results.`
      : "When you need live inventory, call tools search_flights or search_hotels. Never invent tool results.",
  );

  return lines.join("\n");
}

export function templateFallback(facts: {
  flights?: Array<{
    airline?: string;
    flightNo: string;
    departTime: string;
    arriveTime?: string;
  }>;
  hotels?: Array<{ name: string; area: string }>;
  guide?: {
    city?: string;
    summary?: string;
    days?: Array<{ day: number; title: string; detail: string }>;
    visaNote?: string;
  };
  notifications?: Array<{ when?: string; offsetLabel?: string; title: string; channel?: string }>;
  clarify?: string;
}): string {
  if (facts.clarify) return facts.clarify;

  const parts: string[] = [];
  if (facts.guide?.city) {
    parts.push(`**${facts.guide.city}** — ${facts.guide.summary ?? ""}`.trim());
    if (facts.guide.visaNote) parts.push(facts.guide.visaNote);
    for (const d of facts.guide.days ?? []) {
      parts.push(`Hari ${d.day}: **${d.title}**. ${d.detail}`);
    }
  }
  if (facts.flights?.length) {
    const lines = facts.flights.slice(0, 3).map(
      (f, i) =>
        `${i + 1}. **${f.flightNo}**${f.airline ? ` ${f.airline}` : ""} ${f.departTime}${f.arriveTime ? `–${f.arriveTime}` : ""}`,
    );
    parts.push(`3 opsi terbang, tanpa harga:\n${lines.join("\n")}\nPilih 1/2/3 untuk itinerary.`);
  }
  if (facts.hotels?.length) {
    const lines = facts.hotels.slice(0, 3).map(
      (h, i) => `${i + 1}. **${h.name}** (${h.area})`,
    );
    parts.push(`Menginap di itinerary, tanpa tarif:\n${lines.join("\n")}`);
  }
  if (facts.notifications?.length) {
    const lines = facts.notifications.map(
      (n) => `- ${n.when ?? n.offsetLabel} (${n.channel ?? "in-app"}): **${n.title}**`,
    );
    parts.push(`Pengingat in-app:\n${lines.join("\n")}`);
  }
  if (parts.length) return parts.join("\n\n");

  return "Belum punya data cukup. Sebut negara atau kota, lalu kota berangkat, tanggal, dan jumlah orang. Aku susun itinerary dari panduan, tanpa harga.";
}
