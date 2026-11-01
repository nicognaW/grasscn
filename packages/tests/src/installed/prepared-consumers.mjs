import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { installedDependencyIdentity } from "@grasscn/tests/dependency-identity";
import { repoRoot } from "@grasscn/tests/paths";
import { packageBin } from "@grasscn/tests/tooling";

import { serveOwnedHttpProcess } from "../runtime/owned-http-process.mjs";
import {
  parseConsumerSnapshot,
  parseCollectedSnapshot,
  preparedProject,
  retainedArtifacts,
  retainedBrowserVersion,
} from "../runtime/verification-types.ts";
/** @typedef {import("../runtime/verification-types.ts").PreparedProject} PreparedProject */
/** @typedef {import("../runtime/verification-types.ts").SourceIdentity} SourceIdentity */
/** @typedef {import("../runtime/verification-types.ts").WebsiteIdentity} WebsiteIdentity */
/** @typedef {import("../runtime/verification-types.ts").ConsumerSnapshot} ConsumerSnapshot */
import {
  assertExternalProject,
  assertIndependentDependencies,
  assertConsumerPortAvailable,
  consumerEnvironment,
  directoryIdentity,
  sha256,
} from "./consumer-boundary.mjs";

/**
 * @template {PreparedProject} T
 * @param {T} project - Prepared installation with retained identities.
 * @param {{excludedRoots?: string[]}} [options] - Forbidden source/workspace roots.
 * @returns {Promise<T>} The unchanged validated installation.
 */
export const validatePreparedProject = async (
  project,
  { excludedRoots } = {}
) => {
  assert.ok(
    project.installedBytes?.installedSha256 &&
      project.inputs?.sha256 &&
      project.buildOutput?.sha256,
    "Complete prepared consumer dependency/input/build identities required"
  );

  const common = execFileSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { cwd: repoRoot, encoding: "utf-8" }
  ).trim();

  await assertExternalProject(
    project.directory,
    excludedRoots ?? [repoRoot, path.dirname(common)]
  );
  assert.deepEqual(
    await assertIndependentDependencies(project.directory),
    project.dependencyIdentity,
    "Prepared consumer dependency resolutions changed"
  );
  assert.deepEqual(
    installedDependencyIdentity(project.directory),
    project.installedBytes,
    "Prepared consumer installed bytes changed"
  );
  assert.deepEqual(
    await directoryIdentity(project.directory),
    project.inputs,
    "Prepared consumer inputs changed"
  );
  assert.deepEqual(
    await directoryIdentity(
      path.join(
        project.directory,
        project.framework === "next" ? ".next" : "dist"
      ),
      new Set(["cache", "trace", "trace-build"])
    ),
    project.buildOutput,
    "Prepared consumer production bytes changed"
  );

  return project;
};

