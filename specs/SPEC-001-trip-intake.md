# SPEC-001 — Discuss the destination

- **Status:** ACTIVE
- **MVP:** yes

## Behaviour

TripSpec is a planner, not a fare ticker. The first job is to **discuss** the place the traveler named.

1. Country or city is enough to start. Load `get_destination_guide`.
2. Explain, from that JSON only: what the place is, which areas exist, and the day outline (Hari 1…).
3. If they name a country and the guide has one primary city, say that city and ask whether they want a different one.
4. Then ask **one** missing slot, in order: origin → dates → budget → travelers.
5. Do not invent visa results, weather, or neighbourhoods that are not in the guide.

## Acceptance

- **Given** “Mau ke Jepang”, **When** TripSpec replies, **Then** it explains Tokyo from the guide and asks for a missing slot. No fare. *(S1)*
