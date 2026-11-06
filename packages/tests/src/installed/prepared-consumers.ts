import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { installedDependencyIdentity } from "@grasscn/tests/dependency-identity";
import { repoRoot } from "@grasscn/tests/paths";
import { packageBin } from "@grasscn/tests/tooling";

import { serveOwnedHttpProcess } from "../runtime/owned-http-process";
import type * as VerificationTypes from "../runtime/verification-types";
import {
  parseConsumerSnapshot,
  parseCollectedSnapshot,
  preparedProject,
  retainedArtifacts,
  retainedBrowserVersion,
} from "../runtime/verification-types";
/** @typedef {VerificationTypes.PreparedProject} PreparedProject */
/** @typedef {VerificationTypes.SourceIdentity} SourceIdentity */
/** @typedef {VerificationTypes.WebsiteIdentity} WebsiteIdentity */
/** @typedef {VerificationTypes.ConsumerSnapshot} ConsumerSnapshot */
import {
  assertExternalProject,
  assertIndependentDependencies,
  assertConsumerPortAvailable,
  consumerEnvironment,
  directoryIdentity,
  sha256,
} from "./consumer-boundary";
import { consumerBuildIdentity } from "./consumer-build-identity";

type PreparedProject = VerificationTypes.PreparedProject;

type SourceIdentity = VerificationTypes.SourceIdentity;

type WebsiteIdentity = VerificationTypes.WebsiteIdentity;

type ConsumerSnapshot = VerificationTypes.ConsumerSnapshot;

/**
 * @template {PreparedProject} T
 * @param {T} project - Prepared installation with retained identities.
 * @param {{excludedRoots?: string[]}} [options] - Forbidden source/workspace roots.
 * @returns {Promise<T>} The unchanged validated installation.
 */
export const validatePreparedProject = async <T extends PreparedProject>(
  project: T,
  { excludedRoots }: { excludedRoots?: string[] } = {}
): Promise<T> => {
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
    await consumerBuildIdentity(
      path.join(
        project.directory,
        project.framework === "next" ? ".next" : "dist"
      ),
      project.framework
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
  prepared: ConsumerSnapshot,
  {
    source,
    websiteIdentity,
    status = "prepared",
  }: {
    source: SourceIdentity;
    websiteIdentity: WebsiteIdentity;
    status?: string;
  }
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
}: {
  kind: string;
  artifactDirectory: string;
  source: SourceIdentity;
  websiteIdentity: WebsiteIdentity;
  requirePassedRuntime?: boolean;
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

  /** @type {ReturnType<typeof parseConsumerSnapshot> | undefined} */
  let runtime: ReturnType<typeof parseConsumerSnapshot> | undefined;
  /** @type {string | undefined} */
  let browserVersion: string | undefined;

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

    const artifactInputs = await Promise.allSettled(
      Object.entries(artifacts.files).map(async ([name, digest]) => {
        const file = path.resolve(artifactDirectory, name);
        assert.ok(
          file.startsWith(path.resolve(artifactDirectory) + path.sep),
          "Artifact must remain within its receipt owner"
        );

        return { bytes: await readFile(file), digest, name };
      })
    );

    for (const artifactInput of artifactInputs) {
      if (artifactInput.status === "rejected") {
        throw artifactInput.reason;
      }

      const { bytes, digest, name } = artifactInput.value;
      assert.equal(
        sha256(bytes),
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

  const sortedProjectIds = projects.map((entry) => entry.id);
  sortedProjectIds.sort();
  assert.deepEqual(
    sortedProjectIds,
    kind === "manual" ? ["manual-next", "manual-vite"] : ["cli-vite"]
  );

  const rawObserved = kind === "manual" && runtime ? runtime.consumers : [];
  assert.ok(
    Array.isArray(rawObserved),
    "Passed ordinary runtime must retain prepared consumers"
  );
  // Reverse before constructing the map to preserve the first matching runtime entry.
  /** @type {Map<string, PreparedProject>} */
  const observedByFramework = new Map<string, PreparedProject>();

  const observedEntries: unknown[] = rawObserved;
  const reversedObserved = [...observedEntries];
  reversedObserved.reverse();

  for (const entry of reversedObserved) {
    const project = preparedProject(entry);
    observedByFramework.set(project.framework, project);
  }

  const projectInputs = await Promise.allSettled(
    projects.map(async (project) => {
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

      await validatePreparedProject(project);
    })
  );

  for (const projectInput of projectInputs) {
    if (projectInput.status === "rejected") {
      throw projectInput.reason;
    }
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
  project: PreparedProject & { id?: string },
  {
    port,
    startupTimeout = 120_000,
  }: { port?: number; startupTimeout?: number } = {}
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
