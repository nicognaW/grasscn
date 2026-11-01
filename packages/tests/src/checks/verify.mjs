import assert from "node:assert/strict";
import { spawn } from "node:child_process";
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
import { repoRoot, testRoot, packageBin } from "@tests/paths";

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

const environment = {
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
    const info = await stat(executable);
    environment.edge = { executable, modified: info.mtimeMs, size: info.size };
    break;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

const report = {
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

const save = async () =>
  await writeFile(
    path.join(output, "verification.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );

const steps = [
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
    [path.join(testRoot, "src/checks/check-primitives.mjs")],
    testRoot,
  ],
  [
    "registry-closure",
    [path.join(testRoot, "src/checks/check-registry-closure.mjs")],
    testRoot,
  ],
  [
    "production-build",
    [packageBin("turbo", "turbo", repoRoot), "run", "build"],
    repoRoot,
  ],
  [
    "built-primitives",
    [path.join(testRoot, "src/checks/check-primitives.mjs"), "--built"],
    testRoot,
  ],
  ["fixture-build", [path.join(testRoot, "cli/build-fixture.mjs")], testRoot],
  ["normal-unit-contracts", ["run", "test:unit"], testRoot],
];

if (phase === "browser") {
  const prepared = JSON.parse(
    await readFile(path.join(output, "prepared.json"), "utf-8")
  );

  assert.deepEqual(prepared.source, source, "Prepared normal source changed");
  assert.deepEqual(
    prepared.environment,
    environment,
    "Prepared normal environment/dependencies changed"
  );
  assert.equal(
    (await productionBuildIdentity({ source })).outputSha256,
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
      `--reporter=list,json,${path.join(testRoot, "src/runtime/checkpoint-reporter.mjs")}`,
    ],
    testRoot,
  ]);
}

let hosts;

try {
  for (const [name, args, cwd] of steps) {
    if (
      name === "production-build" &&
      process.env.GRASSCN_REUSE_PREPARED_NEXT_BUILD === "1"
    ) {
      report.websiteBuild = await readPreparedProductionBuild({ source });
      report.checks.push({
        exitCode: 0,
        name,
        reusedCompletedBuild: true,
        verifiedCommand: report.websiteBuild.verifiedCommand,
      });
      await save();
      continue;
    }

    let browserEnvironment = {};

    if (name === "normal-browser") {
      await writeFile(
        path.join(output, "verification-phase.json"),
        JSON.stringify({ phase: "browser", source })
      );
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

    const code = await new Promise((resolve, reject) => {
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

      child.once("error", reject);
      child.once("exit", (code, signal) => {
        resolve(code ?? (signal ? 1 : 0));
      });
    });

    report.checks.push({ exitCode: code, name });
    await save();
    assert.equal(code, 0, `${name} failed`);

    if (name === "production-build") {
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
    report.fixtureBundle.sha256,
    "Independent fixture changed during normal verification"
  );
  assert.equal(
    (await productionBuildIdentity({ source })).outputSha256,
    report.websiteBuild.outputSha256,
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
  report.error = String(error.stack ?? error);
  process.exitCode = 1;
} finally {
  await hosts?.close();
  report.finishedAt = new Date().toISOString();
  await save();
  console.log(
    `Normal verification receipt: ${path.join(output, "verification.json")}`
  );
}
