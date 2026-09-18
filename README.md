# TripSpec

Spec-driven **holiday planner** on local **Ollama**. You name a country or city; TripSpec writes an itinerary from the guide, offers flights with no prices, and schedules in-app reminders. Behaviour comes from the pack and the train report — not fine-tuning.

> Demo travel-planner agent trained with Spec-Driven Development on Ollama. SPECs + golden scenarios + acceptance evals drive system prompts and tools — same pattern as Maya Travel AI, sized for a live workshop.

Workshop talk: [`docs/README.md`](./docs/README.md).

## What “train” means

Same contract as Maya SPEC-017 / `specs/training/`:

1. Write **SPEC** (must / must-not / acceptance)
2. Derive **system prompt + tool policy + few-shots** → capability pack
3. Run **golden scenarios** against Ollama
4. **Fail → tighten SPEC/pack → re-run** until evals PASS
5. Do **not** use LoRA as the behaviour lever

## Quick start

```bash
cd ~/src/personal/sdd-travel-planner
cp .env.example .env   # optional
npm install
npm install --prefix apps/chat

npm run pull                 # ollama pull qwen3.5:latest
npm run demo                 # generates specs/, then chat UI :3000
npm run train                # writes specs/training/results/latest.md, which the chatbot reads
```

`specs/` is not in git. `npm run demo` generates it from `product/requirements.md`. The chatbot will not answer until `npm run train` has written `specs/training/results/latest.md`.

Env:

| Variable | Default |
|----------|---------|
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` |
| `OLLAMA_CHAT_MODEL` | `qwen3.5:latest` |
| `TRIPSPEC_EVAL_MODE` | auto (`live` if Ollama up, else `mock`) |
| `AOR_CONTROL_PLANE` | `~/src/agent-on-rails/agent-on-rails-control-plane` |

## Scope

**In:** discuss a country or city from the local guide → one clarifying question → day plan → 3 flights from stub inventory → hotels after a pick → in-app reminder schedule. Bahasa, detailed, never invent.

**Out:** real booking, live visa/weather APIs, email/WhatsApp/push, payment, ticket PDF.

## Webinar arc (~45–50 min)

1. Prompt-only still invents a trip. Show the old before transcripts.
2. Walk SPEC-001 (discuss) → SPEC-003 (plan) → SPEC-005 (notify).
3. `npm run train` on S1–S5.
4. Change a day line or a reminder rule in the guide/pack, re-train. Weights stay `qwen3.5:latest`.

## Scripts

| Command | Does |
|---------|------|
| `npm run pull` | `ollama pull` default model (`qwen3.5:latest`) |
| `npm run train:aor` | Latest AOR control-plane `orchestrate.sh` → `.aor/generated-control-plane/` |
| `npm run train` | Load pack → S1–S5 → `specs/training/results/` |
| `npm run train:all` | `train:aor` then `train` |
| `npm run eval:mock` | Deterministic / canned replies (no Ollama) |
| `npm run eval:live` | Force live Ollama runs |
| `npm run demo` | Check Ollama (pull if needed) + start UI `:3000` |

Training deep-dive: [`specs/training/HOWTO-TRAINING.md`](./specs/training/HOWTO-TRAINING.md)

## Product

- **Repo:** `sdd-travel-planner`
- **UI nickname:** **TripSpec**
- **Voice:** Bahasa-first planner (`kamu`). Detailed, grounded, not a brochure.
