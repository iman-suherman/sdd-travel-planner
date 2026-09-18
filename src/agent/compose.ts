import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
    tools?: { allowed?: string[] };
  };
};

function repoRoot(): string {
  const fromModule = join(dirname(fileURLToPath(import.meta.url)), "../..");
  const candidates = [
    process.env.TRIPSPEC_ROOT,
    process.cwd(),
    join(process.cwd(), "../.."),
    fromModule,
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (existsSync(join(c, "contracts/packs/tripspec-nl.baseline.json"))) {
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
    lines.push("GROUNDED FACTS (only source of prices/names/flightNos):");
    lines.push(factsJson);
  }

  if (trainingResults) {
    lines.push("");
    lines.push("PERSISTED TRAINING RESULTS");
    lines.push(
      "Saved by npm run train at specs/training/results/latest.md. Imitate replies marked PASS. Do not repeat a pattern the report marks FAIL. The GGUF was not updated.",
    );
    lines.push(trainingResults);
  }

  lines.push("");
  lines.push(
    "When you need live inventory, call tools search_flights or search_hotels. Never invent tool results.",
  );

  return lines.join("\n");
}

export function templateFallback(facts: {
  flights?: Array<{
    flightNo: string;
    departTime: string;
    priceLabel: string;
  }>;
  hotels?: Array<{ name: string; area: string; priceLabel: string }>;
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
      (f, i) => `${i + 1}. **${f.flightNo}** ${f.departTime} — ${f.priceLabel}`,
    );
    parts.push(`3 opsi terbang dari data:\n${lines.join("\n")}\nPilih 1/2/3 sebelum hotel.`);
  }
  if (facts.hotels?.length) {
    const lines = facts.hotels.slice(0, 3).map(
      (h, i) => `${i + 1}. **${h.name}** (${h.area}) — ${h.priceLabel}`,
    );
    parts.push(`Hotel dari data:\n${lines.join("\n")}`);
  }
  if (facts.notifications?.length) {
    const lines = facts.notifications.map(
      (n) => `- ${n.when ?? n.offsetLabel} (${n.channel ?? "in-app"}): **${n.title}**`,
    );
    parts.push(`Pengingat in-app:\n${lines.join("\n")}`);
  }
  if (parts.length) return parts.join("\n\n");

  return "Belum punya data cukup. Sebut negara atau kota, lalu origin, tanggal, budget, dan jumlah orang — aku jelaskan dari panduan, bukan dari tebakan.";
}
