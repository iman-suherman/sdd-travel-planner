#!/usr/bin/env bash
# Pull the default TripSpec Ollama chat model.
set -euo pipefail

OLLAMA_CHAT_MODEL="${OLLAMA_CHAT_MODEL:-qwen3.5:latest}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "ollama CLI not found. Install from https://ollama.com then re-run."
  exit 1
fi

echo "==> Pulling $OLLAMA_CHAT_MODEL"
ollama pull "$OLLAMA_CHAT_MODEL"
echo "==> Done. Model ready: $OLLAMA_CHAT_MODEL"
