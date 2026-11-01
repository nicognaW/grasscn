import { expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { documentationInventory } from "../scripts/documentation-inventory.mjs";

test("documentation inventory rejects an installable item without a canonical authored page", () => {
  const root = mkdtempSync(path.join(tmpdir(), "grasscn-doc-inventory-"));
  try {
    mkdirSync(path.join(root, "content/docs/components"), { recursive: true });
    writeFileSync(path.join(root, "registry.json"), JSON.stringify({ items: [{ name: "button" }] }));
    writeFileSync(path.join(root, "component-groups.json"), "{}");
    expect(() => documentationInventory(root)).toThrow("button");
    writeFileSync(path.join(root, "content/docs/components/button.mdx"), "---\ntitle: Button\n---\n<ButtonPlayground />\n");
    expect(documentationInventory(root).pages).toEqual([{ name: "button", title: "Button", route: "/docs/components/button", registryItem: "button", playground: true }]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
