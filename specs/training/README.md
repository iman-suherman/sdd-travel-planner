# Training pack — TripSpec

Maya-shaped loop for the workshop, governed by Agent On Rails
[`chatbot-training-orchestration`](https://github.com/agent-on-rails/agent-on-rails-control-plane/blob/main/guides/chatbot-training-orchestration.md):

```bash
npm run train:aor      # Layer A — AOR drafts → .aor/
npm run train          # Layer B — S1–S5 behaviour vs Ollama/mock
npm run train:all      # both
npm run eval:mock      # no Ollama
npm run eval:live      # force Ollama
```

Full explanation: [`HOWTO-TRAINING.md`](./HOWTO-TRAINING.md)

| File | Role |
|------|------|
| [scenarios.md](./scenarios.md) | S1–S5 golden dialogues |
| [eval-checklist.md](./eval-checklist.md) | Pre-promote checklist |
| [policy-constraints.md](./policy-constraints.md) | Hard constraints |
| [manifest.json](./manifest.json) | Machine index + AOR pin |
| [results/](./results/) | PASS/FAIL run reports |

Behaviour changes: edit SPEC + `contracts/packs/tripspec-nl.baseline.json`, then re-train — not LoRA.
