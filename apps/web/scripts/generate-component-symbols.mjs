import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { API } from "typescript/unstable/sync";

import groups from "../component-groups.json" with { type: "json" };
import registry from "../registry.json" with { type: "json" };

// This is registry API metadata, not a second documentation/content index.
const webRoot = fileURLToPath(new URL("../", import.meta.url));
const config = path.resolve(webRoot, "tsconfig.json");

/** @type {Record<string,string[]>} */
const groupedEntries = groups;
const api = new API({ cwd: webRoot });

/** @type {Record<string,{registryItem:string,exports:string[]}>} */
const symbols = {};

try {
  const snapshot = api.updateSnapshot({ openProjects: [config] });
  const project = snapshot.getProject(config);

  if (!project) {
    throw new Error("Cannot read the authored registry TypeScript project");
  }

  for (const item of registry.items) {
    for (const name of [item.name, ...(groupedEntries[item.name] ?? [])]) {
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

      const source = project.program.getSourceFile(
        path.resolve(webRoot, file.path)
      );

      const entryModule = source && project.checker.getSymbolAtLocation(source);

      if (!entryModule) {
        throw new Error(`${name}: cannot resolve the public entry module`);
      }

      const exports = project.checker
        .getExportsOfModule(entryModule)
        .map((symbol) => symbol.name)
        .toSorted();

      if (!exports.length) {
        throw new Error(`${name}: no public exports in the registry entry`);
      }

      symbols[name] = { exports, registryItem: item.name };
    }
  }

  snapshot.dispose();
} finally {
  api.close();
}

await mkdir(path.resolve(webRoot, ".source"), { recursive: true });

await writeFile(
  path.resolve(webRoot, ".source/component-symbols.json"),
  `${JSON.stringify(symbols, null, 2)}\n`
);

console.log(
  `Registry symbol metadata: ${Object.keys(symbols).length} public entry modules`
);
