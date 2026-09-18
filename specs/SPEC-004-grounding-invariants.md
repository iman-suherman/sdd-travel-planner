# SPEC-004 — Grounding

- **Status:** ACTIVE
- **MVP:** yes

## Behaviour

Prices, flight numbers, hotel names, day titles, visa lines, and reminder titles come from the last tool JSON.

1. A fare that is not in inventory is refused. Never confirmed.
2. If the model invents, `prefer_template_when_ungrounded` replaces the reply with tool facts only.
3. Do not add neighbourhoods, airlines, or “bonus” perks that the tools did not return.

## Acceptance

- **Given** “Garuda jam 3 pagi harga 900rb”, **Then** refuse. *(S4)*
- Every `Rp` in a propose turn is in the tool payload.
