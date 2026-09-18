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

/**
 * Build the Ollama system prompt **only** from the capability pack.
 * No competing mega-prompt in code.
 */
export function composeSystemPrompt(
  pack: CapabilityPack,
  factsJson?: string,
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

  lines.push("");
  lines.push(
    "When you need live inventory, call tools search_flights or search_hotels. Never invent tool results.",
  );

  return lines.join("\n");
}

/** Deterministic fallback when LLM invents or returns empty. */
export function templateFallback(facts: {
  flights?: Array<{
    flightNo: string;
    departTime: string;
    priceLabel: string;
  }>;
  hotels?: Array<{ name: string; area: string; priceLabel: string }>;
  clarify?: string;
}): string {
  if (facts.clarify) return facts.clarify;

  if (facts.flights?.length) {
    const opts = facts.flights.slice(0, 3);
    const lines = opts.map(
      (f, i) => `${i + 1}. **${f.flightNo}** ${f.departTime} — ${f.priceLabel}`,
    );
    return `3 opsi dari data:\n${lines.join("\n")}\n\nPilih 1/2/3, atau mau refine?`;
  }

  if (facts.hotels?.length) {
    const opts = facts.hotels.slice(0, 3);
    const lines = opts.map(
      (h, i) => `${i + 1}. **${h.name}** (${h.area}) — ${h.priceLabel}`,
    );
    return `Hotel dari data:\n${lines.join("\n")}\n\nPilih 1/2/3?`;
  }

  return "Belum punya data cukup. Kasih origin, destinasi, tanggal, budget, dan jumlah traveler dulu ya.";
}
