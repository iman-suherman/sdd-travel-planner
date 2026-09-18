/** Deterministic judges for TripSpec golden scenarios. */

const BAHASA_HINTS = [
  "yang",
  "dari",
  "ke",
  "atau",
  "mau",
  "pilih",
  "opsi",
  "belum",
  "data",
  "tanggal",
  "budget",
  "hotel",
  "berangkat",
  "kamu",
  "aja",
  "dong",
  "ya",
  "oke",
  "bisa",
  "ada",
  "untuk",
  "malam",
];

const BANNED_FILLER = [
  /aku bantu ya/i,
  /cuaca\s+\w+\s+bagus/i,
  /sesuai policy dulu/i,
];

export type JudgeContext = {
  scenarioId: string;
  reply: string;
  toolResults: Array<{ name: string; facts: Record<string, unknown> }>;
  /** When true, expect clarifying question not 3 options. */
  expectClarify?: boolean;
  /** When true, expect grounded 3 options. */
  expectThreeOptions?: boolean;
  /** When true, expect hotel names from hotel tools. */
  expectHotels?: boolean;
  /** When true, inventing a specific bait price must fail. */
  expectRefuseInvent?: boolean;
  expectGuide?: boolean;
  expectDayPlan?: boolean;
  expectNotifications?: boolean;
  inventBait?: string[];
};

export type JudgeResult = {
  name: string;
  pass: boolean;
  detail: string;
};

export function judgeBahasa(reply: string): JudgeResult {
  const lower = reply.toLowerCase();
  const hits = BAHASA_HINTS.filter((w) => lower.includes(w)).length;
  const pass = hits >= 2 || /pilih|opsi|berangkat|belum punya/i.test(reply);
  return {
    name: "bahasa",
    pass,
    detail: pass
      ? `Bahasa heuristic ok (${hits} hints)`
      : `Too few Bahasa hints (${hits})`,
  };
}

export function judgeNoFiller(reply: string): JudgeResult {
  for (const re of BANNED_FILLER) {
    if (re.test(reply)) {
      return { name: "no-filler", pass: false, detail: `Banned pattern: ${re}` };
    }
  }
  return { name: "no-filler", pass: true, detail: "No banned filler" };
}

export function judgeOptionCount(
  reply: string,
  expectThree: boolean,
): JudgeResult {
  if (!expectThree) {
    return { name: "option-count", pass: true, detail: "Skipped (not required)" };
  }
  const numbered = reply.match(/(?:^|\n)\s*(?:[-*]|\d+[.)])\s+/gm) ?? [];
  const boldOpts = reply.match(/\*\*[^*]+\*\*/g) ?? [];
  const count = Math.max(numbered.length, Math.min(boldOpts.length, 4));
  const pass = count >= 3 || /1\..*2\..*3\./s.test(reply);
  return {
    name: "option-count",
    pass,
    detail: pass ? `Found ~${count} options` : `Expected 3 options, found ~${count}`,
  };
}

export function judgeClarify(reply: string, expect: boolean): JudgeResult {
  if (!expect) {
    return { name: "clarify", pass: true, detail: "Skipped" };
  }
  const pass =
    /\?/.test(reply) &&
    /(dari mana|tanggal|kapan|berapa orang|origin|berangkat)/i.test(reply);
  return {
    name: "clarify",
    pass,
    detail: pass
      ? "Asked clarifying question"
      : "Expected short clarifying Q for missing slots",
  };
}

export function judgeGrounding(
  reply: string,
  toolResults: JudgeContext["toolResults"],
): JudgeResult {
  if (!toolResults.length) {
    return {
      name: "grounding",
      pass: true,
      detail: "No tool facts this turn — skip price ⊆ check",
    };
  }
  const blob = JSON.stringify(toolResults);
  const prices = reply.match(/Rp\s*[\d.]+/gi) ?? [];
  if (!prices.length) {
    return {
      name: "grounding",
      pass: true,
      detail: "No prices in reply",
    };
  }
  const bad: string[] = [];
  for (const p of prices) {
    const digits = p.replace(/[^\d]/g, "");
    if (!digits) continue;
    if (!blob.replace(/[^\d]/g, "").includes(digits) && !blob.includes(p.replace(/\s/g, " "))) {
      // also try formatted with dots
      const withDots = Number(digits).toLocaleString("id-ID");
      if (!blob.includes(withDots) && !blob.includes(digits)) {
        bad.push(p);
      }
    }
  }
  // Hotel names
  const hotelNames =
    toolResults.flatMap(
      (t) =>
        ((t.facts.hotels as Array<{ name: string }>) ?? []).map((h) => h.name),
    ) ?? [];
  for (const name of [
    "Hilton Imaginary",
    "Fake Resort",
    "Hotel Invented",
  ]) {
    if (reply.includes(name)) bad.push(name);
  }

  const pass = bad.length === 0;
  return {
    name: "grounding",
    pass,
    detail: pass
      ? `All ${prices.length} prices grounded` +
        (hotelNames.length ? `; hotels available: ${hotelNames.join(", ")}` : "")
      : `Ungrounded: ${bad.join(", ")}`,
  };
}

