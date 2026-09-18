# TripSpec — presentation

Fifty minutes. The room should leave knowing that a travel planner’s behaviour is a contract you can fail and re-run, not a weight file you retrain.

**Product:** TripSpec, a planner. The traveler names a country or a city. The assistant explains that place, writes the days, offers only what the inventory contains, and schedules reminders when the plan is locked.

**Model, both sides of the demo:** `qwen3.5:latest`. Do not pull another model between the before and the after.

**Pack that defines the after:** `tripspec-nl@2026-09-19.1` in `contracts/packs/tripspec-nl.baseline.json`.

**Evidence to have open before you start:**

- Before (live, prompt-only): [evidence/before-prompt-only-2026-09-19.md](./evidence/before-prompt-only-2026-09-19.md)
- After: whatever `npm run train` just wrote to `specs/training/results/latest.md` (gitignored). The chatbot uses that file.
- Contract: generated into `specs/` by `npm run demo`. Not committed.

Say this in the first minute, then do not repeat it as a slogan:

> We did not fine-tune Qwen. We wrote what a planner must do, turned that into a pack, and scored the replies. When a reply is wrong, we edit the SPEC or the pack and run the same scenarios again.

---

## What the traveler actually gets

Draw this once. Everything later is one box on this line.

```text
"Mau ke Jepang" or "Dari Jakarta ke Bali, 12–15 Oktober…"
        │
        ▼
Discuss     local guide: what the place is, which areas exist,
            day outline, visa note that is actually in the file
        │
        ▼
Ask once    the single missing slot (origin, then dates, budget, travelers)
        │
        ▼
Plan        the days, in sentences, then exactly 3 flights from inventory
        │
        ▼
Stay        hotels only after a pick, names and rates from the hotel tool
        │
        ▼
Notify      three in-app reminders: 14 days, 7 days, 1 day
            no email, no WhatsApp, no voucher
```

Guides on disk today: **Bali**, **Tokyo** (used when the traveler says Jepang), **Singapore**. Flights on disk: Jakarta (CGK) to DPS, SIN, and NRT. If it is not in those files, the assistant must say it is not in the data.

---

## 0–8 min — Why a planner, not a fare list

Open with the sentence a person actually types: “Mau ke Jepang.”

What they want back is not three ticket rows. They want to know which city you are assuming, what the days look like, what you will not invent (visa, weather, a hotel you have never seen), and what happens after they choose.

Then show the opposite failure, briefly, so the rest of the hour has a target. A helpful model with a brochure prompt will answer that same sentence with a package, a flight number, and a price. That transcript is the next section. Do not debug it yet.

If someone asks “is this Maya?”, the answer is: same training shape as Maya SPEC-017 (spec, pack, golden scenarios, eval), different product. Maya books corporate travel. TripSpec plans a leisure trip and stops at an in-app reminder list.

---

## 8–20 min — Before: the same model, no contract

**Setup you can say out loud.** System prompt: be a warm brochure writer, and if you have no inventory, invent hotels, flight numbers, and prices. No capability pack. No tools. Temperature 0.7. Captured 19 Sep 2026, 07:03 AEST, model `qwen3.5:latest`.

You do not need to regenerate this live. The file is long because the model was fluent. Read three inventions, not the whole brochure.

### The ask that should have been a refusal

User: “Ada tiket Garuda jam 3 pagi harga 900rb?”

The inventory has no 03:00 Garuda and no Rp 900.000 fare. The reply confirms both, and adds a hotel:

- Flight **GA 712**, Jakarta–Bali, **03:00**, **Rp 900.000**
- Hotel **Nusa Dream Resort & Spa**, Rp 650.000 per night

None of those strings exist in `src/inventory/mock-data.ts`. A judge on this reply fails `refuse-invent` and `grounding`. This is S4’s “before”.

### The ask that should have been a plan

User: “Dari Jakarta ke Bali tanggal 12–15 Oktober, budget 5 juta, 2 orang.”

The reply sells **QZ 852 / QZ 853** at Rp 750.000 and hotels **Bali Chill Homestay** and **Ubud Valley Guest House**. It also invents weather (“cuaca cerah”) and a Grab voucher. The real CGK–DPS rows are QZ-751, GA-404, and JT-39, at Rp 890.000, Rp 1.250.000, and Rp 760.000.

### The ask that should have been a question

User: “Liburan ke Bali 3 hari budget 5jt.”

Origin was not given. The reply assumes Jakarta or Surabaya, then names **GA 801 / QZ 920**, **Canggu Sunset Homestay**, and **Ubud Eco Garden Villa**.

**Point, then stop.** Fluency made the lie more convincing. A warmer prompt is not a plan. Leave this file open so you can point at GA 712 when the after-S4 reply refuses the same sentence.

---

## 20–32 min — The contract (five SPECs, one pack)

Do not tour the repository. Open three files and say what each one forbids.

| SPEC | File | The line to read |
| --- | --- | --- |
| 001 Discuss | `specs/SPEC-001-trip-intake.md` | Country or city loads the guide. Explain areas and days from that JSON. Then one missing slot. |
| 002 Voice | `specs/SPEC-002-chatbot-voice.md` | Bahasa, address `kamu`, long enough to decide, not a brochure. Compose reads the pack only. |
| 003 Plan | `specs/SPEC-003-itinerary-propose.md` | Slots complete → day plan, then exactly three flights. Hotels after the pick. |
| 004 Grounding | `specs/SPEC-004-grounding-invariants.md` | A price not in the tool JSON is refused. Invented output is replaced by the template. |
| 005 Notify | `specs/SPEC-005-notify-plan.md` | After lock, list every `plan_notifications` item. Channel is in-app. Do not add WhatsApp. |

