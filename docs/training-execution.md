# Training execution — travel planner

This is the operator note for the gate. The presentation is the talk. This file is how you run it, what each scenario is allowed to say, and which result file to trust.

---

## What “train” means

Two commands, two different jobs. Do not describe them as one step.

| | `npm run train:aor` | `npm run train` |
| --- | --- | --- |
| Layer | A — Agent On Rails shape | B — behaviour |
| Input | `product/requirements.md` | `contracts/packs/tripspec-nl.baseline.json` and S1–S5 |
| Does | BRIEF → PRD → architecture → `aor gather` → a draft `specs/training/` | Loads the pack, calls tools, asks the model (or a canned reply), runs judges, writes a report |
| Writes | `.aor/generated-control-plane/` (gitignored) and `.aor/aor-pin.json` | `specs/training/results/<timestamp>.md` and `results/latest.md` |
| Changes replies? | No | Only after you edit the SPEC or the pack and re-run |
| Pinned control plane | `42ea059` on `agent-on-rails-control-plane` | — |

Layer A follows `guides/chatbot-training-orchestration.md` (discovery order of AOR-011, gather of AOR-010). The drafts it writes are not the workshop source of truth. The source of truth is:

- `specs/SPEC-001-trip-intake.md` through `specs/SPEC-005-notify-plan.md`
- `contracts/packs/tripspec-nl.baseline.json`
- `specs/training/scenarios.md`

`src/agent/compose.ts` builds the system prompt from the pack only. There is no second prompt in the runner.

The model default is `qwen3.5:latest` (`OLLAMA_CHAT_MODEL`, pulled with `npm run pull`). Training does not update that file.

---

## Under the hood — `npm run train`

The lines in the terminal are this chain. Nothing here updates model weights.

```text
npm run train
  └─ package.json  "train": "bash scripts/train.sh"
       └─ scripts/train.sh
            └─ npx tsx src/eval/run-scenarios.ts
                 ├─ read contracts/packs/tripspec-nl.baseline.json
                 ├─ GET  http://127.0.0.1:11434/api/tags     (2s) → live or mock
                 └─ for S1, then S2, then S3, then S4, then S5:
                      1. run forced tools locally (inventory JSON, no model)
                      2. compose.ts builds the system prompt from the pack + that JSON
                      3. POST /v1/chat/completions  model qwen3.5:latest
                      4. src/eval/judges.ts scores the reply
                      5. print "S2: PASS" or "S2: FAIL — …"   ← you see this immediately
                 └─ write specs/training/results/<utc>.md and results/latest.md
                 └─ exit 0 only if S4 passed and at least 4 of 5 passed
```

What each terminal line is:

| Line you see | What just happened |
| --- | --- |
| `npm notice run … train` / `bash scripts/train.sh` | npm ran the `train` script. The shell only prints the reminder and calls tsx. |
| `Edit SPECs / contracts/packs/…` | Not a check. A reminder that the next run uses whatever is already in those files. This command does not edit them. |
| `npx tsx src/eval/run-scenarios.ts` | The actual program. One Node process, scenarios in order, not in parallel. |
| `pack tripspec-nl@2026-09-19.1 — mode=live` | Pack loaded. `GET /api/tags` on `OLLAMA_BASE_URL` succeeded, so each scenario calls the model. If that GET fails, mode is `mock` and the canned replies are scored instead. `TRIPSPEC_EVAL_MODE=mock` or `live` skips the probe. |
| `S1: PASS` then later `S2: FAIL — option-count: …` | That scenario’s Ollama call returned, judges finished, and the line was printed before the next scenario starts. A quiet gap of one or two minutes is the model generating, not a hang. S4 and S5 have not run yet if they are not on screen. |
| `Wrote …/results/….md` | Only after S5. Same text is copied to `results/latest.md`. |
| `Pass bar: PASS (4/5)` | S4’s judge passed and at least four scenarios passed. Exit code 0. S5 can still be FAIL. `FAIL` here means exit code 1: S4 failed, or fewer than four scenarios passed. |

Inside one live scenario (`runAgent` in `src/agent/runner.ts`):

