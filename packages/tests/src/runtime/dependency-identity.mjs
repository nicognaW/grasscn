import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

// A lock identifies intended dependencies; installed bytes identify what ran.
// Generated tool caches are excluded because running a check may update them.
export function installedDependencyIdentity(root) {
  const lock = path.join(root, "bun.lock"),
    modules = path.join(root, "node_modules");
  if (!fs.existsSync(lock) || !fs.existsSync(modules)) return null;
  const hash = createHash("sha256"),
    seen = new Set();
  let files = 0;
  function visit(file, relative) {
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
      )
        return;
      if (seen.has(actual)) return;
      seen.add(actual);
      return visit(actual, relative);
    }
    if (info.isDirectory()) {
      for (const name of fs.readdirSync(file).sort()) {
        if ([".cache", ".vite", ".bin", ".package-lock.json"].includes(name))
          continue;
        visit(path.join(file, name), path.join(relative, name));
      }
    } else if (info.isFile()) {
      hash
        .update(relative)
        .update("\0")
        .update(digest(fs.readFileSync(file)))
        .update("\0");
      files++;
    }
  }
  visit(modules, "node_modules");
  const workspaces =
    Bun.JSON5.parse(fs.readFileSync(lock, "utf8")).workspaces ?? {};
  for (const workspace of Object.keys(workspaces).sort()) {
    if (!workspace) continue;
    const localModules = path.join(root, workspace, "node_modules");
    if (fs.existsSync(localModules))
      visit(localModules, path.join(workspace, "node_modules"));
  }
  if (!files) return null;
  return {
    bun: Bun.version,
    bunOptionsSha256: digest(process.env.BUN_OPTIONS ?? ""),
    lockSha256: digest(fs.readFileSync(lock)),
    installedSha256: hash.digest("hex"),
    files,
  };
}
