import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, realpath, readdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import path from "node:path";

export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const within = (child, parent) => {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
};

export async function assertExternalProject(project, excludedRoots) {
  const resolved = await realpath(project);
  for (const root of excludedRoots) {
    const excluded = await realpath(root);
    assert(
      !within(resolved, excluded) && !within(excluded, resolved),
      "Consumer must be physically outside the repository/workspace and its ancestors"
    );
  }
  assert(
    !within(resolved, await realpath(process.cwd())),
    "Consumer must be outside current source workspace"
  );
  return resolved;
}

export function consumerEnvironment(environment = process.env) {
  return {
    ...environment,
    NODE_PATH: "",
    NEXT_TELEMETRY_DISABLED: "1",
    SHADCN_TELEMETRY_DISABLED: "1",
    CI: "true",
  };
}

export async function assertConsumerPortAvailable(port) {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(port, "127.0.0.1", resolve);
  });
  await new Promise((resolve) => probe.close(resolve));
}

export async function assertIndependentDependencies(project) {
  const consumer = await realpath(project);
  const packageData = JSON.parse(
    await readFile(path.join(consumer, "package.json"), "utf8")
  );
  const require = createRequire(path.join(consumer, "package.json"));
  const ownedModules = path.join(consumer, "node_modules");
  for (
    let ancestor = path.dirname(consumer);
    ;
    ancestor = path.dirname(ancestor)
  ) {
    let ancestorModules = false;
    try {
      ancestorModules = (
        await stat(path.join(ancestor, "node_modules"))
      ).isDirectory();
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    assert(
      !ancestorModules,
      "Consumer must use its own node_modules without ancestor module fallback"
    );
    if (path.dirname(ancestor) === ancestor) break;
  }
  const identities = {};
  for (const name of Object.keys({
    ...packageData.dependencies,
    ...packageData.devDependencies,
  }).sort()) {
    let resolved;
    try {
      resolved = require.resolve(`${name}/package.json`);
    } catch {
      resolved = require.resolve(name);
    }
    const physical = await realpath(resolved);
    assert(
      within(physical, ownedModules),
      `${name} must resolve through consumer's own node_modules, received ${physical}`
    );
    let directory = path.dirname(physical);
    while (within(directory, ownedModules)) {
      try {
        const bytes = await readFile(path.join(directory, "package.json"));
        const installed = JSON.parse(bytes);
        if (installed.name === name) {
          identities[name] = {
            path: physical,
            version: installed.version,
            packageSha256: sha256(bytes),
          };
          break;
        }
      } catch {}
      directory = path.dirname(directory);
    }
    assert(identities[name], `Installed package identity unavailable: ${name}`);
  }
  return identities;
}

export async function directoryIdentity(
  directory,
  skipped = new Set(["node_modules", ".next", "dist", ".git"])
) {
  const files = {};
  async function visit(relative) {
    for (const entry of await readdir(path.join(directory, relative), {
      withFileTypes: true,
    })) {
      if (skipped.has(entry.name)) continue;
      const filename = path.join(relative, entry.name);
      assert(
        !entry.isSymbolicLink(),
        `Consumer identity excludes symlink inputs: ${filename}`
      );
      if (entry.isDirectory()) await visit(filename);
      else if (entry.isFile())
        files[filename.replaceAll(path.sep, "/")] = sha256(
          await readFile(path.join(directory, filename))
        );
    }
  }
  await visit("");
  return {
    sha256: sha256(JSON.stringify(Object.entries(files).sort())),
    files,
  };
}
