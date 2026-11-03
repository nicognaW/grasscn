import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, lstat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { repoRoot, webRoot } from "@tests/paths";
import { packageBin } from "@tests/tooling";

import { installedDependencyIdentity } from "./dependency-identity.ts";
import { serveOwnedHttpProcess } from "./owned-http-process";
import { parseProductionIdentity } from "./verification-types.ts";

/** @typedef {import("./verification-types.ts").SourceIdentity} SourceIdentity */
/** @typedef {import("./verification-types.ts").FileIdentity} FileIdentity */
/** @typedef {import("./verification-types.ts").ProductionIdentity} ProductionIdentity */
/** @typedef {{source?: SourceIdentity, directory?: string, root?: string, receiptPath?: string, verifiedCommand?: string[], verifiedExitCode?: number}} BuildOptions */

/** @param {string | Uint8Array} value - Verification input. */
const digest = (value) => createHash("sha256").update(value).digest("hex");

/** @param {string} [directory] - Verification input. */
export const sourceIdentity = async (directory = repoRoot) => {
  /** @param {string[]} args - Verification input. */
  const git = (args) =>
    execFileSync("git", args, {
      cwd: directory,
      encoding: "utf-8",
      maxBuffer: 32 * 1024 * 1024,
    }).trim();

  const files = [
    ...new Set(
      git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
        .split("\0")
        .filter(Boolean)
    ),
  ];

  files.sort();

  const hash = createHash("sha256");

  for (const file of files) {
    let bytes;

    try {
      bytes = await readFile(path.join(directory, file));
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ENOENT")
      ) {
        throw error;
      }

      bytes = Buffer.from("<deleted>");
    }

    hash.update(file).update("\0").update(digest(bytes)).update("\0");
  }

  return {
    commit: git(["rev-parse", "HEAD"]),
    status: git(["status", "--porcelain=v1"]),
    treeSha256: hash.digest("hex"),
  };
};

/**
 * @param {{directory?: string, source?: SourceIdentity}} [options] - Verification input.
 * @returns {Promise<ProductionIdentity>} The bound production output.
 */
export const productionBuildIdentity = async ({
  directory = webRoot,
  source,
} = {}) => {
  assert.ok(
    source !== undefined &&
      source.commit.length > 0 &&
      source.treeSha256.length > 0,
    "Production build needs source identity"
  );
  /** @type {FileIdentity[]} */
  const files = [];

  /** @param {string} folder - Verification input. */
  const visit = async (folder) => {
    const entries = await readdir(folder);
    entries.sort();

    for (const name of entries) {
      const file = path.join(folder, name);
      const relative = path.relative(directory, file).replaceAll(path.sep, "/");

      if (
        relative === ".next/cache" ||
        relative === ".next/server/route-cache" ||
        relative === ".next/dev" ||
        relative === ".next/trace" ||
        relative === ".next/trace-build"
      ) {
        continue;
      }

      const info = await lstat(file);
      assert.ok(
        !info.isSymbolicLink(),
        "Production output cannot contain symlinks"
      );

      if (info.isDirectory()) {
        await visit(file);
      } else {
        files.push({ path: relative, sha256: digest(await readFile(file)) });
      }
    }
  };

  const buildIdContents = await readFile(
    path.join(directory, ".next/BUILD_ID"),
    "utf-8"
  );

  const buildId = buildIdContents.trim();

  assert.ok(buildId, "Missing Next production build ID");
  await visit(path.join(directory, ".next"));
  await visit(path.join(directory, "public/r"));

  return {
    buildId,
    files,
    outputSha256: digest(JSON.stringify(files)),
    source,
  };
};

/**
 * @param {ProductionIdentity} identity - Recorded build source.
 * @param {SourceIdentity} source - Current source snapshot.
 */
export const assertProductionSource = (identity, source) => {
  assert.ok(
    identity?.source?.commit === source?.commit &&
      identity?.source?.treeSha256 === source?.treeSha256,
    "Production build source does not match current snapshot"
  );
};

const receipt = path.join(
  repoRoot,
  "test-results",
  "next-production-build.json"
);

/**
 * @param {string} root - Installed workspace root.
 * @param {string} directory - Generated web root.
 */
const preparationIdentity = async (root, directory) => {
  const dependencies = installedDependencyIdentity(root);
  assert.ok(
    dependencies,
    "Prepared production requires installed dependency bytes"
  );
  /** @type {FileIdentity[]} */
  const generated = [];

  /** @param {string} folder - Verification input. */
  const visit = async (folder) => {
    const entries = await readdir(folder);
    entries.sort();

    for (const name of entries) {
      const filename = path.join(folder, name);
      const info = await lstat(filename);

      assert.ok(
        !info.isSymbolicLink(),
        "Generated inputs cannot contain symlinks"
      );

      if (info.isDirectory()) {
        await visit(filename);
      } else {
        generated.push({
          path: path.relative(directory, filename).replaceAll(path.sep, "/"),
          sha256: digest(await readFile(filename)),
        });
      }
    }
  };

  await visit(path.join(directory, ".source"));
  await visit(path.join(directory, ".next/types"));
  generated.push({
    path: "next-env.d.ts",
    sha256: digest(await readFile(path.join(directory, "next-env.d.ts"))),
  });
  const resolved = Intl.DateTimeFormat().resolvedOptions();

  return {
    completed: true,
    dependencies,
    environment: {
      arch: process.arch,
      bun: Bun.version,
      bunOptionsSha256: digest(process.env.BUN_OPTIONS ?? ""),
      locale: resolved.locale,
      platform: process.platform,
      timeZone: resolved.timeZone,
    },
    generated,
  };
};

