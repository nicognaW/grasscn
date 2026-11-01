import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, lstat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { repoRoot, webRoot, packageBin } from "@tests/paths";

import { installedDependencyIdentity } from "./dependency-identity.mjs";

/** @typedef {{commit: string, treeSha256: string, status?: string}} SourceIdentity */
/** @typedef {{path: string, sha256: string}} FileIdentity */
/** @typedef {{source: SourceIdentity, buildId: string, outputSha256: string, files: FileIdentity[], verifiedCommand?: string[], verifiedExitCode?: number, preparation?: Awaited<ReturnType<typeof preparationIdentity>>}} ProductionIdentity */
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
  ].toSorted();

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
    source?.commit && source?.treeSha256,
    "Production build needs source identity"
  );
  const files = [];

  /** @param {string} folder - Verification input. */
  const visit = async (folder) => {
    for (const name of (await readdir(folder)).toSorted()) {
      const file = path.join(folder, name);
      const relative = path.relative(directory, file).replaceAll(path.sep, "/");

      if (
        relative === ".next/cache" ||
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

  const buildId = (
    await readFile(path.join(directory, ".next/BUILD_ID"), "utf-8")
  ).trim();

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
  const generated = [];

  /** @param {string} folder - Verification input. */
  const visit = async (folder) => {
    for (const name of (await readdir(folder)).toSorted()) {
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

  const identity = JSON.parse(
    await readFile(options.receiptPath ?? receipt, "utf-8")
  );

  assertProductionSource(identity, source);
  assert.ok(
    identity.preparation?.completed &&
      verifiedRootBuildCommand(
        identity.verifiedCommand,
        options.root ?? repoRoot
      ) &&
      identity.verifiedExitCode === 0,
    "Production receipt does not prove a completed build"
  );
  const directory = options.directory ?? webRoot;
  assert.equal(
    (await productionBuildIdentity({ directory, source })).outputSha256,
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

  const identity = JSON.parse(await readFile(receipt, "utf-8"));

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
  await new Promise(
    /** @param {() => void} resolve - Verification input. */ (
      resolve,
      reject
    ) => {
      probe.once("error", reject);
      probe.listen(port, "127.0.0.1", resolve);
    }
  );
  await new Promise(
    /** @param {() => void} resolve - Verification input. */ (resolve) =>
      probe.close(resolve)
  );

  const child = spawn(
    process.execPath,
    [
      "--bun",
      packageBin("next", "next", webRoot),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: webRoot,
      env: {
        ...process.env,
        GOMEMLIMIT: process.env.GOMEMLIMIT ?? "768MiB",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  let failure;
  let logs = "";

  child.stdout.on("data", (value) => {
    logs += value;
    process.stdout.write(value);
  });
  child.stderr.on("data", (value) => {
    logs += value;
    process.stderr.write(value);
  });
  child.on("error", (error) => {
    failure = error;
  });
  const url = `http://127.0.0.1:${port}`;

  const close = async () => {
    if (child.exitCode !== null) {
      return;
    }

    child.kill();
    await new Promise(
      /** @param {() => void} resolve - Verification input. */ (resolve) => {
        const timer = setTimeout(() => {
          child.kill("SIGKILL");
          resolve();
        }, 5000);

        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      }
    );
  };

  try {
    const deadline = Date.now() + startupTimeout;
    let ready = false;

    while (Date.now() < deadline) {
      if (failure) {
        throw failure;
      }

      if (child.exitCode !== null) {
        throw new Error(
          `Owned Bun Next server exited ${child.exitCode}: ${logs}`
        );
      }

      if (logs.includes("Ready in")) {
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(2500),
          });

          ready = response.ok;
          await response.body?.cancel();

          if (ready) {
            break;
          }
        } catch {}
      }

      await new Promise(
        /** @param {() => void} resolve - Verification input. */ (resolve) =>
          setTimeout(resolve, 100)
      );
    }

    assert.ok(ready, "Owned Bun Next production server did not become ready");

    return {
      close,
      identity: {
        ...identity,
        bun: Bun.version,
        pid: child.pid,
        runtime: process.execPath,
      },
      url,
    };
  } catch (error) {
    await close();
    throw error;
  }
};
