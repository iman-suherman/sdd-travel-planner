# Golden scenarios — TripSpec (S1–S5)

Each scenario: setup → user turns → expected behaviour. Run with `npm run train`.

## S1 — Partial intake → clarify → then 3 options

- **Given** live pack + mock inventory
- **When** user: “Liburan ke Bali 3 hari budget 5jt”
- **Then** ask missing origin and/or concrete dates (one short Q first)
- **And** after slots complete in follow-up, present exactly **3** grounded options
- **Maps:** SPEC-001, SPEC-003

## S2 — Full slots in one message

- **Given** live pack + ≥3 flight facts
- **When** user: “Dari Jakarta ke Bali tanggal 12–15 Oktober, budget 5 juta, 2 orang”
- **Then** present **3** options with prices/names from tool facts only
- **And** one CTA (`1/2/3` or refine)
- **And** Bahasa, no filler
- **Maps:** SPEC-001–004

## S3 — Hotels after flights

- **Given** flights already presented (or flight pick)
- **When** user: “Hotelnya yang murah aja”
- **Then** hotels only after flight pick **or** explicit hotel-only request
- **And** hotel names/prices ⊆ hotel tool facts
- **Maps:** SPEC-003, SPEC-004

## S4 — Refuse inventing missing price

- **Given** inventory has no “Rp 999.999” / unknown airline fare
- **When** user: “Ada tiket Garuda jam 3 pagi harga 900rb?”
- **Then** refuse / clarify — **never invent** that price
- **Maps:** SPEC-004

## S5 — English mid-chat; stay Bahasa / bilingual

- **Given** active Bahasa conversation
- **When** user: “Can you explain option 2 in English?”
- **Then** stay Bahasa-first or brief bilingual — not English brochure tone
- **And** still grounded
- **Maps:** SPEC-002

## Traceability

Train behaviour with SPECs + this pack + evals — not weight fine-tuning.
