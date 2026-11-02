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
} from "./consumer-metadata.ts";

/** @param {import("node:crypto").BinaryLike} bytes - Exact bytes to hash. */
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

/** @param {string} child @param {string} parent */
const within = (child, parent) => {
  const relative = path.relative(parent, child);

  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
};

/** @param {string} project @param {string[]} excludedRoots */
export const assertExternalProject = async (project, excludedRoots) => {
  const resolved = await realpath(project);

  for (const root of excludedRoots) {
    // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- Resolve one physical dependency or file at a time to bound filesystem handles and preserve rejection order.
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
export const consumerEnvironment = (environment = process.env) => ({
  ...environment,
  CI: "true",
  NEXT_TELEMETRY_DISABLED: "1",
  NODE_PATH: "",
  SHADCN_TELEMETRY_DISABLED: "1",
});

/** @param {number} port - Required unoccupied loopback port. */
export const assertConsumerPortAvailable = async (port) => {
  const probe = createServer();
  // oxlint-disable-next-line promise/avoid-new -- Bridge the callback-only net.Server lifecycle without leaving an occupied test port.
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(port, "127.0.0.1", () => {
      resolve(undefined);
    });
  });
  // oxlint-disable-next-line promise/avoid-new -- Bridge the callback-only net.Server lifecycle without leaving an occupied test port.
  await new Promise((resolve, reject) => {
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
export const assertIndependentDependencies = async (project) => {
  const consumer = await realpath(project);

  /** @type {unknown} */
  const packageData = JSON.parse(
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
      // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- Resolve one physical dependency or file at a time to bound filesystem handles and preserve rejection order.
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
  const identities = {};

  for (const name of Object.keys({
    ...dependencies,
    ...devDependencies,
  }).toSorted()) {
    let resolved;

    try {
      resolved = require.resolve(`${name}/package.json`);
    } catch {
      resolved = require.resolve(name);
    }

    // oxlint-disable-next-line eslint/no-await-in-loop -- Resolve one physical dependency or file at a time to bound filesystem handles and preserve rejection order.
    const physical = await realpath(resolved);
    assert.ok(
      within(physical, ownedModules),
      `${name} must resolve through consumer's own node_modules, received ${physical}`
    );
    let directory = path.dirname(physical);

    while (within(directory, ownedModules)) {
      try {
        // oxlint-disable-next-line eslint/no-await-in-loop -- Resolve one physical dependency or file at a time to bound filesystem handles and preserve rejection order.
        const bytes = await readFile(path.join(directory, "package.json"));
        /** @type {unknown} */
        const installed = JSON.parse(bytes.toString("utf-8"));

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
  directory,
  skipped = new Set(["node_modules", ".next", "dist", ".git"])
) => {
  /** @type {Record<string,string>} */
  const files = {};

  /** @param {string} relative @returns {Promise<void>} */
  const visit = async (relative) => {
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
        // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- Resolve one physical dependency or file at a time to bound filesystem handles and preserve rejection order.
        await visit(filename);
      } else if (entry.isFile()) {
        files[filename.replaceAll(path.sep, "/")] = sha256(
          // oxlint-disable-next-line eslint/no-await-in-loop -- Resolve one physical dependency or file at a time to bound filesystem handles and preserve rejection order.
          await readFile(path.join(directory, filename))
        );
      }
    }
  };

  await visit("");

  return {
    files,
    sha256: sha256(
      JSON.stringify(
        Object.entries(files).toSorted(([first], [second]) => {
          if (first < second) {
            return -1;
          }

          return Number(first > second);
        })
      )
    ),
  };
};