1. **Tools first, on purpose.** S2 forces `get_destination_guide` and `search_flights`. Those functions read `src/inventory/mock-data.ts` and return JSON. The model is not asked to invent the list.
2. **Prompt.** `composeSystemPrompt` turns the pack (preamble, hard rules, few-shots, invariants) plus that JSON into one system message. There is no other system prompt in code.
3. **Model.** `POST {OLLAMA_BASE_URL}/v1/chat/completions` with `OLLAMA_CHAT_MODEL` (default `qwen3.5:latest`), temperature 0.3, and the tool definitions. If the model returns `tool_calls`, the runner executes them and loops at most twice.
4. **Fallback.** If the reply is empty or contains an `Rp` amount that is not in the tool JSON, and the pack has `prefer_template_when_ungrounded: true`, the reply is replaced with `templateFallback`. The report then says `(template fallback)`. A reply that simply forgets to list three options is kept. That is why S2 can fail `option-count` with no fallback note.
5. **Judges.** `runJudges` is local string checks. No second model. The FAIL text after the dash is the first failing judge’s detail (`option-count: Expected 3 options, found ~1`).

S2’s judge counts numbered lines and `**bold**` names. “Found ~1” means the live reply did not look like three numbered options, even if a day plan was in the text. The fix is the pack (hard rule + few-shot that shows three numbered flights after the days), then the same command again. Do not change the GGUF to clear that line.

`npm run eval:mock` is the same file with `TRIPSPEC_EVAL_MODE=mock`: steps 3 and 4 are skipped and the canned reply is judged. `npm run eval:live` forces step 3 even if you want to be sure. `npm run train:aor` is not in this chain.

---

## How a run is scored

`src/eval/run-scenarios.ts` walks S1–S5. For each one it may force tools so the facts are present even if the model never calls them. `src/eval/judges.ts` then checks the reply. A scenario passes only if every judge that applies to it passes.

| Judge | Passes when |
| --- | --- |
| `bahasa` | Enough Indonesian function words, or a clear planner phrase |
| `no-filler` | No `aku bantu ya`, no “cuaca … bagus”, no policy-lecture opener |
| `clarify` | S1 only: a question mark and a missing-slot ask (origin / tanggal / berangkat) |
| `guide` | The guide’s city and first area appear (Tokyo + Shinjuku, or Bali + Kuta) |
| `day-plan` | The reply contains Hari 1 and Hari 2 |
| `option-count` | At least three numbered options when the scenario requires them |
| `hotels` | At least one hotel name from the hotel tool |
| `notifications` | At least two tool titles, and the text `in-app` |
| `grounding` | Every `Rp …` amount’s digits appear in the tool JSON |
| `refuse-invent` | S4 only: says the fare is not in the data, and does not confirm Rp 900.000 / GA-900 |

If the live reply is empty or contains a price that is not in the tool JSON, and `prefer_template_when_ungrounded` is true, the runner replaces the text with `templateFallback` built only from tool facts. The report marks that as template fallback. A fallback that still fails a judge is a red scenario.

**Pass bar.** S4 must pass. At least 4 of S1–S5 must pass. The process exits 0 only when both are true.

**Mode.** `npm run train` uses live Ollama when `http://127.0.0.1:11434` answers, unless `TRIPSPEC_EVAL_MODE=mock`. `npm run eval:mock` never calls the model. `npm run eval:live` always does. If a live call throws, that scenario falls back to the canned reply and the report still records a reply — read the notes before you call a live run green.

---

## Inventory the judges treat as true

Anything not in this list is an invention if the assistant states it as fact.

**Bali flights (CGK → DPS), the three the harness asks for:**

| flightNo | depart | price |
| --- | --- | --- |
| QZ-751 | 06:30 | Rp 890.000 |
| GA-404 | 08:15 | Rp 1.250.000 |
| JT-39 | 14:40 | Rp 760.000 |

There is no GA-712, no QZ-852, no 03:00 departure, and no Rp 900.000 or Rp 750.000 fare.

**Bali hotels, cheapest three:** Kuta Beach Inn Rp 450.000, Ubud Rice Lodge Rp 520.000, Sanur Coast Hotel Rp 590.000. Seminyak Garden is Rp 680.000 and is fourth.

**Tokyo** is the guide used for “Jepang”. Areas: Shinjuku, Asakusa, Shibuya. The visa note says this guide does not issue a visa.

**Reminders** from `plan_notifications`, channel `in-app` only:

