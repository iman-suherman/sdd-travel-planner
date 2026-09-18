# TripSpec — presentation

Fifty minutes. The room should leave knowing the holiday plan is a contract you can fail and re-run. Ollama’s weights do not move. What persists is the generated specs and the train report. The chatbot serves from that report.

**Product:** TripSpec, a holiday planner. The traveler names a country or a city. The assistant writes the itinerary from the local guide, offers three flights with no prices, and schedules in-app reminders when a flight is locked.

**Model:** `qwen3.5:latest` at `http://127.0.0.1:11434`. Same GGUF before and after. Do not pull another model during the hour.

**Pack the gate scores:** `tripspec-nl@2026-09-19.4` in `contracts/packs/tripspec-nl.baseline.json`. AOR writes this from `contracts/vibe.md`. It is not in git. It is not a spec.

**Not in git, written on the demo machine:**

| What persists | Command that writes it | Who reads it |
| --- | --- | --- |
| `vendor/aor/` | `npm run strap` | Later steps. Not the chatbot. |
| `specs/requirements/` and `specs/product/` (and the rest of the generated tree) | `npm run specs`, also the start of `npm run demo` | The room, so they can open the spec. The chatbot does not read these files. |
| `specs/tools/` | The same commands, from `modules.tools.catalog` | The room. A tool chip in the chat opens that file. The model does not read it. |
| `specs/training/results/<timestamp>.md` and `latest.md` | `npm run train` | The chatbot. Every chat turn appends this report to the system prompt sent to Ollama. |

Start the hour with `npm run help`. Green `done` means that step’s folder or model is already on this machine. Yellow `not yet` means it is not. The box at the bottom is the only command to run next. Do not skip it. A pin file without `specs/requirements` and `specs/product` is not a finished spec.

Say this once, then show the folders:

> We did not fine-tune Qwen. We generate the spec, score five replies, and save the report. The chatbot Ollama serves is that saved report plus the pack. When a reply is wrong, we edit the pack and run the same scenarios again.

---

## Demo plan

Six commands, in this order. `npm run help` prints the status beside each one.

```text
1  npm run pull        qwen3.5:latest on the local Ollama
2  npm run strap       copy Agent On Rails into vendor/aor
3  npm run contracts   contracts/vibe.md → pack and capability schema
4  npm run specs       generate specs/ from that contract  (gitignored)
5  npm run train       pack + S1–S5 → specs/training/results/latest.md
6  npm run demo        regenerate specs, then chat on :3000
```

What each step is waiting on, and what “done” means:

1. **Pull.** Ollama answers `GET /api/tags` and the tag `qwen3.5:latest` is in the list. If Ollama is down, this step is not yet even if the GGUF is on disk from last week.
2. **Strap.** `vendor/aor` is on this machine. It is not in git. The control plane is no longer a path outside the repo.
3. **Contracts.** `contracts/vibe.md` is the entry. Copy that file as the vibe. AOR writes the pack and the capability schema. The chatbot does not read the vibe.
4. **Generate specs.** After the command, `specs/requirements/` and `specs/product/` exist and contain files. Old `SPEC-001` files left over from an earlier checkout do not count.
5. **Train.** `latest.md` exists and its pack version equals the pack on disk (`2026-09-19.4`). A report for `@2026-09-19.1` is an older, priced planner. It is not this demo. Re-run train.
6. **Demo.** The UI is `http://localhost:3000`. The first message the traveler sends is refused until step 5 has a matching report. The footer under the composer shows the model, the pack, and `specs/training/results/latest.md`.

`npm run train` does not load the previous report. That keeps the score independent. Only the chatbot loads it.

`npm run demo` runs spec generation again, then starts the UI. It does not run the five scenarios. If you only demo, and `latest.md` is missing or stale, the chat will say so.

---

## What the traveler gets

Draw this once. The outcome of the hour is the bottom of this line, not a fare.

```text
"Mau ke Jepang"  or  "Dari Jakarta ke Bali, 12–15 Oktober, 2 orang"
        │
        ▼
Guide       summary, areas, season note, visa note, Hari 1–3
            from get_destination_guide. Common information, not a brochure.
        │
        ▼
Ask once    one missing slot: origin, then dates, then travelers
            do not ask for a budget
        │
        ▼
Itinerary   those days, in sentences
        │
        ▼
Fly         exactly 3 options: airline, flight number, depart–arrive
            no Rp, no juta, no rb
        │
        ▼
Stay        only after a pick: hotel name and area, no nightly rate
        │
        ▼
Notify      three in-app reminders: 14 days, 7 days, 1 day
            no email, no WhatsApp, no voucher, no price on the lock line
```

