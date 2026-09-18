/**
 * Golden scenario runner — load pack → run S1–S5 → write results/*.md
 *
 * Usage: npx tsx src/eval/run-scenarios.ts
 * Offline/deterministic: TRIPSPEC_EVAL_MODE=mock npx tsx src/eval/run-scenarios.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPack, templateFallback } from "../agent/compose";
import { runAgent } from "../agent/runner";
import { runTool, type ToolCall } from "../agent/tools";
import { runJudges, type JudgeContext } from "./judges";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const RESULTS = join(ROOT, "specs/training/results");

type Scenario = {
  id: string;
  title: string;
  turns: Array<{ role: "user" | "assistant"; content: string }>;
  forceTools?: ToolCall[];
  judge: Omit<JudgeContext, "reply" | "toolResults" | "scenarioId">;
  /** When Ollama unavailable, use this canned reply (mock mode). */
  mockReply?: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "S1",
    title: "Discuss country, then one missing slot",
    turns: [{ role: "user", content: "Mau ke Jepang" }],
    forceTools: [{ name: "get_destination_guide", arguments: { query: "Jepang" } }],
    judge: { expectClarify: true, expectGuide: true, expectDayPlan: true },
    mockReply:
      "Kalau Jepang tanpa kota, panduan memakai Tokyo (Shinjuku, Asakusa, Shibuya). Visa tidak aku terbitkan — cek sumber resmi.\n\nHari 1: tiba di NRT, hotel Shinjuku.\nHari 2: Asakusa lalu Shibuya.\nHari 3: longgar, ke NRT.\n\nBerangkat dari mana?",
  },
  {
    id: "S2",
    title: "Full slots → day plan + 3 flights",
    turns: [
      {
        role: "user",
        content:
          "Dari Jakarta ke Bali tanggal 12–15 Oktober, budget 8 juta, 2 orang",
      },
    ],
    forceTools: [
      { name: "get_destination_guide", arguments: { query: "Bali" } },
      {
        name: "search_flights",
        arguments: { origin: "Jakarta", destination: "Bali", limit: 3 },
      },
    ],
    judge: { expectGuide: true, expectDayPlan: true, expectThreeOptions: true },
    mockReply:
      "Bali, 12–15 Oktober, 2 orang, dari Jakarta. Warga Indonesia tidak butuh visa ke Bali.\n\nHari 1: Tiba dan pantai selatan (Kuta atau Seminyak).\nHari 2: Ubud.\nHari 3: Sanur lalu pulang.\n\n3 opsi dari data:\n1. **QZ-751** 06:30 — Rp 890.000\n2. **GA-404** 08:15 — Rp 1.250.000\n3. **JT-39** 14:40 — Rp 760.000\n\nPilih 1/2/3?",
  },
  {
    id: "S3",
    title: "After pick, hotels from data",
    turns: [
      {
        role: "assistant",
        content:
          "3 opsi: 1. QZ-751 2. GA-404 3. JT-39. Pilih 1/2/3?",
      },
      { role: "user", content: "Yang nomor 2, sekalian hotel di Bali" },
    ],
    forceTools: [
      {
        name: "search_hotels",
        arguments: { city: "Bali", preferCheaper: true, limit: 3 },
      },
    ],
    judge: { expectHotels: true, expectThreeOptions: true },
    mockReply:
      "Opsi 2 **GA-404** terkunci. Hotel dari data, yang lebih murah dulu:\n1. **Kuta Beach Inn** (Kuta) — Rp 450.000/malam\n2. **Ubud Rice Lodge** (Ubud) — Rp 520.000/malam\n3. **Sanur Coast Hotel** (Sanur) — Rp 590.000/malam\n\nPilih 1/2/3?",
  },
  {
    id: "S4",
    title: "Refuse invent missing price",
    turns: [
      { role: "user", content: "Ada tiket Garuda jam 3 pagi harga 900rb?" },
    ],
    forceTools: [
      {
        name: "search_flights",
        arguments: { origin: "Jakarta", destination: "Bali", limit: 3 },
      },
    ],
    judge: { expectRefuseInvent: true },
    mockReply:
      "Di data aku belum ada Garuda jam 03:00 harga 900rb. Mau aku list 3 opsi yang tersedia aja?",
  },
  {
    id: "S5",
    title: "Lock option → in-app reminders",
    turns: [
      {
        role: "assistant",
        content: "Pilih 1/2/3? Opsi 2 adalah GA-404.",
      },
      {
        role: "user",
        content: "Kunci opsi 2 dan ingatkan aku sebelum berangkat",
      },
    ],
    forceTools: [
      {
        name: "plan_notifications",
        arguments: { departDate: "12 Oktober", destination: "Bali" },
      },
    ],
    judge: { expectNotifications: true },
    mockReply:
      "Opsi 2 terkunci. Pengingat in-app dari jadwal:\n- 14 hari sebelum berangkat: **Cek dokumen perjalanan**\n- 7 hari sebelum berangkat: **Kunci penerbangan dan hotel**\n- 1 hari sebelum berangkat: **Pengingat berangkat**\n\nItu saja. Tidak ada channel lain di data.",
  },
];

