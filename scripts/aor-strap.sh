#!/usr/bin/env bash
# Copy the Agent On Rails control plane into this repository.
# Later steps (contracts, specs) read vendor/aor, not a path outside the repo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SRC="${AOR_CONTROL_PLANE:-$HOME/src/agent-on-rails/agent-on-rails-control-plane}"
DEST="${ROOT}/vendor/aor"

if [[ ! -f "${SRC}/examples/chatbot-training/contract.sh" ]]; then
  echo "error: AOR control plane not found at:"
  echo "  ${SRC}"
  echo "Set AOR_CONTROL_PLANE to your agent-on-rails-control-plane checkout."
  exit 1
fi

PIN="$(cd "${SRC}" && git rev-parse --short HEAD 2>/dev/null || echo unknown)"
FULL="$(cd "${SRC}" && git rev-parse HEAD 2>/dev/null || echo unknown)"

echo "==> Strap AOR into this repository"
echo "    from: ${SRC}"
echo "    to:   vendor/aor"
echo "    pin:  ${PIN}"

mkdir -p "${DEST}" "${ROOT}/.aor"
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.cursor/' \
  --exclude '.pytest_cache/' \
  --exclude '__pycache__/' \
  --exclude '.DS_Store' \
  "${SRC}/" "${DEST}/"

cat > "${ROOT}/.aor/aor-pin.json" <<EOF
{
  "control_plane_path": "vendor/aor",
  "source": "${SRC}",
  "commit": "${FULL}",
  "short": "${PIN}",
  "guide": "guides/chatbot-training-orchestration.md",
  "strapped_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "    AOR is now vendor/aor on this machine. Not committed."
echo "    Next: npm run contracts"