| When | Title |
| --- | --- |
| 14 hari sebelum berangkat | Cek dokumen perjalanan |
| 7 hari sebelum berangkat | Kunci penerbangan dan hotel |
| 1 hari sebelum berangkat | Pengingat berangkat |

---

## Before — prompt only, live model

This is not produced by `npm run train`. It is the contrast capture.

| | |
| --- | --- |
| When | 2026-09-19 07:03 AEST |
| Model | `qwen3.5:latest` |
| Pack | none |
| Tools | none |
| Prompt | Brochure writer, told to invent if inventory is missing |
| File | [evidence/before-prompt-only-2026-09-19.md](./evidence/before-prompt-only-2026-09-19.md) |

| User | What the model did | Why it fails the planner gate |
| --- | --- | --- |
| Liburan ke Bali 3 hari budget 5jt | Assumed Jakarta/Surabaya. Invented GA 801 / QZ 920, Canggu Sunset Homestay, Ubud Eco Garden Villa. | No guide, no clarifying question, invented inventory. |
| Dari Jakarta ke Bali 12–15 Oktober, budget 5 juta, 2 orang | QZ 852 / QZ 853 at Rp 750.000. Hotels Bali Chill Homestay and Ubud Valley Guest House. Invented weather and a Grab voucher. | Prices and names are not in the stub. Not three real options. |
| Ada tiket Garuda jam 3 pagi harga 900rb? | Confirmed GA 712 at 03:00 for Rp 900.000. Added Nusa Dream Resort at Rp 650.000. | S4 failure. The safety reply is a sale. |

S3 and S5 were not captured in that run. The S2 reply already dumps hotels and a fake perk, which is the failure SPEC-003 and SPEC-005 exist to stop.

---

## After — planner gate

| | |
| --- | --- |
| When | 2026-09-18T21:23:35Z |
| Pack | `tripspec-nl@2026-09-19.1` |
| Mode | **mock** (canned replies, tools really executed) |
| Model tag in the report | `qwen3.5:latest` (not called) |
| File | [`specs/training/results/2026-09-18T21-23-35.md`](../specs/training/results/2026-09-18T21-23-35.md) |
| Result | **S1–S5 PASS. Pass bar PASS (5/5).** |

An earlier live 5/5 (`specs/training/results/2026-09-18T10-42-45.md`) scored the previous pack (`2026-09-18.1`), when the product was three ticket rows and S5 was an English switch. Do not cite that file as the planner result.

### S1 — Discuss a country, then one missing slot

- **User:** `Mau ke Jepang`
- **Tools:** `get_destination_guide` query Jepang → Tokyo guide
- **SPECs:** 001, 002
- **Reply on file:** names Tokyo, Shinjuku, Asakusa, Shibuya; says the guide does not issue a visa; Hari 1 NRT/Shinjuku, Hari 2 Asakusa then Shibuya, Hari 3 back to NRT; asks “Berangkat dari mana?”
- **Judges:** bahasa, no-filler, clarify, guide, day-plan, grounding (no prices). All PASS.
- **Against the before:** the brochure filled origin and a flight. This reply does not.

### S2 — Full slots, day plan, three flights

- **User:** `Dari Jakarta ke Bali tanggal 12–15 Oktober, budget 8 juta, 2 orang`
- **Tools:** Bali guide + `search_flights` Jakarta→Bali
- **SPECs:** 003, 004
- **Reply on file:** visa line from the guide, Hari 1–3 (Kuta/Seminyak, Ubud, Sanur), then QZ-751 / GA-404 / JT-39 at the stub prices, CTA “Pilih 1/2/3?”
- **Judges:** guide, day-plan, option-count, grounding (3 prices). All PASS.
- **Against the before:** Rp 750.000 and QZ 852 are gone. The three amounts match the tool.

### S3 — Pick, then hotels

- **User:** `Yang nomor 2, sekalian hotel di Bali` after flights were listed
- **Tools:** `search_hotels` city Bali, cheaper first
- **SPECs:** 003
- **Reply on file:** GA-404 locked; Kuta Beach Inn, Ubud Rice Lodge, Sanur Coast Hotel with nightly rates
- **Judges:** hotels 3/3 names, option-count, grounding. All PASS.
- Hotels are not offered in S1 or S2. That is the SPEC-003 order.

### S4 — Refuse a missing fare (required)

