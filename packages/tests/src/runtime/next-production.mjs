import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, lstat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { repoRoot, webRoot, packageBin } from "@tests/paths";

import { installedDependencyIdentity } from "./dependency-identity.mjs";

const digest = (value) => createHash("sha256").update(value).digest("hex");
export async function sourceIdentity(directory = repoRoot) {
  const git = (args) =>
    execFileSync("git", args, {
      cwd: directory,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    }).trim();
  const files = [
    ...new Set(
      git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
        .split("\0")
        .filter(Boolean)
    ),
  ].sort();
  const hash = createHash("sha256");
  for (const file of files) {
    let bytes;
    try {
      bytes = await readFile(path.join(directory, file));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      bytes = Buffer.from("<deleted>");
    }
    hash.update(file).update("\0").update(digest(bytes)).update("\0");
  }
  return {
    commit: git(["rev-parse", "HEAD"]),
    treeSha256: hash.digest("hex"),
    status: git(["status", "--porcelain=v1"]),
  };
}

export async function productionBuildIdentity({
  directory = webRoot,
  source,
} = {}) {
  assert.ok(
    source?.commit && source?.treeSha256,
    "Production build needs source identity"
  );
  const files = [];
  async function visit(folder) {
    for (const name of (await readdir(folder)).sort()) {
      const file = path.join(folder, name),
        relative = path.relative(directory, file).replaceAll(path.sep, "/");
      if (
        relative === ".next/cache" ||
        relative === ".next/dev" ||
        relative === ".next/trace" ||
        relative === ".next/trace-build"
      )
        continue;
      const info = await lstat(file);
      assert.ok(
        !info.isSymbolicLink(),
        "Production output cannot contain symlinks"
      );
      if (info.isDirectory()) await visit(file);
      else files.push({ path: relative, sha256: digest(await readFile(file)) });
    }
  }
  const buildId = (
    await readFile(path.join(directory, ".next/BUILD_ID"), "utf8")
  ).trim();
  assert.ok(buildId, "Missing Next production build ID");
  await visit(path.join(directory, ".next"));
  await visit(path.join(directory, "public/r"));
  return {
    source,
    buildId,
    outputSha256: digest(JSON.stringify(files)),
    files,
  };
}

export function assertProductionSource(identity, source) {
  assert.ok(
    identity?.source?.commit === source?.commit &&
      identity?.source?.treeSha256 === source?.treeSha256,
    "Production build source does not match current snapshot"
  );
}
const receipt = path.join(
  repoRoot,
  "test-results",
  "next-production-build.json"
);
async function preparationIdentity(root, directory) {
  const dependencies = installedDependencyIdentity(root);
  assert.ok(
    dependencies,
    "Prepared production requires installed dependency bytes"
  );
  const generated = [];
  async function visit(folder) {
    for (const name of (await readdir(folder)).sort()) {
      const filename = path.join(folder, name),
        info = await lstat(filename);
      assert.ok(
        !info.isSymbolicLink(),
        "Generated inputs cannot contain symlinks"
      );
      if (info.isDirectory()) await visit(filename);
      else
        generated.push({
          path: path.relative(directory, filename).replaceAll(path.sep, "/"),
          sha256: digest(await readFile(filename)),
        });
    }
  }
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
    generated,
    environment: {
      bun: Bun.version,
      bunOptionsSha256: digest(process.env.BUN_OPTIONS ?? ""),
      platform: process.platform,
      arch: process.arch,
      locale: resolved.locale,
      timeZone: resolved.timeZone,
    },
  };
}
function verifiedRootBuildCommand(command, root) {
  if (!Array.isArray(command) || command[0] !== process.execPath) return false;
  let remaining;
  if (command[1] === "run" && command[2] === "build")
    remaining = command.slice(3);
  else if (
    command[2] === "run" &&
    command[3] === "build" &&
    command[1] === packageBin("turbo", "turbo", root)
  )
    remaining = command.slice(4);
  else return false;
  return (
    remaining.length === 0 ||
    (remaining.length === 1 && remaining[0] === "--concurrency=1")
  );
}
export async function stampProductionBuild(options = {}) {
  const source = options.source ?? (await sourceIdentity());
  const directory = options.directory ?? webRoot,
    root = options.root ?? repoRoot;
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
  await writeFile(destination, JSON.stringify(identity, null, 2) + "\n");
  return identity;
}

/** Reuse a completed build only through the exact frozen production boundary. */
export async function readPreparedProductionBuild(options = {}) {
  const source = options.source ?? (await sourceIdentity());
  const identity = JSON.parse(
    await readFile(options.receiptPath ?? receipt, "utf8")
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
}

export async function serveNextProduction({
  port = 5176,
  expectedSource,
  startupTimeout = 120000,
} = {}) {
  const source = expectedSource ?? (await sourceIdentity());
  const identity = JSON.parse(await readFile(receipt, "utf8"));
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
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(port, "127.0.0.1", resolve);
  });
  await new Promise((resolve) => probe.close(resolve));
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
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
        GOMEMLIMIT: process.env.GOMEMLIMIT ?? "768MiB",
      },
    }
  );
  let logs = "",
    failure;
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
  async function close() {
    if (child.exitCode !== null) return;
    child.kill();
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 5000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  try {
    const deadline = Date.now() + startupTimeout;
    let ready = false;
    while (Date.now() < deadline) {
      if (failure) throw failure;
      if (child.exitCode !== null)
        throw Error(`Owned Bun Next server exited ${child.exitCode}: ${logs}`);
      if (/Ready in/.test(logs)) {
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(2500),
          });
          ready = response.ok;
          await response.body?.cancel();
          if (ready) break;
        } catch {}
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, "Owned Bun Next production server did not become ready");
    return {
      url,
      identity: {
        ...identity,
        pid: child.pid,
        runtime: process.execPath,
        bun: Bun.version,
      },
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
