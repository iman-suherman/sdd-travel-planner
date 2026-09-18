#!/usr/bin/env bash
# Start Ollama check + TripSpec UI
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
OLLAMA_CHAT_MODEL="${OLLAMA_CHAT_MODEL:-qwen3.5:latest}"

echo "==> TripSpec demo"
echo "    OLLAMA_BASE_URL=$OLLAMA_BASE_URL"
echo "    OLLAMA_CHAT_MODEL=$OLLAMA_CHAT_MODEL"

if curl -sf "${OLLAMA_BASE_URL}/api/tags" >/dev/null 2>&1; then
  echo "    Ollama: OK"
  if ! curl -sf "${OLLAMA_BASE_URL}/api/tags" | grep -q "\"${OLLAMA_CHAT_MODEL}\""; then
    echo "    Model missing — running npm run pull…"
    bash "$ROOT/scripts/pull-model.sh"
  fi
else
  echo "    Ollama: NOT REACHABLE at $OLLAMA_BASE_URL"
  echo "    Start Ollama, then: npm run pull"
  echo "    UI will still start; chat will error until Ollama is up."
fi

export OLLAMA_BASE_URL OLLAMA_CHAT_MODEL
export TRIPSPEC_ROOT="$ROOT"
cd apps/chat
exec npx next dev -p 3000
