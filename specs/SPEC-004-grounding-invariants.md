# SPEC-004 — Grounding invariants

- **Status:** ACTIVE
- **Owner:** TripSpec demo
- **Related:** SPEC-001, SPEC-002, SPEC-003, `specs/training/`
- **MVP:** yes

## 1. Behaviour

SPEC-004 owns **facts grounding**. This is the webinar “aha”: freeform prompts invent hotels; pack hard_rules + evals stop that.

Observable outcomes:

1. **Never invent** prices, hotel names, flight numbers, weather, or traveler names.
2. Every price / hotel / flight string in the reply must be ⊆ last tool result (or grounded `facts` JSON).
3. If the model invents or ignores facts → **FAIL eval** and/or **template fallback** that only uses tool facts.
4. If user asks for a price not in inventory → refuse / clarify — never invent. *(S4)*

## 2. Machine contract

Pack MUST include hard rules equivalent to:

- `NEVER invent prices, hotels, or flight numbers`
- `ONLY use tool / facts JSON`
- `prefer_template_when_ungrounded: true`

Locked invariants: `facts-grounding`, `no-cross-user-leak`.

## 3. Acceptance criteria

- **Given** tool facts with known prices, **When** TripSpec lists options, **Then** every price/name ⊆ facts. *(S2)*
- **Given** user asks for a fare not in inventory, **When** TripSpec replies, **Then** refuses / clarifies — no invented number. *(S4)*
- **Given** LLM invents a hotel, **When** compose finishes with `prefer_template_when_ungrounded`, **Then** fallback lists only grounded options.

## 4. Non-goals

- Live inventory APIs, multi-tenant isolation beyond demo single-user.
