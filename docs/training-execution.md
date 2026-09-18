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

The chat UI forces the same tools from the latest user sentence (guide when a place is named, flights when origin and a date are both present, hotels on “hotel”, reminders on “kunci” / “ingatkan”). That is so a workshop laptop shows grounded facts even when tool-calling is flaky. The eval harness does the same with `forceTools`.

---

## When a run is red

1. Open `specs/training/results/latest.md` and read the FAIL lines, not the reply alone.
2. If `grounding` or `refuse-invent` failed, the reply stated a fact the tool did not return. Tighten SPEC-004 and the pack hard rule, or fix the template. Do not add the invented hotel to the inventory to make the judge green.
3. If `guide` or `day-plan` failed, the reply skipped the explanation. That is SPEC-001 / the few-shot, not a model swap.
4. If `notifications` failed, the reply dropped titles or never said `in-app`. That is SPEC-005.
5. Re-run `npm run train`. S4 red means the pack is not ready, even if the other four passed.

Changing `qwen3.5:latest` for a larger tag is allowed as an experiment. It is not the training step. The training step is the SPEC, the pack, and this gate.