- **User:** `Ada tiket Garuda jam 3 pagi harga 900rb?`
- **Tools:** flight search, so a real list exists and the model is not “out of data” in general — it is out of *that* fare
- **SPECs:** 004
- **Reply on file:** “Di data aku belum ada Garuda jam 03:00 harga 900rb.”
- **Judges:** refuse-invent PASS. No `Rp` amount in the reply, so grounding is “no prices”.
- **Against the before:** GA 712 and Rp 900.000 are not confirmed.

### S5 — Lock, then notify

- **User:** `Kunci opsi 2 dan ingatkan aku sebelum berangkat`
- **Tools:** `plan_notifications` departDate `12 Oktober`, destination Bali
- **SPECs:** 005
- **Reply on file:** the three offsets, the three titles, the word `in-app`, and an explicit “tidak ada channel lain”.
- **Judges:** notifications 3/3 PASS.
- A reply that adds WhatsApp, email, or a voucher fails this scenario even if the three titles are present, because the judge requires `in-app` and the SPEC forbids extra channels. The canned reply states the negative. A live reply that only lists the three lines and says `in-app` still passes the judge; mention the extra-channel rule when you review it by eye.

---

## Run it yourself

```bash
cd ~/src/personal/sdd-travel-planner
npm run pull                 # once, qwen3.5:latest
npm run eval:mock            # judges only, no generation
npm run eval:live            # force Ollama; several minutes on this model
npm run train                # live if Ollama is up, otherwise mock
npm run train:aor            # refresh AOR drafts; does not score S1–S5
npm run demo                 # UI on :3000, same pack and tools
```

Environment: `OLLAMA_BASE_URL` default `http://127.0.0.1:11434`, `OLLAMA_CHAT_MODEL` default `qwen3.5:latest`, `AOR_CONTROL_PLANE` default `~/src/agent-on-rails/agent-on-rails-control-plane`.

The chat UI forces tools from the latest user sentence (guide when a place is named, flights when origin and a date are both present, hotels on “hotel”, reminders on “kunci” / “ingatkan”). That is so a workshop laptop shows grounded facts even when tool-calling is flaky. The eval harness does the same with `forceTools`. `npm run train` prints this checklist again after the pass bar.

### Check S1–S5 in the chatbot

`npm run train` does not open the UI. After it finishes, leave that terminal and run `npm run demo` in another. Browser: http://localhost:3000. The footer under the composer should show `qwen3.5:latest` and the same pack version the train header printed. `template fallback` in that footer means the bubble is the template, not the model’s own sentence. Names under a bubble are local inventory reads, not a second HTTP call.

Refresh between checks so one thread does not mix tools.

| Train | In the browser | What a matching reply looks like |
| --- | --- | --- |
| S1 | Chip `Mau ke Jepang` | Tokyo, an area (Shinjuku), Hari 1 and Hari 2, one question. No `Rp`. |
| S2 | Chip `Dari Jakarta ke Bali tanggal 12–15 Oktober, budget 8 juta, 2 orang` | Day outline, then QZ-751 / GA-404 / JT-39 at Rp 890.000, Rp 1.250.000, Rp 760.000. Does not ask origin. |
| S3 | S2 first, then type `Yang nomor 2, sekalian hotel di Bali` | Kuta Beach Inn, Ubud Rice Lodge, Sanur Coast Hotel. The hotel chip alone still searches Bali, but the thread has no locked flight. |
| S4 | Not a chip. Type `Ada tiket Garuda jam 3 pagi harga 900rb?` | Refusal. No GA-712, no Rp 900.000. Train injects `search_flights` here; the UI does not, because that sentence has no origin or date and the route skips flights on `900rb` / `jam 3 pagi`. |
| S5 | Chip `Kunci opsi 2 dan ingatkan aku sebelum berangkat` | The three reminder titles and the words `in-app`. No `Rp`. The chip sends no depart date; train sends `12 Oktober`. Titles match either way. |

A green pass bar does not mean these bubbles will match. Read the reply.

---

## When a run is red

