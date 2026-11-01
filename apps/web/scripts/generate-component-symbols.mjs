import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { API } from "typescript/unstable/sync";

// This is registry API metadata, not a second documentation/content index.
const webRoot = fileURLToPath(new URL("../", import.meta.url));
const registry = JSON.parse(
  await readFile(resolve(webRoot, "registry.json"), "utf8")
);
const groups = JSON.parse(
  await readFile(resolve(webRoot, "component-groups.json"), "utf8")
);
const config = resolve(webRoot, "tsconfig.json");
const api = new API({ cwd: webRoot });
const symbols = {};
try {
  const snapshot = api.updateSnapshot({ openProjects: [config] });
  const project = snapshot.getProject(config);
  if (!project)
    throw new Error("Cannot read the authored registry TypeScript project");
  for (const item of registry.items) {
    for (const name of [item.name, ...(groups[item.name] ?? [])]) {
      const file = item.files.find(
        (file) =>
          basename(file.path).replace(/\.tsx?$/, "") === name &&
          /\.tsx?$/.test(file.path)
      );
      if (!file)
        throw new Error(
          `${name}: registry item ${item.name} has no public entry source`
        );
      const source = project.program.getSourceFile(resolve(webRoot, file.path));
      const module = source && project.checker.getSymbolAtLocation(source);
      if (!module)
        throw new Error(`${name}: cannot resolve the public entry module`);
      const exports = project.checker
        .getExportsOfModule(module)
        .map((symbol) => symbol.name)
        .sort();
      if (!exports.length)
        throw new Error(`${name}: no public exports in the registry entry`);
      symbols[name] = { registryItem: item.name, exports };
    }
  }
  snapshot.dispose();
} finally {
  api.close();
}
await mkdir(resolve(webRoot, ".source"), { recursive: true });
await writeFile(
  resolve(webRoot, ".source/component-symbols.json"),
  `${JSON.stringify(symbols, null, 2)}\n`
);
console.log(
  `Registry symbol metadata: ${Object.keys(symbols).length} public entry modules`
);
