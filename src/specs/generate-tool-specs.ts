import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPack, repoRoot, type PackTool } from "../agent/compose";
import { toolSpecRel } from "../agent/tool-catalog";

function render(packId: string, version: string, tool: PackTool): string {
  const params = (tool.parameters ?? [])
    .map((param) => {
      const note = param.description ? ` — ${param.description}` : "";
      return `- \`${param.name}\` (${param.type})${note}`;
    })
    .join("\n");
  const invoke = tool.invoke;
  const invokeLines = invoke
    ? [
        invoke.match ? `- Match the latest sentence: \`${invoke.match}\`` : "",
        invoke.unless ? `- Do not run if the latest sentence matches: \`${invoke.unless}\`` : "",
        invoke.require?.length ? `- Also require: ${invoke.require.join(", ")}` : "",
        invoke.arguments
          ? `- Arguments: \`${JSON.stringify(invoke.arguments)}\``
          : "",
      ].filter(Boolean)
    : [];

  return [
    `# ${tool.name}`,
    "",
    `Generated from \`contracts/packs/${packId}.baseline.json\` @ \`${version}\`.`,
    "Edit the catalog entry, then regenerate. This file is not the source of truth.",
    "",
    `**When:** ${tool.when}`,
    "",
    "## Meaning",
    "",
    tool.meaning,
    "",
    "## What the model is told",
    "",
    tool.description,
    "",
    "## Parameters",
    "",
    params || "_None._",
    "",
    ...(invokeLines.length ? ["## When the chatbot runs it", "", ...invokeLines, ""] : []),
    "The handler still lives in `src/agent/tools.ts` and reads `src/inventory/mock-data.ts`.",
    "Changing this markdown does not change the next reply.",
    "",
  ].join("\n");
}

/** Write one markdown per catalog tool. Returns repo-relative paths. */
export function generateToolSpecs(pack = loadPack()): string[] {
  const root = repoRoot();
  const written: string[] = [];
  for (const tool of pack.modules.tools?.catalog ?? []) {
    const rel = toolSpecRel(tool);
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, render(pack.pack_id, pack.version, tool), "utf8");
    written.push(rel);
  }
  return written;
}

export function cursorFileHref(rel: string): string {
  return `cursor://file${join(repoRoot(), rel)}`;
}

const entry = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (entry || process.argv[1]?.endsWith("generate-tool-specs.ts")) {
  const files = generateToolSpecs();
  for (const file of files) console.log(`    ${file}`);
}
