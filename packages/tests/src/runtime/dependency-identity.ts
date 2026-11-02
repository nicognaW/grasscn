import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { version } from "bun";
import { workspaceNames } from "@tests/runtime/verification-types";

const digest = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

// A lock identifies intended dependencies; installed bytes identify what ran.
// Generated tool caches are excluded because running a check may update them.
export const installedDependencyIdentity = function installedDependencyIdentity(
  root: string
) {
  const lock = path.join(root, "bun.lock");
  const modules = path.join(root, "node_modules");

  if (!fs.existsSync(lock) || !fs.existsSync(modules)) {
    return null;
  }

  const hash = createHash("sha256");
  const seen = new Set<string>();

  let files = 0;

  const visit = function visit(file: string, relative: string) {
    const info = fs.lstatSync(file);

    if (info.isSymbolicLink()) {
      hash
        .update(relative)
        .update("\0")
        .update(fs.readlinkSync(file))
        .update("\0");
      // Workspace sources are already bound by the source snapshot.
      const actual = fs.realpathSync(file);

      if (
        actual.startsWith(path.resolve(root) + path.sep) &&
        !actual.startsWith(path.resolve(modules) + path.sep)
      ) {
        return;
      }

      if (seen.has(actual)) {
        return;
      }

      seen.add(actual);

      visit(actual, relative);

      return;
    }

    if (info.isDirectory()) {
      const nativeSortValues = fs.readdirSync(file);
      nativeSortValues.sort();
      for (const name of nativeSortValues) {
        if ([".cache", ".vite", ".bin", ".package-lock.json"].includes(name)) {
          continue;
        }

        visit(path.join(file, name), path.join(relative, name));
      }
    } else if (info.isFile()) {
      hash
        .update(relative)
        .update("\0")
        .update(digest(fs.readFileSync(file)))
        .update("\0");
      files += 1;
    }
  };

  visit(modules, "node_modules");

  const workspaces = workspaceNames(fs.readFileSync(lock, "utf-8"));
  workspaces.sort();

  for (const workspace of workspaces) {
    if (!workspace) {
      continue;
    }

    const localModules = path.join(root, workspace, "node_modules");

    if (fs.existsSync(localModules)) {
      visit(localModules, path.join(workspace, "node_modules"));
    }
  }

  if (!files) {
    return null;
  }

  return {
    bun: version,
    bunOptionsSha256: digest(process.env.BUN_OPTIONS ?? ""),
    files,
    installedSha256: hash.digest("hex"),
    lockSha256: digest(fs.readFileSync(lock)),
  };
};