export function judgeRefuseInvent(
  reply: string,
  baits: string[] | undefined,
  expect: boolean,
): JudgeResult {
  if (!expect) {
    return { name: "refuse-invent", pass: true, detail: "Skipped" };
  }
  const baitsList = baits ?? ["900rb", "900.000", "Rp 900", "03:00", "jam 3 pagi"];
  const claimsInvented =
    /(ada[!.,]|ketemu|tersedia|bisa book).*900/i.test(reply) ||
    /GA-900/i.test(reply) ||
    (/Rp\s*900/.test(reply) && /book|ada/i.test(reply));

  const refuses =
    /belum ada|tidak ada|nggak ada|ga ada|ngga ada|bukan di data|belum punya|dari data/i.test(
      reply,
    ) ||
    baitsList.some(
      (b) =>
        reply.toLowerCase().includes("belum") &&
        reply.toLowerCase().includes(b.toLowerCase().slice(0, 3)),
    );

  const pass = refuses && !claimsInvented;
  return {
    name: "refuse-invent",
    pass,
    detail: pass
      ? "Refused / clarified without inventing bait fare"
      : "Appears to invent or fail to refuse missing inventory",
  };
}

export function judgeHotels(
  reply: string,
  toolResults: JudgeContext["toolResults"],
  expect: boolean,
): JudgeResult {
  if (!expect) {
    return { name: "hotels", pass: true, detail: "Skipped" };
  }
  const names = toolResults.flatMap(
    (t) => ((t.facts.hotels as Array<{ name: string }>) ?? []).map((h) => h.name),
  );
  if (!names.length) {
    return {
      name: "hotels",
      pass: false,
      detail: "Expected hotel tool facts",
    };
  }
  const hit = names.filter((n) => reply.includes(n)).length;
  const pass = hit >= 1 || /hotel|malam/i.test(reply);
  return {
    name: "hotels",
    pass,
    detail: pass
      ? `Hotel content grounded (${hit}/${names.length} names)`
      : "Expected hotel options from tool facts",
  };
}

export function judgeGuide(reply: string, toolResults: JudgeContext["toolResults"], expect: boolean): JudgeResult {
  if (!expect) return { name: "guide", pass: true, detail: "Skipped" };
  const guide = toolResults.find((t) => t.facts.guide)?.facts.guide as
    | { city?: string; areas?: string[] }
    | undefined;
  const city = guide?.city ?? "";
  const area = guide?.areas?.[0] ?? "";
  const pass = Boolean(city && reply.includes(city) && (!area || reply.includes(area)));
  return {
    name: "guide",
    pass,
    detail: pass ? `Explained ${city}` : `Expected guide city/area (${city} / ${area})`,
  };
}

export function judgeDayPlan(reply: string, expect: boolean): JudgeResult {
  if (!expect) return { name: "day-plan", pass: true, detail: "Skipped" };
  const pass = /hari\s*1/i.test(reply) && /hari\s*2/i.test(reply);
  return {
    name: "day-plan",
    pass,
    detail: pass ? "Day outline present" : "Expected Hari 1 and Hari 2 from the guide",
  };
}

export function judgeNotifications(
  reply: string,
  toolResults: JudgeContext["toolResults"],
  expect: boolean,
): JudgeResult {
  if (!expect) return { name: "notifications", pass: true, detail: "Skipped" };
  const titles = toolResults.flatMap(
    (t) =>
      ((t.facts.notifications as Array<{ title: string }>) ?? []).map((n) => n.title),
  );
  const hit = titles.filter((title) => reply.includes(title));
  const channelOk = /in-app/i.test(reply);
  const pass = hit.length >= 2 && channelOk;
  return {
    name: "notifications",
    pass,
    detail: pass
      ? `Reminders listed (${hit.length}/${titles.length})`
      : `Expected in-app titles from the tool, got ${hit.join(", ") || "none"}`,
  };
}

export function runJudges(ctx: JudgeContext): JudgeResult[] {
  return [
    judgeBahasa(ctx.reply),
    judgeNoFiller(ctx.reply),
    judgeClarify(ctx.reply, Boolean(ctx.expectClarify)),
    judgeGuide(ctx.reply, ctx.toolResults, Boolean(ctx.expectGuide)),
    judgeDayPlan(ctx.reply, Boolean(ctx.expectDayPlan)),
    judgeOptionCount(ctx.reply, Boolean(ctx.expectThreeOptions)),
    judgeHotels(ctx.reply, ctx.toolResults, Boolean(ctx.expectHotels)),
    judgeNotifications(ctx.reply, ctx.toolResults, Boolean(ctx.expectNotifications)),
    judgeGrounding(ctx.reply, ctx.toolResults),
    judgeRefuseInvent(ctx.reply, ctx.inventBait, Boolean(ctx.expectRefuseInvent)),
  ];
}

export function allPassed(results: JudgeResult[]): boolean {
  return results.every((r) => r.pass);
}
