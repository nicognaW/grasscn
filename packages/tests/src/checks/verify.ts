import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";

import { installedDependencyIdentity } from "@grasscn/tests/dependency-identity";
import { fixtureManifest } from "@grasscn/tests/fixture";
import { serveVerificationHosts } from "@grasscn/tests/hosts";
import {
  sourceIdentity,
  stampProductionBuild,
  productionBuildIdentity,
  readPreparedProductionBuild,
} from "@grasscn/tests/next-production";
import { repoRoot, testRoot } from "@tests/paths";
import { packageBin } from "@tests/tooling";

import { readVerificationState } from "../runtime/verification-types.ts";
import type { VerificationReport } from "../runtime/verification-types.ts";

const [output, workerArgument = "1"] = process.argv.slice(2);
const workers = Number(workerArgument);

assert.ok(
  output && Number.isInteger(workers) && workers >= 1 && workers <= 8,
  "Use the guarded normal verification command"
);

const phase = process.env.GRASSCN_VERIFY_PHASE ?? "all";

assert.ok(
  ["all", "prepare", "browser"].includes(phase),
  "Use prepare, browser or all verification phase"
);

await mkdir(output, { recursive: true });

const source = await sourceIdentity();
const dependencies = installedDependencyIdentity(repoRoot);

assert.ok(
  dependencies,
  "Normal verification requires this source workspace dependency installation"
);

interface NormalVerificationEnvironment {
  arch: string;
  bun: string;
  ci: string | null;
  installedDependencies: NonNullable<ReturnType<typeof installedDependencyIdentity>>;
  locale: string;
  platform: NodeJS.Platform;
  pptIncluded: false;
  scope: "normal";
  timezone: string;
  webgl: string | null;
  workers: number;
  edge?: { executable: string; modified: number; size: number };
}

const environment: NormalVerificationEnvironment = {
  arch: process.arch,
  bun: Bun.version,
  ci: process.env.CI ?? null,
  installedDependencies: dependencies,
  locale: Intl.DateTimeFormat().resolvedOptions().locale,
  platform: process.platform,
  pptIncluded: false,
  scope: "normal",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  webgl: process.env.GRASSCN_WEBGL_BACKEND ?? null,
  workers,
};

for (const executable of [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
]) {
  try {
    // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
    const info = await stat(executable);
    environment.edge = { executable, modified: info.mtimeMs, size: info.size };
    break;
  } catch (error) {
    if (
      // SAFETY: this catch observes only fs.stat for the fixed native Edge executable paths.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Keep the native errno projection and original missing-file/rethrow behavior.
      (error as NodeJS.ErrnoException).code !== "ENOENT"
    ) {
      throw error;
    }
  }
}

const report: VerificationReport = {
  checks: [],
  completed: false,
  environment,
  passed: false,
  phase,
  pptIncluded: false,
  scope: "normal",
  source,
  startedAt: new Date().toISOString(),
};

