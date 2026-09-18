# SPEC-001 — Trip intake

- **Status:** ACTIVE
- **Owner:** TripSpec demo
- **Related:** SPEC-002, SPEC-003, SPEC-004, `specs/training/`
- **MVP:** yes

## 1. Behaviour

SPEC-001 owns **slot collection** before TripSpec proposes itineraries.

**Slots (required):**

| Slot | Examples |
|------|----------|
| `origin` | Jakarta, CGK, Surabaya |
| `destination` | Bali, Denpasar, Singapore |
| `dates` | 3 hari, 12–15 Okt, weekend depan |
| `budget` | 5jt, Rp 5.000.000 |
| `travelers` (pax) | 1 orang, 2 pax, keluarga 4 |

Observable outcomes:

1. **Missing slot** → ask **one** short clarifying question for the highest-priority missing slot. Do not ask for everything at once.
2. **No invent** → never fill origin/destination/dates/budget/pax from guesses or “typical” trips.
3. **Partial message OK** → extract what is present; only ask for what is missing.
4. **Priority order** when several missing: origin → destination → dates → budget → travelers.

## 2. Inputs / outputs

**Input:** traveler message (+ prior slot state).  
**Output:** updated slots and either a clarifying question or hand-off to SPEC-003 propose.

## 3. Invariants

1. Do not invent cities, dates, budgets, or traveler counts.
2. One clarifying question per turn when slots incomplete.
3. City names may stay English; questions stay Bahasa Indonesia (SPEC-002).

## 4. Acceptance criteria

- **Given** “Liburan ke Bali 3 hari budget 5jt”, **When** origin/dates incomplete, **Then** ask one short Q (e.g. berangkat dari mana / tanggal berapa) — do not invent Jakarta or invent dates. *(S1)*
- **Given** all five slots in one message, **When** TripSpec replies, **Then** skip intake Qs and proceed to propose (SPEC-003). *(S2)*

## 5. Non-goals

- Real booking, policy plafon, multi-city legs, visa.
