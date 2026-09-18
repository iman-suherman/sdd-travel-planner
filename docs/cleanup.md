# Cleanup

Put this machine back to the start of the demo. Generated files go. `contracts/vibe.md` stays. The model and `node_modules` stay, so the next command is `npm run strap`, not `npm install` or `npm run pull`.

Run this from the repository root:

```bash
# Stop the chat if it is still on :3000
if lsof -tiTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  lsof -tiTCP:3000 -sTCP:LISTEN | xargs kill
fi

rm -rf vendor/aor
rm -f contracts/packs/*.json contracts/capability/*.json
rm -rf .aor/generated-control-plane
rm -rf apps/chat/.next

find specs -type f ! -name '.gitkeep' -delete
find specs -type d -empty -delete
find docs/evidence -type f ! -name '.gitkeep' -delete
```

What that removes:

| Gone | Why |
| --- | --- |
| `vendor/aor/` | Strapped control plane. `npm run strap` copies it again. |
| `contracts/packs/*.json` and `contracts/capability/*.json` | Pack and schema. `npm run contracts` writes them from `contracts/vibe.md`. |
| `specs/` except `.gitkeep` | Generated specs and `specs/training/results/latest.md`. The chatbot will refuse until `npm run train`. |
| `.aor/generated-control-plane/` | Drafts from `npm run specs`. |
| `apps/chat/.next/` | Next cache from the last demo. |
| `docs/evidence/` except `.gitkeep` | Local captures, including the before transcript. |
| The process on port 3000 | So `npm run help` does not treat the chat as already up. |

What that leaves:

- `contracts/vibe.md`
- Every `.gitkeep`
- `node_modules`
- `qwen3.5:latest` on the local Ollama

Then:

```bash
npm run help
```

Pull should still say done. Strap, contracts, specs, train, and demo should say not yet. Next is `npm run strap`.