async function ollamaUp(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function mockReplyFor(scenario: Scenario): {
  reply: string;
  toolResults: ReturnType<typeof runTool>[];
} {
  const toolResults = (scenario.forceTools ?? []).map((c) => runTool(c));
  if (scenario.mockReply) {
    return { reply: scenario.mockReply, toolResults };
  }
  if (scenario.id === "S2" || scenario.id === "S3") {
    const flights =
      (toolResults.find((t) => t.name === "search_flights")?.facts
        .flights as Array<{
        flightNo: string;
        departTime: string;
        priceLabel: string;
      }>) ?? [];
    const hotels =
      (toolResults.find((t) => t.name === "search_hotels")?.facts
        .hotels as Array<{
        name: string;
        area: string;
        priceLabel: string;
      }>) ?? [];
    return {
      reply: templateFallback({ flights, hotels }),
      toolResults,
    };
  }
  return {
    reply: scenario.mockReply ?? "Belum punya data.",
    toolResults,
  };
}

const AUDIENCE: Record<string, { waiting: string; want: string }> = {
  S1: {
    waiting:
      "Tools first: get_destination_guide for Jepang (no model). Then one chat call. The guide says Tokyo, not a fare.",
    want: "Explain Tokyo from the guide (areas + Hari 1 and Hari 2) and ask one missing slot. No price.",
  },
  S2: {
    waiting:
      "Tools first: Bali guide + search_flights (QZ-751, GA-404, JT-39 are already in the prompt). Then one chat call.",
    want: "Day outline from the guide, then exactly 3 numbered flights with those prices. Do not ask where they depart — Jakarta is already in the message.",
  },
  S3: {
    waiting: "Tools first: search_hotels for Bali, cheapest three. Then one chat call.",
    want: "Name the locked flight and list hotel names and rates from the tool only.",
  },
  S4: {
    waiting:
      "Tools first: search_flights, so a real list exists. The 03:00 / 900rb fare is not in it. Then one chat call.",
    want: "Say that fare is not in the data. Do not confirm GA-712 or Rp 900.000.",
  },
  S5: {
    waiting:
      "Tools first: plan_notifications only. That JSON has reminder titles and no prices. Then one chat call.",
    want: "List the in-app reminders (Cek dokumen perjalanan, Kunci penerbangan dan hotel, Pengingat berangkat). Do not add an Rp amount — it is not in this turn's JSON.",
  },
};

/** Printed after the pass bar, and copied into the results markdown. */
const CHAT_CHECK = [
  "Train scores one turn at a time. The chatbot is the same pack and the same model. It does not re-run the judges.",
  "Leave this terminal. In a second one:",
  "",
  "```bash",
  "npm run demo",
  "```",
  "",
  "Open http://localhost:3000. Under the composer the footer should show `qwen3.5:latest` and the same pack version as the header above (`tripspec-nl@2026-09-19.1` unless you bumped it). If the footer says `template fallback`, the bubble is the canned template, not the model’s own sentence.",
  "Tool names under a bubble are local inventory reads. They are not a second HTTP call. The only model call is still `POST /v1/chat/completions`.",
  "Refresh the page between checks. One long thread mixes history, and the UI picks tools from the latest sentence plus that history.",
  "",
  "- **S1.** Click `Mau ke Jepang`. Expect Tokyo, an area from the guide (Shinjuku), Hari 1 and Hari 2, and one question. No `Rp`.",
  "- **S2.** Click `Dari Jakarta ke Bali tanggal 12–15 Oktober, budget 8 juta, 2 orang`. Expect a Bali day outline, then exactly three flights: QZ-751 Rp 890.000, GA-404 Rp 1.250.000, JT-39 Rp 760.000. It should not ask where you depart.",
  "- **S3.** Refresh, run the S2 chip, then type `Yang nomor 2, sekalian hotel di Bali`. Expect Kuta Beach Inn, Ubud Rice Lodge, Sanur Coast Hotel and those rates. The chip `Yang nomor 2, sekalian hotel` alone still searches Bali (the UI defaults the city), but it has no locked flight in the thread.",
  "- **S4.** Not a chip. Refresh and type `Ada tiket Garuda jam 3 pagi harga 900rb?`. Expect a refusal: no GA-712, no Rp 900.000. Train forces `search_flights` on this sentence so the real list is in the prompt. The chatbot does not: that sentence has no Jakarta and no date, and the UI skips flights when it sees `900rb` or `jam 3 pagi`. A bubble that only lists the three real fares, with `template fallback` in the footer, is the weak S4 pass — it did not refuse.",
  "- **S5.** Refresh and click `Kunci opsi 2 dan ingatkan aku sebelum berangkat`. Expect Cek dokumen perjalanan, Kunci penerbangan dan hotel, Pengingat berangkat, and the words `in-app`. No `Rp`. A price here is the same grounding fail as train, even when the titles are right. The chip does not send a depart date; train sends `12 Oktober`. The titles are the same either way.",
  "",
  "A green pass bar does not mean these bubbles will match. Read the reply.",
];

const FIX: Record<string, string> = {
  "option-count":
    "Edit contracts/packs/tripspec-nl.baseline.json, not the model. If this turn already has flight facts, do not ask origin again. End with exactly 3 numbered lines: flightNo, time, priceLabel. Do not invent a Hari 4. Bump the pack version, then npm run train again.",
  notifications:
    "The reminder tool already returned the three titles. The reply must include at least two of them and the words in-app. Add a hard rule: if plan_notifications facts are in this turn, list every title and do not ask for slots again. Add a few-shot for “Kunci opsi 2 dan ingatkan aku”. Re-run npm run train.",
  grounding:
    "A price in the reply is not in this turn's tool JSON. On S5 only plan_notifications runs, so Rp 1.250.000 is ungrounded even though it is the real GA-404 fare. Remove Rp from the lock few-shot. Hard rule: no fare on a reminder reply unless search_flights facts are in the same turn. Re-run npm run train.",
  "refuse-invent":
    "SPEC-004: name the missing fare and refuse it. Do not confirm 03:00 or 900rb. A list of other flights is not a refusal. Tighten the few-shot, then npm run train.",
  guide:
    "The reply skipped the guide's city or first area. SPEC-001: explain the place from get_destination_guide before asking anything else.",
  "day-plan":
    "The reply needs Hari 1 and Hari 2, copied from the guide. Do not add days the guide does not have.",
  clarify:
    "After the explanation, ask one missing slot (origin, then dates, budget, travelers). One question, not a package.",
  hotels:
    "Hotel names must come from search_hotels. Do not invent a property, and do not skip the list after the user asked for hotels.",
  bahasa:
    "SPEC-002: stay Bahasa-first. City and airline names may stay English.",
  "no-filler":
    "Drop brochure openers (aku bantu ya, invented weather, vouchers). State the plan or the refusal.",
};

function lastUser(scenario: Scenario): string {
  const turn = [...scenario.turns].reverse().find((t) => t.role === "user");
  return turn?.content ?? "";
}

const colorOn =
  process.env.NO_COLOR == null &&
  (Boolean(process.stdout.isTTY) || process.env.FORCE_COLOR === "1");

function ansi(code: string): string {
  return colorOn ? `\x1b[${code}m` : "";
}

const reset = ansi("0");
const bold = ansi("1");
const dim = ansi("2");
const red = ansi("31");
const green = ansi("32");
const yellow = ansi("33");
const blue = ansi("34");
const magenta = ansi("35");
const cyan = ansi("36");

function paint(codes: string, text: string): string {
  if (!colorOn || !codes) return text;
  return codes + text + reset;
}

function termWidth(): number {
  const cols = process.stdout.columns ?? 88;
  return Math.max(64, Math.min(cols, 100));
}

function wrap(text: string, width: number): string[] {
  const limit = Math.max(24, width);
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let rest = para;
    if (!rest) {
      out.push("");
      continue;
    }
    while (rest.length > limit) {
      let cut = rest.lastIndexOf(" ", limit);
      if (cut < 16) cut = limit;
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut).trimStart();
    }
    out.push(rest);
  }
  return out.length ? out : [""];
}

