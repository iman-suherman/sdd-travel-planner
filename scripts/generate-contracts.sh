#!/usr/bin/env bash
# Generate the capability pack and schema from contracts/vibe.md using the strapped AOR control plane.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

AOR="${ROOT}/vendor/aor"
VIBE="${ROOT}/contracts/vibe.md"
OUT="${ROOT}/contracts/packs/tripspec-nl.baseline.json"
SCHEMA="${ROOT}/contracts/capability/capability-pack.schema.json"
CONTRACT="${AOR}/examples/chatbot-training/contract.sh"

if [[ ! -f "${CONTRACT}" ]]; then
  echo "error: AOR is not in this repository yet."
  echo "    Run: npm run strap"
  exit 1
fi
if [[ ! -f "${VIBE}" ]]; then
  echo "error: vibe description missing: contracts/vibe.md"
  exit 1
fi

echo "==> Generate contract from the vibe"
bash "${CONTRACT}" --vibe "${VIBE}" --out "${OUT}" --schema "${SCHEMA}"

mkdir -p "${ROOT}/.aor"
python3 - "${OUT}" "${ROOT}/.aor/contract-pin.json" <<'PY'
import json, sys
from datetime import datetime, timezone
from pathlib import Path
pack = json.loads(Path(sys.argv[1]).read_text())
pin = {
    "vibe": "contracts/vibe.md",
    "pack": "contracts/packs/tripspec-nl.baseline.json",
    "schema": "contracts/capability/capability-pack.schema.json",
    "pack_id": pack.get("pack_id"),
    "version": pack.get("version"),
    "tools": [tool["name"] for tool in pack.get("modules", {}).get("tools", {}).get("catalog", [])],
    "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
}
Path(sys.argv[2]).write_text(json.dumps(pin, indent=2) + "\n")
print(f"    pin .aor/contract-pin.json  {pin['pack_id']}@{pin['version']}")
PY
echo "    Next: npm run specs"
