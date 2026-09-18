#!/usr/bin/env bash
# Workshop map: what is already on this machine, what is not, and the next command.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  G=$'\033[32m'; Y=$'\033[33m'; C=$'\033[36m'; R=$'\033[31m'
  B=$'\033[1m'; D=$'\033[2m'; X=$'\033[0m'
else
  G=; Y=; C=; R=; B=; D=; X=
fi

info() { printf '%s   %s%s\n' "$D" "$1" "$X"; }

step() {
  local kind="$1" n="$2" cmd="$3" detail="$4"
  local badge
  if [[ "$kind" == "done" ]]; then
    badge="$(printf '%s%-7s%s' "$G$B" "done" "$X")"
  else
    badge="$(printf '%s%-7s%s' "$Y$B" "not yet" "$X")"
  fi
  printf '  %s  %s  %s%-20s%s  %s\n' "$badge" "$n" "$B" "$cmd" "$X" "$detail"
}

OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
OLLAMA_CHAT_MODEL="${OLLAMA_CHAT_MODEL:-qwen3.5:latest}"
PACK_FILE="contracts/packs/tripspec-nl.baseline.json"
SCHEMA_FILE="contracts/capability/capability-pack.schema.json"
LATEST="specs/training/results/latest.md"

pack_version="missing"
if [[ -f "$PACK_FILE" ]]; then
  pack_version="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$PACK_FILE" | head -1)"
fi

ollama_up=0
model_present=0
if curl -sf --max-time 2 "${OLLAMA_BASE_URL}/api/tags" >/tmp/tripspec-help-tags.json 2>/dev/null; then
  ollama_up=1
  if grep -q "\"${OLLAMA_CHAT_MODEL}\"" /tmp/tripspec-help-tags.json; then
    model_present=1
  fi
fi
rm -f /tmp/tripspec-help-tags.json

aor_ok=0
if command -v aor >/dev/null 2>&1; then
  aor_ok=1
fi

# Strapped AOR lives in this repo. The external checkout is only the source of npm run strap.
aor_strapped=0
if [[ -f vendor/aor/examples/chatbot-training/contract.sh && -f vendor/aor/examples/chatbot-training/orchestrate.sh ]]; then
  aor_strapped=1
fi

contract_ready=0
contract_version=""
if [[ -f .aor/contract-pin.json && -f "$PACK_FILE" && -f "$SCHEMA_FILE" ]]; then
  contract_ready=1
  contract_version="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' .aor/contract-pin.json | head -1)"
fi

# Generated specs are the tree npm run specs publishes (requirements/ and product/).
# Leftover SPEC-00N files from an older checkout do not count.
specs_ready=0
spec_count=0
if [[ -d specs/requirements && -d specs/product ]]; then
  spec_count="$(find specs/requirements specs/product -type f ! -name '.gitkeep' | wc -l | tr -d ' ')"
  if [[ "$spec_count" -gt 0 ]]; then
    specs_ready=1
  fi
fi

report_pack=""
report_mode=""
report_bar=""
if [[ -f "$LATEST" ]]; then
  report_pack="$(sed -n 's/.*`tripspec-nl@\([^`]*\)`.*/\1/p' "$LATEST" | head -1)"
  report_mode="$(sed -n 's/.*Mode: \*\*\([^*]*\)\*\*.*/\1/p' "$LATEST" | head -1)"
  report_bar="$(sed -n 's/.*\*\*Pass bar:\*\* \(.*\)/\1/p' "$LATEST" | head -1)"
fi

echo ""
printf '%s%s┌ npm run help ─────────────────────────────────────────────%s\n' "$C" "$B" "$X"
printf '%s│%s TripSpec writes an itinerary. No prices. Weights stay put.%s\n' "$C" "$X" "$X"
printf '%s│%s Green = on this machine. Yellow = still to do.%s\n' "$C" "$X" "$X"
printf '%s└────────────────────────────────────────────────────────────%s\n' "$C" "$X"
echo ""

echo "${B}Order${X}"

pull_kind="not yet"
pull_detail="Ollama is down at ${OLLAMA_BASE_URL}. Start it, then this command."
if [[ "$ollama_up" -eq 1 && "$model_present" -eq 1 ]]; then
  pull_kind="done"
  pull_detail="${OLLAMA_CHAT_MODEL} is installed at ${OLLAMA_BASE_URL}."
elif [[ "$ollama_up" -eq 1 ]]; then
  pull_detail="Ollama is up. ${OLLAMA_CHAT_MODEL} is not installed."
fi
step "$pull_kind" "1" "npm run pull" "$pull_detail"