let boxColor = cyan;

function openBox(title: string, color: string) {
  boxColor = color;
  const rule = "─".repeat(Math.max(4, termWidth() - title.length - 3));
  console.log(paint(color + bold, `┌ ${title} ${rule}`));
}

function boxRow(label: string, value: string, valueColor = "") {
  const labelCol = 10;
  const chunks = wrap(value, termWidth() - labelCol - 4);
  chunks.forEach((chunk, i) => {
    const lab = (i === 0 ? label : "").padEnd(labelCol);
    console.log(
      paint(boxColor, "│ ") + paint(dim, lab) + paint(valueColor, chunk),
    );
  });
}

function boxText(text: string, color = "") {
  if (!text) {
    console.log(paint(boxColor, "│"));
    return;
  }
  for (const chunk of wrap(text, termWidth() - 4)) {
    console.log(paint(boxColor, "│ ") + paint(color, chunk));
  }
}

function closeBox(color = boxColor) {
  console.log(paint(color, "└" + "─".repeat(Math.max(4, termWidth() - 1))));
  console.log("");
}

function printTrace(line: string) {
  const text = line.trim();
  if (!text) return;
  if (text.startsWith("API") || text.startsWith("Payload")) boxText(text, blue + bold);
  else if (text.startsWith("←")) boxText(text, /HTTP 2/.test(text) ? green : red + bold);
  else if (text.startsWith("waiting") || text.startsWith("Wait")) boxText(text, yellow + bold);
  else if (text.startsWith("Ollama now")) boxText(text, green);
  else if (text.startsWith("Local tools") || text.startsWith("Tools")) boxText(text, magenta + bold);
  else if (text.startsWith("Chat round")) boxText(text, cyan + bold);
  else if (text.includes("→ empty")) boxText(text, red);
  else if (text.includes("→")) boxText(text, magenta);
  else boxText(text, dim);
}