export const consumerVerificationEnvironment = () => ({
  arch: process.arch,
  bunOptionsSha256: sha256(process.env.BUN_OPTIONS ?? ""),
  locale: Intl.DateTimeFormat().resolvedOptions().locale,
  platform: process.platform,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

/**
 * @param {ConsumerSnapshot} prepared - Persisted consumer snapshot.
 * @param {{source: SourceIdentity, websiteIdentity: WebsiteIdentity, status?: string}} expected - Expected frozen snapshot.
 */
export const assertPreparedSnapshot = (
  prepared,
  { source, websiteIdentity, status = "prepared" }
) => {
  assert.equal(prepared.status, status, `Consumer receipt must be ${status}`);
  assert.deepEqual(
    prepared.source,
    source,
    "Prepared consumer source snapshot changed"
  );
  assert.deepEqual(
    prepared.websiteIdentity,
    websiteIdentity,
    "Prepared consumer website build/runtime identity changed"
  );
  assert.equal(
    prepared.bun,
    Bun.version,
    "Prepared consumer Bun runtime changed"
  );
  assert.deepEqual(
    prepared.environment,
    consumerVerificationEnvironment(),
    "Prepared consumer environment changed"
  );
};

/**
 * @param {{kind: string, artifactDirectory: string, source: SourceIdentity, websiteIdentity: WebsiteIdentity, requirePassedRuntime?: boolean}} options - Journey and frozen production snapshot.
 */
export const readPreparedConsumerProjects = async ({
  kind,
  artifactDirectory,
  source,
  websiteIdentity,
  requirePassedRuntime = true,
}) => {
  assert.ok(
    ["manual", "cli"].includes(kind),
    "Known consumer installation journey required"
  );

  const ownedArtifacts =
    path.join(repoRoot, "test-results", `${kind}-consumers`) + path.sep;

  assert.ok(
    path.resolve(artifactDirectory).startsWith(ownedArtifacts),
    "Consumer artifacts must belong to the shared ordinary test-results owner"
  );

  const prepared = parseConsumerSnapshot(
    await readFile(path.join(artifactDirectory, "prepared.json"), "utf-8")
  );

  assertPreparedSnapshot(prepared, { source, websiteIdentity });

  if (kind === "manual") {
    const bytes = await readFile(
      path.join(artifactDirectory, "public-inputs.json")
    );

    assert.equal(
      sha256(bytes),
      prepared.publicInputsSha256,
      "Collected public code/instructions changed"
    );
    const collected = parseCollectedSnapshot(bytes.toString("utf-8"));
    assert.deepEqual(collected.source, source);
    assert.deepEqual(collected.websiteIdentity, websiteIdentity);
    assert.deepEqual(
      collected.environment,
      consumerVerificationEnvironment(),
      "Collected consumer environment changed"
    );
  }

  /** @type {(ConsumerSnapshot & Record<string, unknown>) | undefined} */
  let runtime;
  /** @type {string | undefined} */
  let browserVersion;

  if (requirePassedRuntime) {
    runtime = parseConsumerSnapshot(
      await readFile(path.join(artifactDirectory, "report.json"), "utf-8")
    );
    assertPreparedSnapshot(runtime, {
      source,
      status: "passed",
      websiteIdentity,
    });
    const artifacts = retainedArtifacts(runtime.artifacts);
    browserVersion = retainedBrowserVersion(runtime.browserVersion);

    assert.ok(
      Object.keys(artifacts.files).length > 0,
      "Passed ordinary runtime must retain browser and artifact identities"
    );

    if (kind === "manual") {
      assert.equal(runtime.publicInputsSha256, prepared.publicInputsSha256);
    }

    for (const [name, digest] of Object.entries(artifacts.files)) {
      const file = path.resolve(artifactDirectory, name);
      assert.ok(
        file.startsWith(path.resolve(artifactDirectory) + path.sep),
        "Artifact must remain within its receipt owner"
      );
      assert.equal(
        // eslint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- Validate retained artifacts and each prepared installation before starting its owned runtime.
        sha256(await readFile(file)),
        digest,
        `Ordinary consumer artifact changed: ${name}`
      );
    }
  }

  const rawProjects =
    kind === "manual"
      ? prepared.consumers
      : [{ ...prepared, directory: prepared.consumer, framework: "vite" }];

  assert.ok(Array.isArray(rawProjects), "Prepared manual consumers required");

  const projects = rawProjects.map((entry) => {
    const project = preparedProject(entry);

    return {
      ...project,
      id: kind === "manual" ? `manual-${project.framework}` : "cli-vite",
    };
  });

  assert.deepEqual(
    projects.map((entry) => entry.id).toSorted(),
    kind === "manual" ? ["manual-next", "manual-vite"] : ["cli-vite"]
  );

  const rawObserved = kind === "manual" && runtime ? runtime.consumers : [];
  assert.ok(
    Array.isArray(rawObserved),
    "Passed ordinary runtime must retain prepared consumers"
  );
  // Reverse before constructing the map to preserve the first matching runtime entry.
  /** @type {Map<string, PreparedProject>} */
  const observedByFramework = new Map();

  for (const entry of rawObserved.toReversed()) {
    const project = preparedProject(entry);
    observedByFramework.set(project.framework, project);
  }

  for (const project of projects) {
    if (runtime) {
      const observed =
        kind === "manual"
          ? observedByFramework.get(project.framework)
          : preparedProject({
              ...runtime,
              directory: runtime.consumer,
              framework: "vite",
            });

      assert.ok(
        observed,
        "Passed ordinary runtime must cover this prepared project"
      );
      assert.deepEqual(
        observed.inputs,
        project.inputs,
        "Ordinary runtime input identity differs from preparation"
      );
      assert.deepEqual(observed.installedBytes, project.installedBytes);
    }

    // eslint-disable-next-line no-await-in-loop -- Validate retained artifacts and each prepared installation before starting its owned runtime.
    await validatePreparedProject(project);
  }

  return projects.map((project) => ({
    ...project,
    artifactDirectory,
    browserVersion,
    source,
    websiteIdentity,
  }));
};

/**
 * @param {PreparedProject & {id?: string}} project - Frozen external installation.
 * @param {{port?: number, startupTimeout?: number}} [options] - Explicit owned loopback listener.
 */
export const servePreparedConsumer = async (
  project,
  { port, startupTimeout = 120_000 } = {}
) => {
  assert.ok(
    port !== undefined && Number.isInteger(port) && port > 0,
    "Explicit consumer loopback port required"
  );
  await validatePreparedProject(project);
  await assertConsumerPortAvailable(port);

  const args =
    project.framework === "next"
      ? [
          packageBin("next", "next", project.directory),
          "start",
          "--hostname",
          "127.0.0.1",
          "--port",
          String(port),
        ]
      : [
          packageBin("vite", "vite", project.directory),
          "preview",
          "--host",
          "127.0.0.1",
          "--port",
          String(port),
          "--strictPort",
        ];

  const server = await serveOwnedHttpProcess({
    args: ["--bun", ...args],
    cwd: project.directory,
    env: consumerEnvironment(),
    label: "prepared consumer",
    port,
    readyText: project.framework === "next" ? "Ready in" : "Local:",
    startupTimeout,
  });

  return {
    close: server.close,
    identity: {
      buildOutput: project.buildOutput.sha256,
      bun: Bun.version,
      id: project.id,
      inputs: project.inputs.sha256,
      installedBytes: project.installedBytes,
      pid: server.pid,
      runtime: process.execPath,
    },
    url: server.url,
  };
};
