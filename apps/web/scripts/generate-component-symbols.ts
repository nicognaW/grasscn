import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { API } from "typescript/unstable/async";

import groups from "../component-groups.json" with { type: "json" };
import registry from "../registry.json" with { type: "json" };

// This is registry API metadata, not a second documentation/content index.
const webRoot = fileURLToPath(new URL("../", import.meta.url));
const config = path.resolve(webRoot, "tsconfig.json");

const groupedEntries: Record<string, string[]> = groups;
const api = new API({ cwd: webRoot });

interface RegistryPublicSymbols {
  registryItem: string;
  exports: string[];
}

const symbols: Record<string, RegistryPublicSymbols> = {};

try {
  const snapshot = await api.updateSnapshot({ openProjects: [config] });
  const project = snapshot.getProject(config);

  if (!project) {
    throw new Error("Cannot read the authored registry TypeScript project");
  }

  const entries = registry.items.flatMap((item) =>
    [item.name, ...(groupedEntries[item.name] ?? [])].map((name) => {
      const file = item.files.find(
        (entry) =>
          path.basename(entry.path).replace(/\.tsx?$/u, "") === name &&
          /\.tsx?$/u.test(entry.path)
      );

      if (!file) {
        throw new Error(
          `${name}: registry item ${item.name} has no public entry source`
        );
      }

      return { file, name, registryItem: item.name };
    })
  );

  const publicExports = async ({ file, name }: (typeof entries)[number]) => {
    const source = await project.program.getSourceFile(
      path.resolve(webRoot, file.path)
    );

    const entryModule = source
      ? await project.checker.getSymbolAtLocation(source)
      : undefined;

    if (!entryModule) {
      throw new Error(`${name}: cannot resolve the public entry module`);
    }

    const moduleExports = await project.checker.getExportsOfModule(entryModule);
    const exports = moduleExports.map((symbol) => symbol.name);

    exports.sort();

    if (!exports.length) {
      throw new Error(`${name}: no public exports in the registry entry`);
    }

    return exports;
  };

  const resolved = await Promise.all(entries.map(publicExports));

  for (const [index, { name, registryItem }] of entries.entries()) {
    symbols[name] = { exports: resolved[index], registryItem };
  }

  await snapshot.dispose();
} finally {
  await api.close();
}

await mkdir(path.resolve(webRoot, ".source"), { recursive: true });

await writeFile(
  path.resolve(webRoot, ".source/component-symbols.json"),
  `${JSON.stringify(symbols, null, 2)}\n`
);

console.log(
  `Registry symbol metadata: ${Object.keys(symbols).length} public entry modules`
);
