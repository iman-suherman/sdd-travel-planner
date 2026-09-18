# TripSpec SPECs

Travel planner behaviour. Train with SPECs + pack + evals, not fine-tuning.

| SPEC | Owns |
|------|------|
| [SPEC-001](./SPEC-001-trip-intake.md) | Discuss country/city from the guide, then one missing slot |
| [SPEC-002](./SPEC-002-chatbot-voice.md) | Bahasa, detailed enough, no brochure |
| [SPEC-003](./SPEC-003-itinerary-propose.md) | Day plan + 3 grounded options |
| [SPEC-004](./SPEC-004-grounding-invariants.md) | Never invent facts |
| [SPEC-005](./SPEC-005-notify-plan.md) | In-app reminder schedule after lock |

Training: [`training/`](./training/)  
Pack: [`../contracts/packs/tripspec-nl.baseline.json`](../contracts/packs/tripspec-nl.baseline.json)
