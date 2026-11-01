import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { repoRoot, webFile } from "@tests/paths";

const root = repoRoot;
const registry = JSON.parse(
    await readFile(webFile(path.join("registry.json")), "utf8")
  ),
  errors = [],
  sources = new Map();
for (const item of registry.items) {
  const included = new Set(
    item.files.map((file) => webFile(path.join(file.path)))
  );
  for (const file of item.files) {
    const absolute = webFile(path.join(file.path));
    if (!sources.has(absolute))
      sources.set(absolute, await readFile(absolute, "utf8"));
    const source = sources.get(absolute);
    for (const match of source.matchAll(
      /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)(["'])(\.[^"']+|@\/components\/ui\/[^"']+)\1/g
    )) {
      const target = match[2].startsWith("@/components/ui/")
        ? webFile(
            path.join("registry/ui", match[2].slice("@/components/ui/".length))
          )
        : path.resolve(path.dirname(absolute), match[2]);
      if (
        ![
          target,
          ...[".ts", ".tsx", ".css", ".json"].map(
            (extension) => target + extension
          ),
          path.join(target, "index.ts"),
          path.join(target, "index.tsx"),
        ].some((candidate) => included.has(candidate))
      )
        errors.push(
          `${item.name}: ${path.basename(file.path)} requires ${match[2]}`
        );
    }
  }
}
assert.deepEqual(
  errors,
  [],
  `Registry items must include static and lazy relative imports:\n${errors.join("\n")}`
);
console.log(
  `Registry closure: ${registry.items.length} self-contained items, including lazy imports`
);
