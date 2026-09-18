#!/usr/bin/env bash
# Run Agent On Rails chatbot-training orchestration (latest control-plane)
# against TripSpec requirements. Publishes generated specs into specs/.
# Does not touch specs/training/results/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

AOR_CONTROL_PLANE="${AOR_CONTROL_PLANE:-$HOME/src/agent-on-rails/agent-on-rails-control-plane}"
ORCH="${AOR_CONTROL_PLANE}/examples/chatbot-training/orchestrate.sh"
REQ="${ROOT}/product/requirements.md"
OUT="${ROOT}/.aor/generated-control-plane"

if [[ ! -x "${ORCH}" && ! -f "${ORCH}" ]]; then
  echo "error: AOR orchestrator not found at:"
  echo "  ${ORCH}"
  echo "Set AOR_CONTROL_PLANE to your agent-on-rails-control-plane checkout."
  exit 1
fi

if ! command -v aor >/dev/null 2>&1; then
  echo "error: aor CLI not on PATH (install agent-on-rails-cli)"
  exit 127
fi

# Record pin
PIN="$(cd "${AOR_CONTROL_PLANE}" && git rev-parse --short HEAD 2>/dev/null || echo unknown)"
FULL="$(cd "${AOR_CONTROL_PLANE}" && git rev-parse HEAD 2>/dev/null || echo unknown)"
echo "==> TripSpec × Agent On Rails chatbot-training"
echo "    control-plane: ${AOR_CONTROL_PLANE}"
echo "    pin: ${PIN} (${FULL})"
echo "    aor: $(aor --version 2>/dev/null | head -1)"
echo "    out: ${OUT}"
echo ""

mkdir -p "${ROOT}/.aor"
chmod +x "${ORCH}" "${AOR_CONTROL_PLANE}/examples/chatbot-training/discovery_stub.py" 2>/dev/null || true

# Stub mode by default (offline, workshop-safe). Pass TRAIN_AOR_LLM=1 for LLM gather.
ARGS=(
  --requirements "${REQ}"
  --out "${OUT}"
  --yes
  --force
)
if [[ "${TRAIN_AOR_LLM:-0}" == "1" ]]; then
  ARGS+=(--llm)
else
  ARGS+=(--stub)
fi

bash "${ORCH}" "${ARGS[@]}"

# Stamp role report with pin
REPORT="${OUT}/.aor/chatbot-training/role-report.md"
mkdir -p "$(dirname "${REPORT}")"
{
  echo ""
  echo "---"
  echo ""
  echo "## TripSpec pin"
  echo ""
  echo "- AOR control-plane: \`${FULL}\`"
  echo "- Guide: \`guides/chatbot-training-orchestration.md\`"
  echo "- Behaviour eval (this repo): \`npm run train\` → \`specs/training/results/\`"
  echo "- Generated specs (not committed): \`specs/\`"
  echo "- Chatbot demo reads \`specs/training/results/latest.md\`"
} >> "${REPORT}"

# Mirror pin into local marker
cat > "${ROOT}/.aor/aor-pin.json" <<EOF
{
  "control_plane_path": "${AOR_CONTROL_PLANE}",
  "commit": "${FULL}",
  "short": "${PIN}",
  "guide": "guides/chatbot-training-orchestration.md",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "out": ".aor/generated-control-plane"
}
EOF

echo ""
echo "==> Publish generated specs into specs/ (results/ is left alone)"
mkdir -p "${ROOT}/specs/training/results"
find "${ROOT}/specs" -type f \
  ! -path "${ROOT}/specs/training/results/*" \
  ! -name '.gitkeep' \
  -delete
rsync -a --exclude 'training/results/' "${OUT}/specs/" "${ROOT}/specs/"
touch "${ROOT}/specs/.gitkeep" "${ROOT}/specs/training/results/.gitkeep"
echo "    specs/ is gitignored. The chatbot reads specs/training/results/latest.md."
echo "    Next: npm run train   # writes that report"
echo "    Then: npm run demo"
