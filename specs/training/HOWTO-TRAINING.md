# HOWTO — TripSpec training (Agent On Rails + behavioural eval)

How training works for this workshop demo, using the **latest**
[`agent-on-rails-control-plane`](https://github.com/agent-on-rails/agent-on-rails-control-plane)
chatbot-training orchestration **plus** TripSpec’s Ollama eval loop.

---

## Mental model (two layers)

```text
product/requirements.md
        │
        ▼
┌─────────────────────────────────────┐
│ Layer A — Agent On Rails            │  npm run train:aor
│ chatbot-training-orchestration      │
│ (AOR-011 shape + AOR-010 gather)    │
│                                     │
│ BRIEF → PRD → ARCHITECTURE →        │
│ enriched reqs → aor gather →        │
│ specs/training/ drafts              │
│ → .aor/generated-control-plane/     │
└─────────────────┬───────────────────┘
                  │ human review (workshop: we already authored SoT)
                  ▼
┌─────────────────────────────────────┐
│ Hand-authored SoT (this repo)       │
│ specs/SPEC-001…004                  │
│ contracts/packs/tripspec-nl.*.json  │
│ specs/training/scenarios.md (S1–S5) │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ Layer B — Behavioural train         │  npm run train
│ pack → compose → Ollama/mock →      │
│ judges → results/*.md               │
│ FAIL → tighten SPEC/pack → re-run   │
└─────────────────────────────────────┘
```

| Layer | Changes behaviour? | Tooling |
| --- | --- | --- |
| **A — AOR orchestration** | Shapes / regenerates **training-spec drafts** | `orchestrate.sh` in AOR control-plane |
| **B — TripSpec eval** | Proves the **live replies** against S1–S5 | `src/eval/run-scenarios.ts` + judges |

**Not** LoRA / weight fine-tuning. Same contract as Maya SPEC-017.

---

## Current status

| Item | Value |
| --- | --- |
| Product | **TripSpec** |
| Voice pack | `tripspec-nl` — see `contracts/packs/tripspec-nl.baseline.json` |
| Model | `qwen3.5:latest` (`npm run pull`) |
| Golden gate | S1–S5 — mock **PASS 5/5** (see `specs/training/results/latest.md`) |
| AOR guide | `guides/chatbot-training-orchestration.md` |
| AOR pin | recorded in `.aor/aor-pin.json` after `npm run train:aor` |

---

## Commands

```bash
# Layer A — regenerate AOR discovery + training-pack drafts (does not overwrite SoT)
export AOR_CONTROL_PLANE=~/src/agent-on-rails/agent-on-rails-control-plane   # default
npm run train:aor

# Optional: LLM gather instead of --stub
TRAIN_AOR_LLM=1 npm run train:aor

# Layer B — score behaviour (mock if Ollama down; live if up)
npm run train
npm run eval:live    # force Ollama + qwen3.5
```

---

## What “good” looks like in the webinar

1. **Prompt-only fail** — invent hotels → grounding judge FAIL  
2. **SPEC-004 + pack hard_rules** → same path, grounded  
3. **`npm run train`** → green S1–S5  
4. **Tighten SPEC-002 voice** → re-train → style changes, weights untouched  
5. Optional: show `.aor/generated-control-plane/` as the AOR-shaped twin of Maya’s training pack  

---

## Pass bar (Layer B)

- S4 (refuse invent) **must** pass  
- ≥ 4 of S1–S5 pass  
- Evidence in `specs/training/results/`

---

## Pin / upgrade AOR

```bash
cd ~/src/agent-on-rails/agent-on-rails-control-plane
git pull origin main
cd ~/src/personal/sdd-travel-planner
npm run train:aor    # refreshes .aor/aor-pin.json
```

Update `specs/training/manifest.json` → `aor.commit` when you intentionally bump the pin for a workshop.