const save = async () => {
  await writeFile(
    path.join(output, "verification.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );
};

const steps: [name: string, args: string[], directory: string][] = [
  [
    "generate",
    [packageBin("turbo", "turbo", repoRoot), "run", "generate"],
    repoRoot,
  ],
  [
    "types",
    [
      packageBin("uncheck", "uncheck", repoRoot),
      "--only=tsc",
      "--require=tsc",
      "--cwd",
      repoRoot,
    ],
    repoRoot,
  ],
  [
    "primitives",
    [path.join(testRoot, "src/checks/check-primitives.ts")],
    testRoot,
  ],
  [
    "registry-closure",
    [path.join(testRoot, "src/checks/check-registry-closure.ts")],
    testRoot,
  ],
  [
    "production-build",
    [packageBin("turbo", "turbo", repoRoot), "run", "build"],
    repoRoot,
  ],
  [
    "built-primitives",
    [path.join(testRoot, "src/checks/check-primitives.ts"), "--built"],
    testRoot,
  ],
  ["fixture-build", [path.join(testRoot, "cli/build-fixture.ts")], testRoot],
  ["normal-unit-contracts", ["run", "test:unit"], testRoot],
];

if (phase === "browser") {
  const prepared = readVerificationState(
    await readFile(path.join(output, "prepared.json"), "utf-8")
  );

  assert.ok(
    prepared?.websiteBuild && prepared.fixtureBundle,
    "Complete prepared normal verification required"
  );
  assert.deepEqual(prepared.source, source, "Prepared normal source changed");
  assert.deepEqual(
    prepared.environment,
    environment,
    "Prepared normal environment/dependencies changed"
  );
  const awaitedIdentity1 = await productionBuildIdentity({ source });
  assert.equal(
    awaitedIdentity1.outputSha256,
    prepared.websiteBuild.outputSha256,
    "Prepared Next bytes changed"
  );
  assert.equal(
    fixtureManifest().sha256,
    prepared.fixtureBundle.sha256,
    "Prepared independent fixture bytes changed"
  );
  report.websiteBuild = prepared.websiteBuild;
  report.fixtureBundle = prepared.fixtureBundle;
  steps.length = 0;
}

if (phase !== "prepare") {
  steps.push([
    "normal-browser",
    [
      packageBin("@playwright/test", "playwright", testRoot),
      "test",
      "--config",
      path.join(testRoot, "playwright.config.ts"),
      `--workers=${workers}`,
      `--output=${path.join(output, "browser")}`,
      `--reporter=list,json,${path.join(testRoot, "src/runtime/checkpoint-reporter.ts")}`,
    ],
    testRoot,
  ]);
}

let hosts: Awaited<ReturnType<typeof serveVerificationHosts>> | undefined;

try {
  /* oxlint-disable no-await-in-loop -- Build steps consume earlier outputs; save each receipt and fail before starting the next step. */
  for (const [name, args, cwd] of steps) {
    if (
      name === "production-build" &&
      process.env.GRASSCN_REUSE_PREPARED_NEXT_BUILD === "1"
    ) {
      // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
      report.websiteBuild = await readPreparedProductionBuild({ source });
      report.checks.push({
        exitCode: 0,
        name,
        reusedCompletedBuild: true,
        verifiedCommand: report.websiteBuild.verifiedCommand,
      });
      // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
      await save();
      continue;
    }

    let browserEnvironment: NodeJS.ProcessEnv = {};

    if (name === "normal-browser") {
      // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
      await writeFile(
        path.join(output, "verification-phase.json"),
        JSON.stringify({ phase: "browser", source })
      );
      // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
      hosts = await serveVerificationHosts({
        fixturePort: 5284,
        previewPort: 5286,
        proxyPort: 5287,
      });

      const {
        buildId,
        outputSha256,
        source: websiteSource,
        bun,
        runtime,
      } = hosts.websiteIdentity;

      report.websiteBuild = {
        buildId,
        bun,
        outputSha256,
        runtime,
        source: websiteSource,
      };
      browserEnvironment = {
        GRASSCN_BROWSER_PROXY_PORT: "5287",
        GRASSCN_BROWSER_SCOPE: "ordinary",
        GRASSCN_CHECKPOINT_REPORT_DIR: path.join(output, "checkpoints"),
        GRASSCN_EXPANSION_URL: "http://127.0.0.1:5174/adventure.html",
        GRASSCN_FIXTURE_URL: "http://127.0.0.1:5174",
        GRASSCN_PREVIEW_URL: "http://127.0.0.1:5176/",
        GRASSCN_TREE_INSTALLED_URL: "http://127.0.0.1:5174/adventure.html",
        GRASSCN_WEBSITE_IDENTITY: JSON.stringify(report.websiteBuild),
        PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(output, "playwright.json"),
      };
    }

    console.log(`Normal verification: ${name}`);

    const child = spawn(process.execPath, args, {
      cwd,
      env: {
        ...process.env,
        GOMAXPROCS: "1",
        GOMEMLIMIT: process.env.GOMEMLIMIT ?? "768MiB",
        GRASSCN_BROWSER_SCOPE: "ordinary",
        RAYON_NUM_THREADS: "1",
        ...browserEnvironment,
      },
      stdio: "inherit",
    });
    // SAFETY: Node's ChildProcess exit event provides (code, signal); events.once rejects on spawn errors.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- This owned child has no callers operating on its handle after exit.
    const [exitCode, signal] = (await once(child, "exit")) as [
      number | null,
      NodeJS.Signals | null,
    ];
    const code = exitCode ?? (signal === null ? 0 : 1);

    report.checks.push({ exitCode: code, name });
    // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
    await save();
    assert.equal(code, 0, `${name} failed`);

    if (name === "production-build") {
      // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
      report.websiteBuild = await stampProductionBuild({
        source,
        verifiedCommand: [process.execPath, ...args],
        verifiedExitCode: code,
      });
    }

    if (name === "fixture-build") {
      report.fixtureBundle = fixtureManifest();
    }
  }

  report.sourceAfter = await sourceIdentity();
  assert.deepEqual(
    report.sourceAfter,
    source,
    "Normal verification source changed"
  );
  report.dependenciesAfter = installedDependencyIdentity(repoRoot);
  assert.deepEqual(
    report.dependenciesAfter,
    dependencies,
    "Normal verification installed bytes changed"
  );
  assert.equal(
    fixtureManifest().sha256,
    // SAFETY: successful fixture-build records this bundle, or the browser phase restores it after the existing prepared-receipt assertion.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The closed stage list must finish successfully before this unchanged SHA read.
    (report.fixtureBundle as NonNullable<VerificationReport["fixtureBundle"]>).sha256,
    "Independent fixture changed during normal verification"
  );
  const awaitedIdentity2 = await productionBuildIdentity({ source });
  assert.equal(
    awaitedIdentity2.outputSha256,
    // SAFETY: production-build stamps this identity, or the browser phase restores its asserted prepared website identity.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The closed successful stage flow owns this exact output hash read.
    (report.websiteBuild as NonNullable<VerificationReport["websiteBuild"]>).outputSha256,
    "Next output changed during normal verification"
  );

  if (phase === "prepare") {
    report.prepared = true;
    await writeFile(
      path.join(output, "prepared.json"),
      `${JSON.stringify(
        {
          environment,
          fixtureBundle: report.fixtureBundle,
          source,
          websiteBuild: report.websiteBuild,
        },
        null,
        2
      )}\n`
    );
  } else {
    report.completed = true;
    report.passed = true;
  }
} catch (error) {
  // SAFETY: this owned workflow catches Node fs/child-process errors, JSON/AssertionErrors and explicit Errors from its Next/fixture receipt owners.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Preserve Main's optional stack read and String fallback without converting or validating the thrown value.
  report.error = String((error as Error).stack ?? error);
  process.exitCode = 1;
} finally {
  await hosts?.close();
  report.finishedAt = new Date().toISOString();
  await save();
  console.log(
    `Normal verification receipt: ${path.join(output, "verification.json")}`
  );
}
