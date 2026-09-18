# Requirements — TripSpec (chatbot training)

Product name: **TripSpec**

Spec-driven travel planner chatbot on local Ollama. Train conversational behaviour with SPECs, a capability pack, golden scenarios, and acceptance evals — **not** weight fine-tuning / LoRA. Same pattern as Maya Travel AI (SPEC-017), sized for a live workshop.

Source authority in this repo:

- `specs/SPEC-001-trip-intake.md` … `SPEC-004-grounding-invariants.md`
- `contracts/packs/tripspec-nl.baseline.json`
- `specs/training/` (this pack)

Agent On Rails guide shape: `guides/chatbot-training-orchestration.md` in **agent-on-rails-control-plane** (pin: see `specs/training/manifest.json`).

## Users

- **Traveler (demo)** — plans a short leisure trip in Bahasa Indonesia; expects short WhatsApp-straight replies and grounded options.
- **Workshop operator** — edits SPEC/pack, runs `npm run train`, shows FAIL→PASS without touching model weights.
- **Instructor** — demonstrates SDD: behaviour via SPEC + eval, not fine-tuning.

## Must-have (v1)

1. WhatsApp-straight voice: short, no fluff, Indonesian first (city/airline names may stay English); address `kamu`.
2. Trip intake slots: origin, destination, dates, budget, travelers — missing slot → one short clarifying Q; never invent slots.
3. After slots complete: exactly **3** itinerary options when ≥3 grounded offers exist (else all available), then one CTA (`1/2/3` or refine).
4. Hotels only after flight settled **or** explicit hotel-only / “hotelnya yang murah”.
5. Facts grounding: never invent prices, flight numbers, or hotel names; claims from tool / facts JSON only; template fallback when ungrounded.
6. Refuse requests to invent missing inventory (safety gate).
7. **Training / eval pack** from these requirements:
   - Golden scenarios S1–S5 mapped to SPEC-001…004
   - Eval checklist + deterministic judges before promoting pack
   - Capability pack is the only system-prompt source (`compose.ts`)

## Non-goals (v1)

- Fine-tuning / LoRA as the behaviour lever
- Real Anamaya OMS booking, policy plafon, WhatsApp adapter, payment, ticket PDF
- Multi-tenant packs / Teach Maya publish store
- Voice / phone channel

## Success metrics

- ≥ 4 of 5 golden scenarios pass (`npm run train`)
- **S4** (refuse invent) must always pass
- Zero invented prices/hotels in propose turns (grounding judge)
- Behaviour change via SPEC/pack edit + re-train only

## Constraints

- Docs-first: SPECs + baseline pack are authority; runtime implements them
- OpenAI-compatible chat API → local Ollama (`qwen3.5:latest` default)
- Secrets never in the control plane; use env
- Human approves SPEC/pack changes before workshop “green” claim
- AOR orchestration produces/validates training-pack shape; TripSpec `npm run train` scores live/mock behaviour
