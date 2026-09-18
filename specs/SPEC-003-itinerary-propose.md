# SPEC-003 — Itinerary propose

- **Status:** ACTIVE
- **Owner:** TripSpec demo
- **Related:** SPEC-001, SPEC-002, SPEC-004
- **MVP:** yes

## 1. Behaviour

SPEC-003 owns **presenting options** after intake slots are ready.

Observable outcomes:

1. **Exactly 3 options** when tool facts have ≥3 offers; if fewer, show all available.
2. Options come **only** from tool / mock inventory facts (SPEC-004).
3. **CTA** — end with one short prompt: `1/2/3` or refine (lebih murah / ganti tanggal).
4. **Hotels after flights** — do not dump hotels until flight is picked, skipped, or user explicitly asks hotel-only / “hotelnya yang murah”. *(S3)*
5. List airline, flightNo, time, price (or hotel name + nightly rate) from facts — no long preamble.

## 2. Tools

- `search_flights` — mock Jakarta↔Bali (and small set) inventory
- `search_hotels` — mock hotels near destination

## 3. Acceptance criteria

- **Given** complete slots and ≥3 flight facts, **When** propose runs, **Then** exactly 3 numbered options + one CTA. *(S2)*
- **Given** user says “Hotelnya yang murah aja” after flights listed, **When** TripSpec continues, **Then** hotels only (or after flight pick). *(S3)*

## 4. Non-goals

- Real Anamaya OMS booking, payment, ticket PDF, policy plafon maximization (Maya-only).
