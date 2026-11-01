import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { repoRoot } from "@ppt/paths";
import { evidenceFile } from "@ppt/runtime/evidence-paths";

import {
  validateHistoricalEvidence,
  historicalMapComponents,
} from "./historical-evidence.ts";

assert.ok(process.argv[2], "Pass a new snapshot directory");
const output = path.resolve(process.argv[2]);
await mkdir(output, { recursive: false });
const names = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: repoRoot, encoding: "utf8" }
)
  .split("\0")
  .filter(Boolean);
const records = [];
for (const name of [...new Set(names)].sort()) {
  if (
    name.startsWith("packages/pixel-perfect/tests/reference/") &&
    !/\.(json|java|mjs)$/.test(name)
  )
    continue;
  const bytes = await readFile(path.join(repoRoot, name));
  const target = path.join(output, "sources", name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  records.push({
    path: name,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
  });
}
const map = JSON.parse(
  await readFile(evidenceFile("registry/minecraft-map.json"), "utf8")
);
/** @type {unknown} */

const registry = JSON.parse(
  await readFile(evidenceFile("registry.json"), "utf-8")
);

const historicalEvidence = await validateHistoricalEvidence({
  archiveDirectory: path.join(
    repoRoot,
    "packages/pixel-perfect/evidence/historical-installed-977f538"
  ),
  map,
  registry,
  resolvePath: evidenceFile,
});

await writeFile(
  path.join(output, "source-manifest.json"),
  `${JSON.stringify(
    {
      bun: Bun.version,
      capturedAt: new Date().toISOString(),
      components: historicalMapComponents(
        JSON.stringify(map),
        historicalEvidence
      ),
      files: records,
      historicalEvidence,
      minecraftVersion: map.minecraftVersion,
      sourceJarSha256: map.sourceJarSha256,
    },
    null,
    2
  )}\n`
);
console.log(
  `Retained ${records.length} exact source/provenance files in ${output}`
);
