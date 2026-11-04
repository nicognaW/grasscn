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
  const [projectPath, ...excludedPaths] = await Promise.allSettled(
    [project, ...excludedRoots].map(async (root) => await realpath(root))
  );

  if (projectPath.status === "rejected") {
    throw projectPath.reason;
  }

  const resolved = projectPath.value;

  for (const excludedPath of excludedPaths) {
    if (excludedPath.status === "rejected") {
      throw excludedPath.reason;
    }

    const excluded = excludedPath.value;
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

  const ancestorPaths: string[] = [];

  for (
    let ancestor = path.dirname(consumer);
    ;
    ancestor = path.dirname(ancestor)
  ) {
    ancestorPaths.push(ancestor);

    if (path.dirname(ancestor) === ancestor) {
      break;
    }
  }

  const ancestorInputs = await Promise.allSettled(
    ancestorPaths.map(async (ancestor) => {
      let ancestorModules = false;

      try {
        const ancestorStat = await stat(path.join(ancestor, "node_modules"));
        ancestorModules = ancestorStat.isDirectory();
      } catch (error) {
        if (!isMissingFileError(error)) {
          throw error;
        }
      }

      return ancestorModules;
    })
  );

  for (const ancestorInput of ancestorInputs) {
    if (ancestorInput.status === "rejected") {
      throw ancestorInput.reason;
    }

    assert.ok(
      !ancestorInput.value,
      "Consumer must use its own node_modules without ancestor module fallback"
    );
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

  const dependencyInputs = await Promise.allSettled(
    sortedDependencyNames.map(async (name) => {
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
      const metadataFiles: string[] = [];
      let directory = path.dirname(physical);

      while (within(directory, ownedModules)) {
        metadataFiles.push(path.join(directory, "package.json"));
        directory = path.dirname(directory);
      }

      const metadataInputs = await Promise.all(
        metadataFiles.map(async (file) => {
          try {
            const bytes = await readFile(file);
            /** @type {unknown} */
            const installed: unknown = JSON.parse(bytes.toString("utf-8"));

            if (isInstalledMetadata(installed) && installed.name === name) {
              return {
                packageSha256: sha256(bytes),
                path: physical,
                version: installed.version,
              };
            }
          } catch {
            /* Missing candidates are expected while walking package/import resolution. */
          }
        })
      );

      const identity = metadataInputs.find((input) => input !== undefined);

      return { identity, name };
    })
  );

  for (const dependencyInput of dependencyInputs) {
    if (dependencyInput.status === "rejected") {
      throw dependencyInput.reason;
    }

    const { identity, name } = dependencyInput.value;

    if (identity !== undefined) {
      identities[name] = identity;
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

  type DirectoryFileIdentity = [file: string, sha256: string];

  /** @param relative - Source-relative directory; results retain depth-first order. */
  const visit = async (relative: string): Promise<DirectoryFileIdentity[]> => {
    const entries = await readdir(path.join(directory, relative), {
      withFileTypes: true,
    });

    const inputs = await Promise.allSettled(
      entries.map(async (entry): Promise<DirectoryFileIdentity[]> => {
        if (skipped.has(entry.name)) {
          return [];
        }

        const filename = path.join(relative, entry.name);
        assert.ok(
          !entry.isSymbolicLink(),
          `Consumer identity excludes symlink inputs: ${filename}`
        );

        if (entry.isDirectory()) {
          return await visit(filename);
        }

        if (entry.isFile()) {
          return [
            [
              filename.replaceAll(path.sep, "/"),
              sha256(await readFile(path.join(directory, filename))),
            ],
          ];
        }

        return [];
      })
    );

    const collected: DirectoryFileIdentity[] = [];

    for (const input of inputs) {
      if (input.status === "rejected") {
        throw input.reason;
      }

      for (const file of input.value) {
        collected.push(file);
      }
    }

    return collected;
  };

  for (const [filename, digest] of await visit("")) {
    files[filename] = digest;
  }

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
