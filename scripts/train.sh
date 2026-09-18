#!/usr/bin/env bash
# SPEC → pack → eval loop. Narration is printed by src/eval/run-scenarios.ts.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  C=$'\033[36m'; B=$'\033[1m'; R=$'\033[0m'
else
  C=; B=; R=
fi
printf '%s\n' "${C}${B}┌ npm run train ─────────────────────────────────────────${R}"
printf '%s\n' "${C}│${R} Weights stay put. Each step below is its own box."
printf '%s\n' "${C}│${R} Yellow box = waiting. Green = PASS. Red = FAIL."
printf '%s\n' "${C}└────────────────────────────────────────────────────────${R}"
echo ""

export TRIPSPEC_EVAL_MODE="${TRIPSPEC_EVAL_MODE:-}"
npx tsx src/eval/run-scenarios.ts
