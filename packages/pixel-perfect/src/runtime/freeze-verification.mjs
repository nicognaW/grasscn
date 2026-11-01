import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { repoRoot, webFile } from "@ppt/paths";

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
  await readFile(webFile("registry/minecraft-map.json"), "utf8")
);
await writeFile(
  path.join(output, "source-manifest.json"),
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      bun: Bun.version,
      minecraftVersion: map.minecraftVersion,
      sourceJarSha256: map.sourceJarSha256,
      components: map.components.map((c) => ({
        name: c.name,
        status: c.implementation.status,
        pixels: c.pixelVerification.status,
      })),
      files: records,
    },
    null,
    2
  ) + "\n"
);
console.log(
  `Retained ${records.length} exact source/provenance files in ${output}`
);
