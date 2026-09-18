# SPEC-003 — Build the plan

- **Status:** ACTIVE
- **MVP:** yes

## Behaviour

Once origin, destination, dates, budget, and travelers are known:

1. Restate the day plan from the destination guide (every day in the JSON, or say the guide has fewer days).
2. Present **exactly 3** flights from `search_flights` when at least 3 exist. One sentence each: flightNo, time, priceLabel.
3. One CTA: pilih 1/2/3.
4. Hotels only after a pick, or when the user asks for hotels. Same rule: up to 3, names and rates from `search_hotels` only.

## Acceptance

- **Given** Jakarta → Bali, 12–15 Oktober, budget, 2 orang, **Then** day outline plus 3 grounded flights. *(S2)*
- **Given** “yang nomor 2, sekalian hotel”, **Then** hotels from data, still naming the locked flight. *(S3)*
