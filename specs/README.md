# TripSpec SPECs

Behaviour source of truth for the TripSpec teaching demo. Same contract as Maya’s SPEC-017 / `specs/training/`:

1. Write **SPEC** (must / must-not / acceptance).
2. Derive **system prompt + tool policy + few-shots** from the SPEC (capability pack).
3. Run **golden scenarios** against Ollama.
4. **Fail → tighten SPEC/pack → re-run** until evals PASS.
5. Do **not** use LoRA as the behaviour lever for this demo.

| SPEC | Owns |
|------|------|
| [SPEC-001](./SPEC-001-trip-intake.md) | Trip intake slots |
| [SPEC-002](./SPEC-002-chatbot-voice.md) | Voice (Maya SPEC-017 lite) |
| [SPEC-003](./SPEC-003-itinerary-propose.md) | Propose exactly 3 options |
| [SPEC-004](./SPEC-004-grounding-invariants.md) | Never invent facts |

Training pack: [`training/`](./training/)  
Machine pack: [`../contracts/packs/tripspec-nl.baseline.json`](../contracts/packs/tripspec-nl.baseline.json)