/**
 * @param {unknown} command - Recorded build command.
 * @param {string} root - Workspace owning the build command.
 */
const verifiedRootBuildCommand = (command, root) => {
  if (!Array.isArray(command) || command[0] !== process.execPath) {
    return false;
  }

  let remaining;

  if (command[1] === "run" && command[2] === "build") {
    remaining = command.slice(3);
  } else if (
    command[2] === "run" &&
    command[3] === "build" &&
    command[1] === packageBin("turbo", "turbo", root)
  ) {
    remaining = command.slice(4);
  } else {
    return false;
  }

  return (
    remaining.length === 0 ||
    (remaining.length === 1 && remaining[0] === "--concurrency=1")
  );
};

/** @param {BuildOptions} [options] - Verification input. */
export const stampProductionBuild = async (options = {}) => {
  const source = options.source ?? (await sourceIdentity());

  const directory = options.directory ?? webRoot;
  const root = options.root ?? repoRoot;

  const identity = await productionBuildIdentity({ directory, source });

  // Callers supply this only after observing the completed build command's exit0.
  if (options.verifiedCommand) {
    assert.equal(
      options.verifiedExitCode,
      0,
      "Prepared production requires a completed build with exit0"
    );
    assert.ok(
      verifiedRootBuildCommand(options.verifiedCommand, root),
      "A completed root build command is required; dry runs cannot prepare production"
    );
    identity.verifiedCommand = options.verifiedCommand;
    identity.verifiedExitCode = options.verifiedExitCode;
    identity.preparation = await preparationIdentity(root, directory);
  }

  const destination = options.receiptPath ?? receipt;
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(identity, null, 2)}\n`);

  return identity;
};

/** Reuse a completed build only through the exact frozen production boundary. */
/** @param {BuildOptions} [options] - Verification input. */
export const readPreparedProductionBuild = async (options = {}) => {
  const source = options.source ?? (await sourceIdentity());

  const identity = parseProductionIdentity(
    await readFile(options.receiptPath ?? receipt, "utf-8")
  );

  assertProductionSource(identity, source);
  assert.ok(
    identity.preparation?.completed === true &&
      verifiedRootBuildCommand(
        identity.verifiedCommand,
        options.root ?? repoRoot
      ) &&
      identity.verifiedExitCode === 0,
    "Production receipt does not prove a completed build"
  );
  const directory = options.directory ?? webRoot;
  const actualOutput = await productionBuildIdentity({ directory, source });
  assert.equal(
    actualOutput.outputSha256,
    identity.outputSha256,
    "Prepared production output changed"
  );
  assert.deepEqual(
    await preparationIdentity(options.root ?? repoRoot, directory),
    identity.preparation,
    "Prepared production dependencies, generated inputs or environment changed"
  );

  return identity;
};

/** @param {{port?: number, expectedSource?: SourceIdentity, startupTimeout?: number}} [options] - Verification input. */
export const serveNextProduction = async ({
  port = 5176,
  expectedSource,
  startupTimeout = 120_000,
} = {}) => {
  const source = expectedSource ?? (await sourceIdentity());

  const identity = parseProductionIdentity(await readFile(receipt, "utf-8"));

  assertProductionSource(identity, source);
  const actual = await productionBuildIdentity({ source });
  assert.equal(
    actual.outputSha256,
    identity.outputSha256,
    "Production output changed after build receipt"
  );
  // Listen-probe first: Next must never silently reuse a foreground process.
  const { createServer } = await import("node:net");
  const probe = createServer();
  // eslint-disable-next-line promise/avoid-new -- Bridge the owned process or server callback events into an awaited lifecycle step.
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(port, "127.0.0.1", resolve);
  });
  // eslint-disable-next-line promise/avoid-new -- Bridge the owned process or server callback events into an awaited lifecycle step.
  await new Promise((resolve) => {
    probe.close(resolve);
  });

  const server = await serveOwnedHttpProcess({
    args: [
      "--bun",
      packageBin("next", "next", webRoot),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    cwd: webRoot,
    env: {
      ...process.env,
      GOMEMLIMIT: process.env.GOMEMLIMIT ?? "768MiB",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    label: "Bun Next production server",
    port,
    readyText: "Ready in",
    startupTimeout,
  });

  return {
    close: server.close,
    identity: {
      ...identity,
      bun: Bun.version,
      pid: server.pid,
      runtime: process.execPath,
    },
    url: server.url,
  };
};
