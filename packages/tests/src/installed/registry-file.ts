import assert from "node:assert/strict";
import path from "node:path";

export interface InstalledRegistryEntry {
  path?: string;
  target?: string;
  type?: string;
}

export interface InstalledComponentSettings {
  aliases: { components: string; hooks: string; lib: string; ui: string };
}

// Resolve CLI target placeholders using the fixture's configured UI location.
export const installedRegistryFile = function installedRegistryFile(
  entry: InstalledRegistryEntry,
  consumer: string,
  settings: InstalledComponentSettings,
  uiDirectory = "src/components/ui"
) {
  const root = path.resolve(consumer);
  const uiAlias = settings.aliases.ui.replace(/^[@~]\//u, "");
  const ui = path.resolve(root, uiDirectory);
  assert.ok(
    ui.endsWith(path.normalize(uiAlias)),
    "UI directory must agree with components.json"
  );
  const sourceRoot = ui.slice(0, -path.normalize(uiAlias).length);

  const aliases: Record<string, keyof InstalledComponentSettings["aliases"]> = {
    components: "components",
    hooks: "hooks",
    lib: "lib",
    ui: "ui",
  };

  let target: string;

  const placeholder =
    /^@(?<alias>components|ui|hooks|lib)\/(?<filename>.+)$/u.exec(
      entry.target ?? ""
    );

  if (placeholder) {
    const alias = settings.aliases[aliases[placeholder[1]]];
    assert.ok(alias, `Missing ${placeholder[1]} alias`);
    target = path.resolve(
      sourceRoot,
      alias.replace(/^[@~]\//u, ""),
      placeholder[2]
    );
  } else if (entry.target) {
    target = path.resolve(root, entry.target.replace(/^~\//u, ""));
  } else {
    const kind =
      entry.type === "registry:hook"
        ? "hooks"
        : entry.type === "registry:lib"
          ? "lib"
          : "ui";

    const directory =
      kind === "ui"
        ? ui
        : path.resolve(
            sourceRoot,
            settings.aliases[kind].replace(/^[@~]\//u, "")
          );

    target = path.join(directory, path.basename((entry.path)!));
  }

  assert.ok(
    target.startsWith(root + path.sep),
    "Installed registry file must stay inside the consumer"
  );

  return target;
};