Guides on disk: **Bali**, **Tokyo** (used when the traveler says Jepang), **Singapore**. Flights on disk: Jakarta (CGK) to DPS, SIN, and NRT. Prices exist in `src/inventory/mock-data.ts` so the file can stay stable. They are stripped before the model sees the tool JSON. If a flight is not in that list, the assistant says it is not in the data and still does not quote a fare.

---

## 0–8 min — Why an itinerary, not a fare list

Open with “Mau ke Jepang.”

What they want back is which city the guide assumes, what the days are, and what you will not invent. They do not want a package price.

A helpful model with a brochure prompt answers the same sentence with a flight number and a fare. That is the failure the rest of the hour is aimed at. You do not need a capture file. The inventions to remember, if you say them, are ones that are not in the inventory: GA 712 at 03:00, QZ 852, a hotel that is not Kuta Beach Inn / Ubud Rice Lodge / Sanur Coast Hotel. The real CGK–DPS rows are QZ-751, GA-404, and JT-39. This demo does not print their fares.

If someone asks “is this Maya?”, the answer is: same training shape as Maya SPEC-017 (spec, pack, golden scenarios, eval), different product. Maya books corporate travel. TripSpec plans a leisure itinerary and stops at an in-app reminder list.

---

## 8–18 min — Generate the specs, then open the folder

Run `npm run help`. If step 4 is `not yet`, run:

```bash
npm run specs
```

Say what the command is doing while it runs. It does not call the chat model to score replies. It reads `product/requirements.md`, runs the Agent On Rails chatbot-training orchestration (pin recorded in `.aor/aor-pin.json`), and publishes the draft into `specs/`. That tree is gitignored. The only tracked files under `specs/` are `.gitkeep` files.

When it finishes, open the folder. Do not claim success from the pin alone.

| Open this | What you say |
| --- | --- |
| `specs/product/` | Who the product is. Generated this run, not committed. |
| `specs/requirements/` | The requirement specs (`SD-…`). This is the persisted spec. |
| `specs/training/` | Scenarios and the eval checklist shape. Not the score. The score is the next command. |
| `contracts/vibe.md` | Paste-ready vibe. In git. `npm run contracts` reads this. |
| `contracts/packs/tripspec-nl.baseline.json` | What Ollama is told, and what `npm run train` scores. AOR writes it. Not in git. Version `2026-09-19.4`. |

Read three hard rules out loud, from `modules.reply_rules.hard_rules`:

- Never display a price. Not even if the traveler stated one.
- The itinerary comes from the guide: summary, areas, season, visa, then the days.
- Three flights, each airline + number + times. Stay names only after a pick. No rate.

Tools are the catalog in the pack, `modules.tools.catalog`. Regenerating specs writes one markdown per tool into `specs/tools/`. A chip under the chat reply opens that file in the editor. The model does not read the markdown. It sees the catalog description.

| Tool | When | What the model is allowed to see |
| --- | --- | --- |
| `get_destination_guide` | A country or city is named | Summary, areas, season, visa, days |
| `search_flights` | Origin, destination, and dates are known | Airline, flight number, times. No fare. |
| `search_hotels` | After a pick, or “hotel” | Name and area. No nightly rate. |
| `plan_notifications` | “Kunci” or “ingatkan” | In-app titles and offsets |

`src/agent/compose.ts` builds the system prompt from the pack, plus — only in the chatbot — the train report. It does not read `specs/requirements/`. The generated specs are what the room opens. Editing `specs/tools/` does not change the next reply. Change the catalog, regenerate, then re-run train.

---

## 18–36 min — Train, then read the persisted result

```bash
npm run train
```

Weights stay put. The script boxes each scenario. Yellow is the wait. Green is PASS. Red is FAIL.

Under the hood, for each of S1–S5:

1. Forced tools read the inventory locally. No HTTP.
2. `compose.ts` builds the system prompt from the pack and that JSON. The previous `latest.md` is not included.
3. `POST http://127.0.0.1:11434/v1/chat/completions`, model `qwen3.5:latest`, temperature 0.3, stream off. A quiet stretch is the token loop, not a hang, and not training.
4. Judges in `src/eval/judges.ts` score the text. No second model.
5. A price in the reply (`Rp`, `juta`, `rb`) fails `grounding`. The template that replaces an ungrounded reply also has no prices.

After S5 the same text is written twice:

- `specs/training/results/<utc-stamp>.md`
- `specs/training/results/latest.md`

Both are gitignored. `npm run help` reads the pack version inside `latest.md`. If it is not `2026-09-19.4`, step 3 stays `not yet`.

