import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, lstat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { repoRoot, webRoot, packageBin } from "@tests/paths";

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
export async function stampProductionBuild(options = {}) {
  const source = options.source ?? (await sourceIdentity());
  const identity = await productionBuildIdentity({ source });
  await mkdir(path.dirname(receipt), { recursive: true });
  await writeFile(receipt, JSON.stringify(identity, null, 2) + "\n");
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
