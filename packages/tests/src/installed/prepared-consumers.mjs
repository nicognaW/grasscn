import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { installedDependencyIdentity } from "@grasscn/tests/dependency-identity";
import { repoRoot, packageBin } from "@grasscn/tests/paths";

import {
  assertExternalProject,
  assertIndependentDependencies,
  assertConsumerPortAvailable,
  consumerEnvironment,
  directoryIdentity,
  sha256,
} from "./consumer-boundary.mjs";

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

  const prepared = JSON.parse(
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
    const collected = JSON.parse(bytes);
    assert.deepEqual(collected.source, source);
    assert.deepEqual(collected.websiteIdentity, websiteIdentity);
    assert.deepEqual(
      collected.environment,
      consumerVerificationEnvironment(),
      "Collected consumer environment changed"
    );
  }

  let runtime;

  if (requirePassedRuntime) {
    runtime = JSON.parse(
      await readFile(path.join(artifactDirectory, "report.json"), "utf-8")
    );
    assertPreparedSnapshot(runtime, {
      source,
      status: "passed",
      websiteIdentity,
    });
    assert.ok(
      runtime.artifacts?.sha256 &&
        Object.keys(runtime.artifacts.files ?? {}).length > 0 &&
        runtime.browserVersion,
      "Passed ordinary runtime must retain browser and artifact identities"
    );

    if (kind === "manual") {
      assert.equal(runtime.publicInputsSha256, prepared.publicInputsSha256);
    }

    for (const [name, digest] of Object.entries(
      runtime.artifacts?.files ?? {}
    )) {
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

  const projects =
    kind === "manual"
      ? prepared.consumers.map((entry) => ({
          ...entry,
          id: `manual-${entry.framework}`,
        }))
      : [
          {
            ...prepared,
            directory: prepared.consumer,
            framework: "vite",
            id: "cli-vite",
          },
        ];

  assert.deepEqual(
    projects.map((entry) => entry.id).toSorted(),
    kind === "manual" ? ["manual-next", "manual-vite"] : ["cli-vite"]
  );

  // Reverse before constructing the map to preserve the first matching runtime entry.
  const observedByFramework = new Map(
    (kind === "manual" && runtime ? runtime.consumers : [])
      .toReversed()
      .map((entry) => [entry.framework, entry])
  );
  for (const project of projects) {
    if (runtime) {
      const observed =
        kind === "manual"
          ? observedByFramework.get(project.framework)
          : runtime;

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
    browserVersion: runtime?.browserVersion,
    source,
    websiteIdentity,
  }));
};

export const servePreparedConsumer = async (
  project,
  { port, startupTimeout = 120_000 } = {}
) => {
  assert.ok(
    Number.isInteger(port) && port > 0,
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

  const child = spawn(process.execPath, ["--bun", ...args], {
    cwd: project.directory,
    env: consumerEnvironment(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let failure;
  let logs = "";

  child.stdout.on("data", (bytes) => {
    logs += bytes;
    process.stdout.write(bytes);
  });
  child.stderr.on("data", (bytes) => {
    logs += bytes;
    process.stderr.write(bytes);
  });
  child.on("error", (error) => {
    failure = error;
  });

  const close = async () => {
    if (child.exitCode !== null) {
      return;
    }

    child.kill();
    // eslint-disable-next-line promise/avoid-new -- Bridge the owned process or server callback events into an awaited lifecycle step.
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
  };

  const url = `http://127.0.0.1:${port}`;

  try {
    const deadline = Date.now() + startupTimeout;

    while (Date.now() < deadline) {
      if (failure) {
        throw failure;
      }

      assert.ok(
        child.exitCode === null,
        `Owned consumer exited before readiness: ${logs}`
      );

      if (
        project.framework === "next"
          ? logs.includes("Ready in")
          : logs.includes("Local:")
      ) {
        try {
          // eslint-disable-next-line no-await-in-loop -- Validate retained artifacts and each prepared installation before starting its owned runtime.
          const response = await fetch(url, {
            signal: AbortSignal.timeout(2500),
          });

          const ready = response.ok;
          // eslint-disable-next-line no-await-in-loop -- Validate retained artifacts and each prepared installation before starting its owned runtime.
          await response.body?.cancel();

          if (ready) {
            return {
              close,
              identity: {
                buildOutput: project.buildOutput.sha256,
                bun: Bun.version,
                id: project.id,
                inputs: project.inputs.sha256,
                installedBytes: project.installedBytes,
                pid: child.pid,
                runtime: process.execPath,
              },
              url,
            };
          }
        } catch {
          // The owned server may still be starting; retry until the readiness deadline.
        }
      }

      // eslint-disable-next-line no-await-in-loop -- Validate retained artifacts and each prepared installation before starting its owned runtime.
      await Bun.sleep(100);
    }

    throw new Error("Owned prepared consumer readiness timed out");
  } catch (error) {
    await close();
    throw error;
  }
};
