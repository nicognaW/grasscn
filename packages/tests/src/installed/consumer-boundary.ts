import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, realpath, readdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import path from "node:path";

import {
  isPackageMetadata,
  isInstalledMetadata,
  isMissingFileError,
} from "./consumer-metadata";
import type { DirectoryIdentity } from "./consumer-validation-types";

/** @param bytes - Input accepted by the owned hash-update SDK. */
export const sha256 = (
  bytes: Parameters<ReturnType<typeof createHash>["update"]>[0]
) => createHash("sha256").update(bytes).digest("hex");

/** @param {string} child @param {string} parent */
const within = (child: string, parent: string) => {
  const relative = path.relative(parent, child);

  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
};

/** @param {string} project @param {string[]} excludedRoots */
export const assertExternalProject = async (
  project: string,
  excludedRoots: string[]
) => {
  const resolved = await realpath(project);

  for (const root of excludedRoots) {
    const excluded = await realpath(root);
    assert.ok(
      !within(resolved, excluded) && !within(excluded, resolved),
      "Consumer must be physically outside the repository/workspace and its ancestors"
    );
  }

  assert.ok(
    !within(resolved, await realpath(process.cwd())),
    "Consumer must be outside current source workspace"
  );

  return resolved;
};

/** @param {NodeJS.ProcessEnv} [environment] @returns {NodeJS.ProcessEnv} */
export const consumerEnvironment = (
  environment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv => ({
  ...environment,
  CI: "true",
  NEXT_TELEMETRY_DISABLED: "1",
  NODE_PATH: "",
  SHADCN_TELEMETRY_DISABLED: "1",
});

/** @param {number} port - Required unoccupied loopback port. */
export const assertConsumerPortAvailable = async (port: number) => {
  const probe = createServer();
  // oxlint-disable-next-line promise/avoid-new -- Bridge the callback-only net.Server lifecycle without leaving an occupied test port.
  await new Promise<void>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(port, "127.0.0.1", () => {
      resolve(undefined);
    });
  });
  // oxlint-disable-next-line promise/avoid-new -- Bridge the callback-only net.Server lifecycle without leaving an occupied test port.
  await new Promise<void>((resolve, reject) => {
    probe.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve(undefined);
      }
    });
  });
};

/** @param {string} project @returns {Promise<Record<string, {path: string, version: string, packageSha256: string}>>} */
export const assertIndependentDependencies = async (project: string) => {
  const consumer = await realpath(project);

  /** @type {unknown} */
  const packageData: unknown = JSON.parse(
    await readFile(path.join(consumer, "package.json"), "utf-8")
  );

  assert.ok(
    isPackageMetadata(packageData),
    "Consumer package dependencies must map package names to versions"
  );
  const { dependencies, devDependencies } = packageData;
  const require = createRequire(path.join(consumer, "package.json"));
  const ownedModules = path.join(consumer, "node_modules");

  for (
    let ancestor = path.dirname(consumer);
    ;
    ancestor = path.dirname(ancestor)
  ) {
    let ancestorModules = false;

    try {
      const ancestorStat = await stat(path.join(ancestor, "node_modules"));
      ancestorModules = ancestorStat.isDirectory();
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
    }

    assert.ok(
      !ancestorModules,
      "Consumer must use its own node_modules without ancestor module fallback"
    );

    if (path.dirname(ancestor) === ancestor) {
      break;
    }
  }

  /** @type {Record<string, {path: string, version: string, packageSha256: string}>} */
  const identities: Record<
    string,
    { path: string; version: string; packageSha256: string }
  > = {};

  const sortedDependencyNames = Object.keys({
    ...dependencies,
    ...devDependencies,
  });

  sortedDependencyNames.sort();

  for (const name of sortedDependencyNames) {
    let resolved;

    try {
      resolved = require.resolve(`${name}/package.json`);
    } catch {
      resolved = require.resolve(name);
    }

    const physical = await realpath(resolved);
    assert.ok(
      within(physical, ownedModules),
      `${name} must resolve through consumer's own node_modules, received ${physical}`
    );
    let directory = path.dirname(physical);

    while (within(directory, ownedModules)) {
      try {
        const bytes = await readFile(path.join(directory, "package.json"));
        /** @type {unknown} */
        const installed: unknown = JSON.parse(bytes.toString("utf-8"));

        if (isInstalledMetadata(installed) && installed.name === name) {
          identities[name] = {
            packageSha256: sha256(bytes),
            path: physical,
            version: installed.version,
          };
          break;
        }
      } catch {
        /* Missing candidates are expected while walking package/import resolution. */
      }

      directory = path.dirname(directory);
    }

    assert.ok(
      Object.hasOwn(identities, name),
      `Installed package identity unavailable: ${name}`
    );
  }

  return identities;
};

/** @param {string} directory @param {Set<string>} [skipped] @returns {Promise<{sha256: string, files: Record<string, string>}>} */
export const directoryIdentity = async (
  directory: string,
  skipped = new Set(["node_modules", ".next", "dist", ".git"])
): Promise<DirectoryIdentity> => {
  /** @type {Record<string,string>} */
  const files: DirectoryIdentity["files"] = {};

  /** @param {string} relative @returns {Promise<void>} */
  const visit = async (relative: string): Promise<void> => {
    for (const entry of await readdir(path.join(directory, relative), {
      withFileTypes: true,
    })) {
      if (skipped.has(entry.name)) {
        continue;
      }

      const filename = path.join(relative, entry.name);
      assert.ok(
        !entry.isSymbolicLink(),
        `Consumer identity excludes symlink inputs: ${filename}`
      );

      if (entry.isDirectory()) {
        await visit(filename);
      } else if (entry.isFile()) {
        files[filename.replaceAll(path.sep, "/")] = sha256(
          await readFile(path.join(directory, filename))
        );
      }
    }
  };

  await visit("");

  const sortedFiles = Object.entries(files);
  sortedFiles.sort(([first], [second]) => {
    if (first < second) {
      return -1;
    }

    return Number(first > second);
  });

  return {
    files,
    sha256: sha256(JSON.stringify(sortedFiles)),
  };
};
