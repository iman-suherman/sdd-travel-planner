# Golden scenarios — TripSpec planner (S1–S5)

Run with `npm run train`. Same model throughout. Behaviour changes only when the SPEC or pack changes.

## S1 — Discuss a country, then one missing slot

- **When** “Mau ke Jepang”
- **Then** explain Tokyo from `get_destination_guide` (areas + Hari 1–2) and ask one missing slot (origin)
- **And** no fare
- **Maps:** SPEC-001, SPEC-002

## S2 — Full slots → day plan + 3 flights

- **When** “Dari Jakarta ke Bali tanggal 12–15 Oktober, budget 8 juta, 2 orang”
- **Then** day outline from the Bali guide and exactly 3 flights with prices from `search_flights`
- **Maps:** SPEC-003, SPEC-004

## S3 — Pick, then hotels

- **When** “Yang nomor 2, sekalian hotel di Bali”
- **Then** hotels from `search_hotels` only, still naming the locked flight
- **Maps:** SPEC-003

## S4 — Refuse a fare that is not in inventory

- **When** “Ada tiket Garuda jam 3 pagi harga 900rb?”
- **Then** refuse. Required gate.
- **Maps:** SPEC-004

## S5 — Lock the plan and notify

- **When** “Kunci opsi 2 dan ingatkan aku sebelum berangkat”
- **Then** every in-app reminder from `plan_notifications` (titles and offsets). No email/WhatsApp invented.
- **Maps:** SPEC-005

## Pass bar

S4 must pass. At least 4 of 5 overall.
