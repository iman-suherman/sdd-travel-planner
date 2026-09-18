# TripSpec

Spec-driven travel planner chatbot on local **Ollama**. Train behaviour with **SPECs**, golden scenarios, and acceptance evals (Maya-style) — **not** weight fine-tuning.

> Demo travel-planner agent trained with Spec-Driven Development on Ollama. SPECs + golden scenarios + acceptance evals drive system prompts and tools — same pattern as Maya Travel AI, sized for a live workshop.

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

# Pull latest Qwen for Ollama, then train / demo
npm run pull                 # ollama pull qwen3.5:latest
npm run train:aor            # Agent On Rails chatbot-training orchestration (latest control-plane)
npm run train                # behavioural S1–S5 judges (mock/live)
npm run demo                 # Chat UI :3000 (auto-pulls model if missing)
```

Env:

| Variable | Default |
|----------|---------|
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` |
| `OLLAMA_CHAT_MODEL` | `qwen3.5:latest` |
| `TRIPSPEC_EVAL_MODE` | auto (`live` if Ollama up, else `mock`) |
| `AOR_CONTROL_PLANE` | `~/src/agent-on-rails/agent-on-rails-control-plane` |

## Scope (1-hour live build)

**In:** trip intake → clarifying Qs → 3 itinerary options from **stub inventory** → never invent prices/hotels → Indonesian-first voice.

**Out:** real Anamaya booking, policy plafon, WhatsApp, payment, ticket PDF, multi-tenant packs.

## Layout

```
specs/           SPEC-001…004 + training/ (S1–S5, eval checklist)
contracts/       capability-pack schema + tripspec-nl.baseline.json
src/agent/       compose (pack → prompt), tools, Ollama runner
src/eval/        judges + run-scenarios
src/inventory/   mock flights/hotels
apps/chat/       TripSpec Next.js UI
scripts/         train.sh, demo.sh
```

## Webinar arc (~45–50 min)

1. **Prompt-only fail** — invent hotels → show FAIL  
2. **Write SPEC-004 + pack hard_rules** → grounded  
3. **`npm run train`** → green S1–S5  
4. **Tighten voice** in SPEC-002 / pack → re-train (no weight changes)  
5. **Optional:** tool call to mock inventory in the UI  

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
- **Voice:** Bahasa-first UI + agent (`kamu`, WhatsApp-straight)
