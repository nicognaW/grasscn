import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { repoRoot, packageBin } from "@grasscn/tests/paths";
import { installedDependencyIdentity } from "@grasscn/tests/dependency-identity";
import { assertExternalProject, assertIndependentDependencies, assertConsumerPortAvailable, consumerEnvironment, directoryIdentity, sha256 } from "./consumer-boundary.mjs";

export async function validatePreparedProject(project, { excludedRoots } = {}) {
  assert(project.installedBytes?.installedSha256 && project.inputs?.sha256 && project.buildOutput?.sha256, "Complete prepared consumer dependency/input/build identities required");
  const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: repoRoot, encoding: "utf8" }).trim();
  await assertExternalProject(project.directory, excludedRoots ?? [repoRoot, path.dirname(common)]);
  assert.deepEqual(await assertIndependentDependencies(project.directory), project.dependencyIdentity, "Prepared consumer dependency resolutions changed");
  assert.deepEqual(installedDependencyIdentity(project.directory), project.installedBytes, "Prepared consumer installed bytes changed");
  assert.deepEqual(await directoryIdentity(project.directory), project.inputs, "Prepared consumer inputs changed");
  assert.deepEqual(await directoryIdentity(path.join(project.directory, project.framework === "next" ? ".next" : "dist"), new Set(["cache", "trace", "trace-build"])), project.buildOutput, "Prepared consumer production bytes changed");
  return project;
}

export function assertPreparedSnapshot(prepared, { source, websiteIdentity, status = "prepared" }) {
  assert.equal(prepared.status, status, `Consumer receipt must be ${status}`);
  assert.deepEqual(prepared.source, source, "Prepared consumer source snapshot changed");
  assert.deepEqual(prepared.websiteIdentity, websiteIdentity, "Prepared consumer website build/runtime identity changed");
  assert.equal(prepared.bun, Bun.version, "Prepared consumer Bun runtime changed");
}

export async function readPreparedConsumerProjects({ kind, artifactDirectory, source, websiteIdentity, requirePassedRuntime = true }) {
  assert(["manual", "cli"].includes(kind), "Known consumer installation journey required");
  const ownedArtifacts = path.join(repoRoot, "test-results", `${kind}-consumers`) + path.sep;
  assert(path.resolve(artifactDirectory).startsWith(ownedArtifacts), "Consumer artifacts must belong to the shared ordinary test-results owner");
  const prepared = JSON.parse(await readFile(path.join(artifactDirectory, "prepared.json"), "utf8"));
  assertPreparedSnapshot(prepared, { source, websiteIdentity });
  if (kind === "manual") {
    const bytes = await readFile(path.join(artifactDirectory, "public-inputs.json"));
    assert.equal(sha256(bytes), prepared.publicInputsSha256, "Collected public code/instructions changed");
    const collected = JSON.parse(bytes);
    assert.deepEqual(collected.source, source);
    assert.deepEqual(collected.websiteIdentity, websiteIdentity);
  }
  let runtime;
  if (requirePassedRuntime) {
    runtime = JSON.parse(await readFile(path.join(artifactDirectory, "report.json"), "utf8"));
    assertPreparedSnapshot(runtime, { source, websiteIdentity, status: "passed" });
    assert(runtime.artifacts?.sha256 && Object.keys(runtime.artifacts.files ?? {}).length > 0 && runtime.browserVersion, "Passed ordinary runtime must retain browser and artifact identities");
    if (kind === "manual") assert.equal(runtime.publicInputsSha256, prepared.publicInputsSha256);
    for (const [name, digest] of Object.entries(runtime.artifacts?.files ?? {})) {
      const file = path.resolve(artifactDirectory, name);
      assert(file.startsWith(path.resolve(artifactDirectory) + path.sep), "Artifact must remain within its receipt owner");
      assert.equal(sha256(await readFile(file)), digest, `Ordinary consumer artifact changed: ${name}`);
    }
  }
  const projects = kind === "manual" ? prepared.consumers.map((entry) => ({ ...entry, id: `manual-${entry.framework}` })) : [{ ...prepared, directory: prepared.consumer, framework: "vite", id: "cli-vite" }];
  assert.deepEqual(projects.map((entry) => entry.id).sort(), kind === "manual" ? ["manual-next", "manual-vite"] : ["cli-vite"]);
  for (const project of projects) {
    if (runtime) {
      const observed = kind === "manual" ? runtime.consumers.find((entry) => entry.framework === project.framework) : runtime;
      assert(observed, "Passed ordinary runtime must cover this prepared project");
      assert.deepEqual(observed.inputs, project.inputs, "Ordinary runtime input identity differs from preparation");
      assert.deepEqual(observed.installedBytes, project.installedBytes);
    }
    await validatePreparedProject(project);
  }
  return projects.map((project) => ({ ...project, source, websiteIdentity, artifactDirectory, browserVersion: runtime?.browserVersion }));
}

export async function servePreparedConsumer(project, { port, startupTimeout = 120000 } = {}) {
  assert(Number.isInteger(port) && port > 0, "Explicit consumer loopback port required");
  await validatePreparedProject(project);
  await assertConsumerPortAvailable(port);
  const args = project.framework === "next" ? [packageBin("next", "next", project.directory), "start", "--hostname", "127.0.0.1", "--port", String(port)] : [packageBin("vite", "vite", project.directory), "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"];
  const child = spawn(process.execPath, ["--bun", ...args], { cwd: project.directory, env: consumerEnvironment(), stdio: ["ignore", "pipe", "pipe"] });
  let logs = "", failure;
  child.stdout.on("data", (bytes) => { logs += bytes; process.stdout.write(bytes); });
  child.stderr.on("data", (bytes) => { logs += bytes; process.stderr.write(bytes); });
  child.on("error", (error) => { failure = error; });
  const close = async () => {
    if (child.exitCode !== null) return;
    child.kill();
    await new Promise((resolve) => { const timer = setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 5000); child.once("exit", () => { clearTimeout(timer); resolve(); }); });
  };
  const url = `http://127.0.0.1:${port}`;
  try {
    const deadline = Date.now() + startupTimeout;
    while (Date.now() < deadline) {
      if (failure) throw failure;
      assert(child.exitCode === null, `Owned consumer exited before readiness: ${logs}`);
      if (project.framework === "next" ? /Ready in/.test(logs) : /Local:/.test(logs)) {
        try { const response = await fetch(url, { signal: AbortSignal.timeout(2500) }); const ready = response.ok; await response.body?.cancel(); if (ready) return { url, close, identity: { id: project.id, pid: child.pid, runtime: process.execPath, bun: Bun.version, inputs: project.inputs.sha256, buildOutput: project.buildOutput.sha256, installedBytes: project.installedBytes } }; } catch {}
      }
      await Bun.sleep(100);
    }
    throw Error("Owned prepared consumer readiness timed out");
  } catch (error) { await close(); throw error; }
}