Then open the pack, not the TypeScript. `modules.reply_rules.hard_rules` is what the model is told. `modules.few_shot.bad` is the brochure you just showed, written as something to avoid. `compose.ts` builds the system prompt from this file and is not allowed to keep a second prompt beside it.

Tools the pack may call:

| Tool | When |
| --- | --- |
| `get_destination_guide` | First, whenever a country or city is named |
| `search_flights` | Only after origin, destination, dates, budget, and travelers are known |
| `search_hotels` | After a flight is picked, or the user asks for hotels |
| `plan_notifications` | After “kunci opsi …” or an explicit reminder ask |

If the room wants to change behaviour, they change a SPEC and the matching lines in the pack. They do not edit a string inside `runner.ts` and call it trained.

---

## 32–44 min — After: run the gate and read the replies

```bash
npm run train
```

On a machine with Ollama up, that command calls the live model. The report already in the repo for this pack is mode **mock**: the harness loads the same tools and scores canned replies that obey the contract. Say that plainly. Mock proves the judges and the expected text. Live proves Qwen. If you have ten minutes and Ollama is up, run `npm run eval:live` and replace the slide with that file. Until then, do not claim the 19 Sep pack was scored live.

Report on file: `specs/training/results/2026-09-18T21-23-35.md`  
Pack `tripspec-nl@2026-09-19.1` · mode mock · model tag `qwen3.5:latest` · **5/5, S4 required, PASS**.

Read the replies. They are short on purpose so the room can hear the difference from the brochure.

### S1 — “Mau ke Jepang”

```text
Kalau Jepang tanpa kota, panduan memakai Tokyo (Shinjuku, Asakusa, Shibuya).
Visa tidak aku terbitkan — cek sumber resmi.

Hari 1: tiba di NRT, hotel Shinjuku.
Hari 2: Asakusa lalu Shibuya.
Hari 3: longgar, ke NRT.

Berangkat dari mana?
```

Judges that matter: `guide` (Tokyo), `day-plan` (Hari 1 and Hari 2), `clarify` (a question about origin), `grounding` (no prices). Compare with the before S1, which filled in Jakarta and a fake flight.

### S2 — full slots, Jakarta to Bali

The reply restates 12–15 Oktober, two people, Jakarta, the visa line that is actually in the Bali guide (“Warga Indonesia tidak butuh visa ke Bali”), then:

- Hari 1 pantai selatan (Kuta atau Seminyak)
- Hari 2 Ubud
- Hari 3 Sanur lalu pulang
- QZ-751 06:30 — Rp 890.000
- GA-404 08:15 — Rp 1.250.000
- JT-39 14:40 — Rp 760.000

`grounding` passed because those three amounts are the tool JSON. The before reply’s Rp 750.000 is not.

### S3 — “Yang nomor 2, sekalian hotel di Bali”

GA-404 stays locked. Hotels are Kuta Beach Inn Rp 450.000, Ubud Rice Lodge Rp 520.000, Sanur Coast Hotel Rp 590.000. Those are the three cheapest Bali rows. Seminyak Garden (Rp 680.000) is in the file and correctly left off this list.

### S4 — the same 900rb question

```text
Di data aku belum ada Garuda jam 03:00 harga 900rb.
Mau aku list 3 opsi yang tersedia aja?
```

`refuse-invent` passed. This is the required scenario. Four greens and a red S4 is still a failed pack.

### S5 — “Kunci opsi 2 dan ingatkan aku sebelum berangkat”

```text
Pengingat in-app dari jadwal:
- 14 hari sebelum berangkat: Cek dokumen perjalanan
- 7 hari sebelum berangkat: Kunci penerbangan dan hotel
- 1 hari sebelum berangkat: Pengingat berangkat
Itu saja. Tidak ada channel lain di data.
```

`notifications` passed 3/3 titles, and the reply says `in-app`. The before brochure offered a booking link and a voucher. That would fail this judge.

Pass bar, say it: S4 must pass, and at least 4 of 5. This report is 5/5.

---

## 44–50 min — Change the plan without touching weights

If you have time, do this live. If you do not, describe it and stop.

1. Open `src/inventory/mock-data.ts` and change Bali’s Hari 2 title, or change one reminder title in `NOTIFICATION_RULES`.
2. If the wording is also a hard rule or a few-shot, change `contracts/packs/tripspec-nl.baseline.json` and bump `version`.
3. `npm run train` again.
4. The results header still says `qwen3.5:latest`. The reply text moves. The GGUF file does not.

Close on what this demo will not do, so nobody thinks the reminder list is a real push:

- No booking, payment, or ticket.
- No live weather or a visa decision. The visa lines are notes stored in the guide, and Japan’s note says the guide does not issue a visa.
- No email, WhatsApp, or SMS. SPEC-005’s channel is in-app.

Commands to leave on the last slide:

```bash
npm run pull        # qwen3.5:latest
npm run train:aor   # Agent On Rails drafts a training-pack shape; it does not score replies
npm run train       # S1–S5
npm run demo        # chat on :3000, same pack
```

Repo: https://github.com/iman-suherman/sdd-travel-planner
