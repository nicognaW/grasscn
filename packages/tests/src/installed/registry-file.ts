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

const hasTargetText = (
  target: InstalledRegistryEntry["target"]
): target is string => (target?.length ?? 0) > 0;

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

  let target: string;

  const placeholder =
    /^@(?<alias>components|ui|hooks|lib)\/(?<filename>.+)$/u.exec(
      entry.target ?? ""
    );

  if (placeholder) {
    // SAFETY: the matched alias group contains exactly the four settings keys enumerated by this regex.
    const alias =
      settings.aliases[
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The matched regex alternatives are exactly these four settings keys.
        placeholder[1] as keyof InstalledComponentSettings["aliases"]
      ];

    assert.ok(alias, `Missing ${placeholder[1]} alias`);
    target = path.resolve(
      sourceRoot,
      alias.replace(/^[@~]\//u, ""),
      placeholder[2]
    );
  } else if (hasTargetText(entry.target)) {
    target = path.resolve(root, entry.target.replace(/^~\//u, ""));
  } else {
    let selectedKind: "hooks" | "lib" | "ui";

    if (entry.type === "registry:hook") {
      selectedKind = "hooks";
    } else if (entry.type === "registry:lib") {
      selectedKind = "lib";
    } else {
      selectedKind = "ui";
    }

    const kind = selectedKind;

    const directory =
      kind === "ui"
        ? ui
        : path.resolve(
            sourceRoot,
            settings.aliases[kind].replace(/^[@~]\//u, "")
          );

    target = path.join(
      directory,
      path.basename(
        // SAFETY: registry file producers provide the source path; valid target-only entries are resolved by the branches above.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The fallback requires its producer's path, preserving existing invalid-input failure behavior.
        entry.path as string
      )
    );
  }

  assert.ok(
    target.startsWith(root + path.sep),
    "Installed registry file must stay inside the consumer"
  );

  return target;
};
