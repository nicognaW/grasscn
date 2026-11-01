import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { webRoot } from "@tests/paths";

// Test selection metadata only. Fumadocs remains the sole documentation renderer,
// page-tree, heading and search owner; no body or navigation is generated here.
export function documentationInventory(root = webRoot) {
  const registry = JSON.parse(
    readFileSync(path.join(root, "registry.json"), "utf8")
  );
  const groups = JSON.parse(
    readFileSync(path.join(root, "component-groups.json"), "utf8")
  );
  const owners = new Map(registry.items.map((item) => [item.name, item.name]));
  for (const [owner, names] of Object.entries(groups))
    for (const name of names) owners.set(name, owner);
  const directory = path.join(root, "content/docs/components");
  const pages = readdirSync(directory)
    .filter((file) => file.endsWith(".mdx"))
    .sort()
    .map((file) => {
      const name = file.slice(0, -4);
      const text = readFileSync(path.join(directory, file), "utf8");
      const title = /^title:\s*(.+)$/m
        .exec(text)?.[1]
        ?.replace(/^['"]|['"]$/g, "");
      if (!title) throw Error(`${name}: authored canonical page has no title`);
      if (!owners.has(name))
        throw Error(`${name}: canonical page has no registry owner`);
      return {
        name,
        title,
        route: `/docs/components/${name}`,
        registryItem: owners.get(name),
        playground: /<\w*Playground\b/.test(text),
      };
    });
  for (const name of owners.keys())
    if (!pages.some((page) => page.name === name))
      throw Error(`${name}: missing canonical documentation page`);
  return {
    pages,
    playgrounds: pages.filter((page) => page.playground),
    items: registry.items.map((item) => item.name).sort(),
  };
}