strap_kind="not yet"
strap_detail="vendor/aor is not on this machine yet. Strap copies the control plane in. It is not committed."
if [[ "$aor_strapped" -eq 1 ]]; then
  strap_kind="done"
  pin_short="$(sed -n 's/.*"short": *"\([^"]*\)".*/\1/p' .aor/aor-pin.json 2>/dev/null | head -1)"
  strap_detail="vendor/aor is on this machine${pin_short:+ (pin ${pin_short})}. Not in git."
fi
step "$strap_kind" "2" "npm run strap" "$strap_detail"

contract_kind="not yet"
contract_detail="contracts/vibe.md is the entry. AOR writes the pack and the capability schema."
if [[ "$aor_strapped" -eq 0 ]]; then
  contract_detail="Strap AOR first. The generator lives in vendor/aor."
elif [[ "$aor_ok" -eq 0 ]]; then
  contract_detail="aor CLI is missing. The strapped control plane still needs the CLI."
elif [[ "$contract_ready" -eq 1 ]]; then
  contract_kind="done"
  contract_detail="Pack tripspec-nl@${contract_version:-${pack_version}} was generated from contracts/vibe.md."
fi
step "$contract_kind" "3" "npm run contracts" "$contract_detail"

aor_kind="not yet"
aor_detail="Generate specs into specs/requirements and specs/product."
if [[ "$aor_strapped" -eq 0 ]]; then
  aor_detail="Strap AOR first. Spec generation reads vendor/aor."
elif [[ "$contract_ready" -eq 0 ]]; then
  aor_detail="Generate the contract from the vibe before the specs."
elif [[ "$specs_ready" -eq 1 ]]; then
  aor_kind="done"
  aor_detail="specs/requirements and specs/product are on disk (${spec_count} files). Gitignored."
fi
step "$aor_kind" "4" "npm run specs" "$aor_detail"

train_kind="not yet"
train_detail="No specs/training/results/latest.md. The chatbot will refuse."
if [[ -f "$LATEST" && -n "$report_pack" && "$report_pack" == "$pack_version" ]]; then
  train_kind="done"
  train_detail="latest.md is tripspec-nl@${report_pack}, mode=${report_mode:-unknown}. ${report_bar:-pass bar unread}."
elif [[ -f "$LATEST" ]]; then
  train_detail="latest.md is @${report_pack:-unknown} (${report_mode:-unknown}, ${report_bar:-no pass bar}). Pack on disk is @${pack_version}."
fi
step "$train_kind" "5" "npm run train" "$train_detail"

demo_up=0
if curl -sf --max-time 1 "http://127.0.0.1:3000" >/dev/null 2>&1; then
  demo_up=1
fi
demo_kind="not yet"
demo_detail="Chat on :3000. It imitates latest.md and will not answer until step 5 matches this pack."
if [[ "$demo_up" -eq 1 && "$train_kind" == "done" ]]; then
  demo_kind="done"
  demo_detail="http://localhost:3000 is up, and the train report matches the pack."
elif [[ "$demo_up" -eq 1 ]]; then
  demo_detail="http://localhost:3000 is up, but it is still imitating the older report until you retrain."
elif [[ "$train_kind" == "done" ]]; then
  demo_detail="Report matches the pack. Start the chat when you want the itinerary."
fi
step "$demo_kind" "6" "npm run demo" "$demo_detail"

if [[ ! -d node_modules || ! -d apps/chat/node_modules ]]; then
  echo ""
  step "not yet" " " "npm install" "Root or apps/chat dependencies are missing."
elif [[ ! -f "$PACK_FILE" ]]; then
  echo ""
  step "not yet" " " "pack" "Missing ${PACK_FILE}."
fi

echo ""
echo "${B}Also available${X}"
info "npm run train:all   specs then train"
info "npm run eval:mock   judges only, canned replies, no Ollama"
info "npm run eval:live   same gate, forces Ollama"
info "npm run chat        UI only, does not regenerate specs"

echo ""
next="npm run demo"
next_why="Specs, model, and a train report are in place. Open the chat and read the itinerary. No prices."
if [[ ! -d node_modules || ! -d apps/chat/node_modules ]]; then
  next="npm install && npm install --prefix apps/chat"
  next_why="Install dependencies before any other command."
elif [[ "$ollama_up" -eq 0 ]]; then
  next="Start Ollama, then npm run pull"
  next_why="The model host is down. Train and demo both wait on it."
elif [[ "$model_present" -eq 0 ]]; then
  next="npm run pull"
  next_why="The chat model is not installed yet."
elif [[ "$aor_strapped" -eq 0 ]]; then
  next="npm run strap"
  next_why="vendor/aor is not on this machine yet. Strap copies the control plane in. It is not committed."
elif [[ "$aor_ok" -eq 0 ]]; then
  next="Install the aor CLI, then npm run contracts"
  next_why="The strapped control plane still calls the aor CLI to write the contract and the specs."
elif [[ "$contract_ready" -eq 0 ]]; then
  next="npm run contracts"
  next_why="contracts/vibe.md has not been turned into the pack and capability schema yet."
elif [[ "$specs_ready" -eq 0 ]]; then
  next="npm run specs"
  next_why="specs/ has not been generated on this machine."
elif [[ ! -f "$LATEST" ]]; then
  next="npm run train"
  next_why="The chatbot reads specs/training/results/latest.md and will not answer without it."
elif [[ -n "$report_pack" && "$report_pack" != "$pack_version" ]]; then
  next="npm run train"
  next_why="The saved report is an older pack. Re-score so the chatbot imitates this itinerary, not the priced one."
fi

printf '%s%s┌ Next%s\n' "$C" "$B" "$X"
printf '%s│%s %s%s\n' "$C" "$B" "$next" "$X"
printf '%s│%s %s%s\n' "$C" "$X" "$next_why" "$X"
printf '%s└────────────────────────────────────────────────────────────%s\n' "$C" "$X"
echo ""
