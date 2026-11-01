import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { webFile } from "@tests/paths";

interface SourceRegistry {
  items: { name: string; files: { path: string }[] }[];
}

// SAFETY: this is the authored registry catalogue, whose item file paths define installation closure.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Consume the registry producer contract and retain all closure assertions.
const registry = JSON.parse(
  await readFile(webFile(path.join("registry.json")), "utf-8")
) as SourceRegistry;

const errors: string[] = [];
const sources = new Map<string, string>();

for (const item of registry.items) {
  const included = new Set(
    item.files.map((file) => webFile(path.join(file.path)))
  );

  for (const file of item.files) {
    const absolute = webFile(path.join(file.path));

    const source = sources.get(absolute) ?? (await readFile(absolute, "utf-8"));
    sources.set(absolute, source);

    for (const match of source.matchAll(
      /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)(?<quote>["'])(?<specifier>\.[^"']+|@\/components\/ui\/[^"']+)\1/gu
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
      ) {
        errors.push(
          `${item.name}: ${path.basename(file.path)} requires ${match[2]}`
        );
      }
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