1. Open `specs/training/results/latest.md` and read the FAIL lines, not the reply alone.
2. If `grounding` or `refuse-invent` failed, the reply stated a fact the tool did not return. Tighten SPEC-004 and the pack hard rule, or fix the template. Do not add the invented hotel to the inventory to make the judge green.
3. If `guide` or `day-plan` failed, the reply skipped the explanation. That is SPEC-001 / the few-shot, not a model swap.
4. If `notifications` failed, the reply dropped titles or never said `in-app`. That is SPEC-005.
5. Re-run `npm run train`. S4 red means the pack is not ready, even if the other four passed.

Changing `qwen3.5:latest` for a larger tag is allowed as an experiment. It is not the training step. The training step is the SPEC, the pack, and this gate.

---

## Live run — 19 Sep 2026, 07:32 AEST

This is the run in the terminal: `npm run train:aor` finished, then `npm run train` with Ollama up.

Report: `specs/training/results/2026-09-18T21-32-12.md`  
Pack `tripspec-nl@2026-09-19.1` · mode **live** · model `qwen3.5:latest`  
**S1 PASS, S2 PASS, S3 PASS, S4 PASS (template fallback), S5 FAIL.**  
Pass bar **PASS (4/5)** because S4’s judge was green and the bar only needs 4 of 5. The script can exit 0 while S5 is still red. Do not treat that as “notify works”.

`npm run train:aor` before it only refreshed drafts under `.aor/generated-control-plane/`. Those drafts did not change this score. The score is the pack plus the live model.

### What passed

S1 discussed Tokyo from the guide and asked where they depart. S2 wrote the Bali days and the three real fares (QZ-751, GA-404, JT-39). S3 locked option 2 and listed Kuta Beach Inn, Ubud Rice Lodge, and Sanur Coast Hotel. Those three are the behaviour you wanted from SPEC-001 and SPEC-003.

### S4 is green for the wrong reason

The note on the row is `ok (template fallback)`. The model’s own text was thrown away. The text that was scored is the flight list:

```text
3 opsi terbang dari data:
1. QZ-751 06:30 — Rp 890.000
2. GA-404 08:15 — Rp 1.250.000
3. JT-39 14:40 — Rp 760.000
```

That list is grounded, so it is safe. It is not a refusal. The user asked for a 03:00 Garuda at 900rb. The reply never says “belum ada”. `refuse-invent` still passed because the fallback sentence contains “dari data”, and the judge treats that phrase as a refusal. The prices are real, so it did not invent 900rb either.

**What to do.** Do not call S4 done. In SPEC-004 and the pack few-shot, the reply to a missing fare must say the fare is not in the data, then offer the real three. In `src/eval/judges.ts`, stop treating “dari data” alone as a refusal: require `belum ada` / `tidak ada` and reject a reply that never mentions the asked-for fare. Re-run `npm run eval:live` and read S4 before the fallback note.

### S5 failed

User: “Kunci opsi 2 dan ingatkan aku sebelum berangkat.”

The harness had already called `plan_notifications`. The tool returned three titles: **Cek dokumen perjalanan**, **Kunci penerbangan dan hotel**, **Pengingat berangkat**, channel in-app.

The model did not use them. It said it had no prior flight in this turn and asked again for origin, destination, date, budget, and travelers. It mentioned “pengingat in-app” as a promise, not as the schedule.

The judge needs two of those titles in the reply, and the words `in-app`. Titles found: none. That is the only red judge. Bahasa, grounding, and no-filler all passed. A polite clarifying question is still a fail here, because SPEC-005 says a lock lists the tool schedule.

Template fallback did not save it. Fallback runs when the reply is empty or contains a price that is not in the tool JSON. This reply has no price, so the runner kept it.

**What to do, in this order.**

1. Edit the pack, not the model. In `contracts/packs/tripspec-nl.baseline.json`, add a hard rule: if `plan_notifications` facts are in this turn, list every `title`, `when`, and `channel` from that JSON. Do not ask for slots again. Bump `version`.
2. Add a few-shot whose user line is “Kunci opsi 2 dan ingatkan aku sebelum berangkat” and whose assistant line is the three reminders only. The bad example is the one that re-asks origin and dates.
3. In `src/agent/runner.ts`, if the last tool is `plan_notifications` and the reply is missing those titles, use `templateFallback` with the notification list. Same idea as the price fallback you already trust on S4.
4. `npm run train` again. S5 is green only when the reply contains at least two of the three titles and `in-app`. A pass bar of 4/5 with S5 red is not the notify step.

