#!/usr/bin/env bash
# SPEC → pack → eval loop (webinar "aha")
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> TripSpec train"
echo "    Edit SPECs / contracts/packs/tripspec-nl.baseline.json, then re-run."
echo ""

export TRIPSPEC_EVAL_MODE="${TRIPSPEC_EVAL_MODE:-}"
npx tsx src/eval/run-scenarios.ts