function printPersisted(report: string[], outPath: string, latestPath: string) {
  openBox("Persisted results  not a new model", cyan);
  boxText(
    "Ollama did not save weights. These two files are the same report. They are local and gitignored.",
    yellow,
  );
  boxText(outPath, bold);
  boxText(latestPath, bold);
  boxText("");
  const end = report.findIndex((line) => line.startsWith("## Check the same pack"));
  const body = end >= 0 ? report.slice(0, end) : report;
  for (const line of body) {
    const plain = line.replaceAll("**", "").replaceAll("`", "");
    if (!plain.trim()) {
      boxText("");
      continue;
    }
    if (plain.startsWith("```")) continue;
    const color = /\bFAIL\b/.test(plain) ? red + bold : /\bPASS\b/.test(plain) ? green : "";
    boxText(plain, color);
  }
  closeBox(cyan);
}

function printIntro(opts: {
  packId: string;
  version: string;
  mode: string;
  model: string;
  baseUrl: string;
}) {
  console.log("");
  openBox("What this command is doing", cyan);
  boxRow("Chain", "npm run train → scripts/train.sh → src/eval/run-scenarios.ts");
  boxRow("Weights", "Same GGUF before and after. This does not train the model.");
  boxRow("Pack", `${opts.packId}@${opts.version}`, bold);
  boxRow("Model", `${opts.model}  ${opts.baseUrl}`, bold);
  boxRow(
    "Mode",
    opts.mode === "live"
      ? "live — Ollama answered /api/tags. A quiet minute is the model, not a hang."
      : "mock — Ollama was not used. Canned replies are scored so the judges can be shown offline.",
    opts.mode === "live" ? green : yellow,
  );
  boxText("");
  boxText("1  Tools read src/inventory/mock-data.ts locally. No HTTP.", magenta);
  boxText("2  compose.ts builds the system prompt from the pack + that JSON.", cyan);
  boxText("3  POST /v1/chat/completions", blue + bold);
  boxText("4  judges.ts checks the text. No second model.", yellow);
  boxText("");
  boxText("Pass bar: S4 must pass, and at least 4 of 5. A green bar can still hide a red S5.", bold);
  boxText("A red bar means edit the SPEC or the pack, then run this command again.", yellow);
  closeBox(cyan);
}