Pass bar, say it: S4 must pass, and at least 4 of 5. A green bar can still hide a red scenario. Read that scenario before you tell the room the planner is trained.

### Outcome you are aiming at

These are the replies the pack’s few-shot and the mock gate already accept. A live run should land on the same shape. If it does not, the report is the evidence, and the fix is the pack, then `npm run train` again.

**S1 — “Mau ke Jepang.”** Tokyo, Shinjuku (and the other areas), Hari 1 and Hari 2, visa note from the guide, one question: where they depart. No price.

**S2 — “Dari Jakarta ke Bali tanggal 12–15 Oktober, 2 orang.”** The Bali days (south coast, Ubud, Sanur), the visa line that is in the guide, then:

- QZ-751 AirAsia, times only
- GA-404 Garuda Indonesia, times only
- JT-39 Lion Air, times only

No `Rp`. Do not ask where they depart. Jakarta is already in the message.

**S3 — “Yang nomor 2, sekalian hotel di Bali.”** GA-404 stays the chosen flight. Stays are names and areas: Kuta Beach Inn, Ubud Rice Lodge, Sanur Coast Hotel. No nightly rate.

**S4 — “Ada tiket Garuda jam 3 pagi…?”** That flight is not in the data. The reply says so and does not quote a fare. S4 is required. A list of other flights is not, by itself, a refusal.

**S5 — “Kunci opsi 2 dan ingatkan aku sebelum berangkat.”** The lock line has no price. Then:

- 14 hari: Cek dokumen perjalanan
- 7 hari: Kunci penerbangan dan hotel
- 1 hari: Pengingat berangkat

The reply says `in-app`. No other channel.

---

## 36–46 min — The chatbot Ollama actually serves

Leave the train terminal. In another:

```bash
npm run demo
```

That regenerates `specs/` (step 2 again) and starts the UI. Open http://localhost:3000.

What the browser sends is `POST /api/chat`. What that route sends to Ollama is one system prompt built from two persisted things:

1. The pack `tripspec-nl@2026-09-19.4` (generated from `contracts/vibe.md`).
2. The body of `specs/training/results/latest.md`, cut before the chatbot checklist. The prompt tells the model to imitate PASS replies and not to repeat a FAIL pattern.

If `latest.md` is missing, the route returns an error and the bubble says to run `npm run train`. That is deliberate. An untrained chat is not part of the demo.

The footer should show `qwen3.5:latest`, the pack version, and `specs/training/results/latest.md`. `template fallback` means the bubble is the template, not the model’s own sentence. Tool names under a bubble are local inventory reads.

Exercise the outcome, in order, on a fresh page:

| Chip or sentence | You should see |
| --- | --- |
| Mau ke Jepang | Tokyo from the guide, Hari 1 and Hari 2, one question, no price |
| Dari Jakarta ke Bali tanggal 12–15 Oktober, 2 orang | Itinerary, then the three flights, times only |
| Yang nomor 2, sekalian hotel di Bali | Stay names and areas, no rate |
| Ada tiket Garuda jam 3 pagi harga 900rb? | Refusal, and still no price |
| Kunci opsi 2 dan ingatkan aku sebelum berangkat | Three in-app titles, no price |

A green train bar does not guarantee these bubbles. Read them. The report the model was told to imitate is the file in the footer.

---

## 46–50 min — Change the plan without touching weights

If you have time, do this live. If you do not, describe it and stop.

1. Change Bali’s Hari 2 title in `src/inventory/mock-data.ts`, or one reminder title.
2. If the wording is also a hard rule or a few-shot, change the pack and bump `version`.
3. `npm run train` again. `npm run help` stays on step 3 until the new `latest.md` names the new version.
4. Reload the chat. The footer’s report path is the same file. The text inside it moved. The GGUF did not.

Close on what this demo will not do:

- No fares and no budget figures, even when the traveler types one.
- No booking, payment, or ticket.
- No live weather and no visa decision. The visa lines are notes in the guide. Japan’s note says the guide does not issue a visa.
- No email, WhatsApp, or SMS. The channel is in-app.
- No new model file. Ollama serves `qwen3.5:latest` with the pack and the persisted train report.

Commands to leave on the last slide:

```bash
npm run help        # status beside each step, and the one command to run next
npm run pull        # qwen3.5:latest
npm run strap       # copy Agent On Rails into vendor/aor
npm run contracts   # contracts/vibe.md → pack and capability schema
npm run specs       # persist specs/requirements and specs/product
npm run train       # persist specs/training/results/latest.md
npm run demo        # chat on :3000, served from that report
```

Repo: https://github.com/iman-suherman/sdd-travel-planner