async function main() {
  const pack = loadPack();
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const modeEnv = process.env.TRIPSPEC_EVAL_MODE;
  const live = modeEnv === "live" || (modeEnv !== "mock" && (await ollamaUp(baseUrl)));
  const mode = live ? "live" : "mock";

  printIntro({
    packId: pack.pack_id,
    version: pack.version,
    mode,
    model: process.env.OLLAMA_CHAT_MODEL ?? "qwen3.5:latest",
    baseUrl,
  });
  const lines: string[] = [
    `# Train results — ${new Date().toISOString()}`,
    "",
    `- Pack: \`${pack.pack_id}@${pack.version}\``,
    `- Mode: **${mode}**`,
    `- Model: \`${process.env.OLLAMA_CHAT_MODEL ?? "qwen3.5:latest"}\``,
    "",
    "| ID | Title | Result | Notes |",
    "|----|-------|--------|-------|",
  ];

  let passCount = 0;
  const required = new Set(["S4"]);
  let requiredFailed = false;

  for (const [index, scenario] of SCENARIOS.entries()) {
    const brief = AUDIENCE[scenario.id];
    const n = index + 1;
    const total = SCENARIOS.length;
    openBox(`${n}/${total}  ${scenario.id}  ${scenario.title}`, yellow);
    boxRow("Progress", `${passCount} passed so far`, dim);
    boxRow("User", `“${lastUser(scenario)}”`, bold);
    if (brief) {
      boxRow("Wait", brief.waiting, cyan);
      boxRow("Must see", brief.want, bold);
    }
    boxText("");

    let reply: string;
    let toolResults: Array<{ name: string; facts: Record<string, unknown> }>;
    let usedFallback = false;

    if (mode === "mock") {
      const m = mockReplyFor(scenario);
      reply = m.reply;
      toolResults = m.toolResults;
      boxText("Mock: no POST /v1/chat/completions. The canned reply is scored.", yellow);
    } else {
      try {
        const result = await runAgent({
          pack,
          messages: scenario.turns,
          forceTools: scenario.forceTools,
          onTrace: printTrace,
        });
        reply = result.reply;
        toolResults = result.toolResults;
        usedFallback = result.usedTemplateFallback;
      } catch (err) {
        boxText(
          `Live call failed for ${scenario.id}; scoring the canned reply instead.`,
          red + bold,
        );
        boxText(err instanceof Error ? err.message : String(err), red);
        const m = mockReplyFor(scenario);
        reply = m.reply;
        toolResults = m.toolResults;
      }
    }

    const judges = runJudges({
      scenarioId: scenario.id,
      reply,
      toolResults,
      ...scenario.judge,
    });
    const failed = judges.filter((j) => !j.pass);
    const pass = failed.length === 0;
    if (pass) passCount += 1;
    if (required.has(scenario.id) && !pass) requiredFailed = true;

    const note = failed.map((j) => `${j.name}: ${j.detail}`).join("; ");
    const fallbackNote = usedFallback ? " (template fallback)" : "";
    lines.push(
      `| ${scenario.id} | ${scenario.title} | ${pass ? "PASS" : "FAIL"} | ${note || "ok"}${fallbackNote} |`,
    );

    lines.push("");
    lines.push(`## ${scenario.id} — ${scenario.title}`);
    lines.push("");
    if (brief) {
      lines.push(`**Must see:** ${brief.want}`);
      lines.push("");
    }
    lines.push("**Reply:**");
    lines.push("");
    lines.push("```");
    lines.push(reply);
    lines.push("```");
    lines.push("");
    lines.push("**Judges:**");
    for (const j of judges) {
      lines.push(`- ${j.pass ? "PASS" : "FAIL"} \`${j.name}\` — ${j.detail}`);
    }
    if (!pass) {
      lines.push("");
      lines.push("**What to do:**");
      for (const j of failed) {
        lines.push(`- \`${j.name}\`: ${FIX[j.name] ?? "Edit the SPEC or the pack, then npm run train."}`);
      }
    }
    lines.push("");

    boxText("");
    boxText(
      `${scenario.id}  ${pass ? "PASS" : "FAIL"}${note ? ` — ${note}` : ""}${fallbackNote}`,
      (pass ? green : red) + bold,
    );
    boxText(
      `Progress ${n}/${total} done — ${passCount} passed, ${n - passCount} failed, ${total - n} left`,
      dim,
    );
    if (pass && usedFallback) {
      boxText(
        "Caution: the model's own text was replaced by the template. If this is S4, a flight list is not a refusal — read the reply in the results file.",
        yellow,
      );
    }
    if (!pass) {
      boxText("What to do (pack and SPEC, not a new model):", yellow + bold);
      for (const j of failed) {
        boxText(
          `• ${j.name}: ${FIX[j.name] ?? "Edit the SPEC or the pack, then npm run train."}`,
          yellow,
        );
      }
    }
    closeBox(pass ? green : red);
  }

  const barOk = !requiredFailed && passCount >= 4;
  lines.push("---");
  lines.push("");
  lines.push(
    `**Pass bar:** ${passCount}/5 scenarios, S4 required — ${barOk ? "PASS" : "FAIL"}`,
  );
  lines.push("");
  lines.push("## Check the same pack in the chatbot");
  lines.push("");
  for (const line of CHAT_CHECK) lines.push(line);
  lines.push("");

  mkdirSync(RESULTS, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = join(RESULTS, `${stamp}.md`);
  writeFileSync(outPath, lines.join("\n"), "utf8");
  writeFileSync(join(RESULTS, "latest.md"), lines.join("\n"), "utf8");

  openBox(barOk ? `Pass bar  PASS ${passCount}/5` : `Pass bar  FAIL ${passCount}/5`, barOk ? green : red);
  boxText(`Wrote ${outPath}`, dim);
  boxText(
    barOk
      ? "S4 passed and at least 4 scenarios passed."
      : "Need S4 green and at least 4 of 5.",
    (barOk ? green : red) + bold,
  );
  if (!barOk) {
    boxText(
      "Do not pull another model to clear this. Change the SPEC or contracts/packs/tripspec-nl.baseline.json using the “What to do” lines above, then npm run train again.",
      yellow,
    );
  } else if (passCount < 5) {
    boxText(
      "The bar is green and a scenario is still red. Read that scenario’s “What to do” before you tell the room the planner is trained.",
      yellow,
    );
  }
  closeBox(barOk ? green : red);

  printPersisted(lines, outPath, join(RESULTS, "latest.md"));

  openBox("Check the same pack in the chatbot", blue);
  for (const line of CHAT_CHECK) {
    if (line === "```bash" || line === "```") continue;
    const plain = line.replaceAll("**", "").replaceAll("`", "");
    if (!plain) boxText("");
    else if (plain.startsWith("- ")) boxText(plain.slice(2), plain.startsWith("- S") ? bold : "");
    else boxText(plain);
  }
  closeBox(blue);
  process.exit(barOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
