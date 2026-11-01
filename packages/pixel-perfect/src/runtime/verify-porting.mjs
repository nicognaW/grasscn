import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import {
  baseCatalogue,
  collectBrowserCases,
  classifyBrowserCases,
} from "@grasscn/pixel-perfect/suite";
import {
  reusableBrowserTests,
  browserFilePattern,
} from "@grasscn/tests/checkpoints";
import { installedDependencyIdentity } from "@grasscn/tests/dependency-identity";
import {
  fixtureManifest,
  serveProductionFixture,
} from "@grasscn/tests/fixture";
import {
  stampProductionBuild,
  serveNextProduction,
  sourceIdentity,
  productionBuildIdentity,
  readPreparedProductionBuild,
} from "@grasscn/tests/next-production";
import {
  browserReuseResults,
  readVerificationState,
  checkpointSummary,
  expectedCheckpoint,
  checkpointResult,
  browserCollectionReport,
  verificationWebsite,
} from "@grasscn/tests/verification-types";
import { serveFullHosts } from "@ppt/full-runs/hosts.mjs";
import { assertFullBrowserExecution } from "@ppt/full-runs/run.mjs";
import {
  repoRoot,
  testRoot,
  pixelPerfectRoot,
  resolveRepositoryPath,
  packageBin,
} from "@ppt/paths";

import {
  authorizedFullRun,
  classifiedBrowserCases,
} from "./verification-types.ts";

const [suite, output, workerArgument = "1"] = process.argv.slice(2);
const workers = Number(workerArgument);
const phase = process.env.GRASSCN_VERIFY_PHASE ?? "all";

if (!["all", "prepare", "browser"].includes(phase)) {
  throw new Error("Use prepare, browser or all verification phase");
}

if (!Number.isInteger(workers) || workers < 1 || workers > 8) {
  throw new Error("Use 1-8 browser workers");
}

if (!["regressions", "pixels", "all", "full"].includes(suite) || !output) {
  throw new Error("Use the guarded package commands");
}

if (suite === "pixels") {
  throw new Error(
    "Matrix pixel audits are Full tests and require an approved run issue. Use the ordinary Base commands."
  );
}

const fullMode = suite === "full";

const fullRun = fullMode
  ? authorizedFullRun(assertFullBrowserExecution([]))
  : null;

if (fullRun !== null) {
  for (const name of [
    "POPOVER_SURFACE_ONLY",
    "GRASSCN_TRADING_SCROLL_REFERENCE",
    "GRASSCN_EXPANSION_REFERENCE",
    "GRASSCN_INSTALLED_BUNDLE_SHA256",
  ]) {
    if ((process.env[name] ?? "") !== "") {
      throw new Error(`Full scope cannot use ${name}`);
    }
  }

  const { fixturePort, previewPort, proxyPort } = fullRun.plan.execution;
  process.env.GRASSCN_BROWSER_SCOPE = "full";
  process.env.GRASSCN_FULL_PROXY_PORT = String(proxyPort);
  process.env.GRASSCN_FIXTURE_URL = `http://127.0.0.1:${fixturePort}`;
  process.env.GRASSCN_PREVIEW_URL = `http://127.0.0.1:${previewPort}/`;
  process.env.GRASSCN_EXPANSION_URL = `${process.env.GRASSCN_FIXTURE_URL}/adventure.html`;
  process.env.GRASSCN_TREE_INSTALLED_URL = process.env.GRASSCN_EXPANSION_URL;
}

const managedFixture =
  fullMode ||
  (suite === "all" &&
    ![
      "GRASSCN_FIXTURE_URL",
      "GRASSCN_EXPANSION_URL",
      "GRASSCN_EXPANSION_REFERENCE",
      "GRASSCN_TREE_INSTALLED_URL",
      "GRASSCN_INSTALLED_BUNDLE_SHA256",
    ].some((name) => (process.env[name] ?? "") !== ""));

if (managedFixture && !fullMode) {
  process.env.GRASSCN_FIXTURE_URL = "http://127.0.0.1:5178";
  process.env.GRASSCN_EXPANSION_URL = "http://127.0.0.1:5178/adventure.html";
  process.env.GRASSCN_TREE_INSTALLED_URL =
    "http://127.0.0.1:5178/adventure.html";
}

await mkdir(output, { recursive: true });

const identity = sourceIdentity;
const before = await identity();

const environment = {
  arch: process.arch,
  bun: Bun.version,
  ci: process.env.CI ?? null,
  fixture: process.env.GRASSCN_FIXTURE_URL ?? null,
  fixtureOverrides: Object.fromEntries(
    [
      "GRASSCN_EXPANSION_URL",
      "GRASSCN_EXPANSION_REFERENCE",
      "GRASSCN_TREE_INSTALLED_URL",
      "GRASSCN_INSTALLED_BUNDLE_SHA256",
    ].map((key) => [key, process.env[key] ?? null])
  ),
  locale: Intl.DateTimeFormat().resolvedOptions().locale,
  platform: process.platform,
  preview: process.env.GRASSCN_PREVIEW_URL ?? null,
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
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

const installedDependencyState = () => installedDependencyIdentity(repoRoot);

environment.installedDependencies = installedDependencyState();

environment.browserSelection = fullMode ? "full" : "base";

environment.nonPptIncluded = false;

if (fullRun !== null) {
  environment.fullRun = {
    approvalEvent: fullRun.approval.eventId,
    issue: fullRun.number,
    planHash: fullRun.planHash,
  };
}

environment.fixtureMode = managedFixture
  ? "production"
  : "provided-or-development";

environment.websiteMode = "owned-bun-next-production";

/** @type {import("@grasscn/tests/verification-types").VerificationReport} */
const report = {
  browserScope: fullMode ? "full" : "base",
  checks: [],
  completed: false,
  environment,
  passed: false,
  pptOnly: true,
  scope: `${fullMode ? "Approved Full" : "Base"} browser selection only. No fresh native launch or shadcn CLI installation; no merge performed.`,
  source: before,
  startedAt: new Date().toISOString(),
  suite,
};

const receipt = path.join(output, "verification.json");

const save = async () => {
  await writeFile(receipt, `${JSON.stringify(report, null, 2)}\n`);
};

const cacheAllowed =
  environment.installedDependencies !== null &&
  (managedFixture ||
    ((process.env.GRASSCN_EXPANSION_REFERENCE ?? "") === "" &&
      (process.env.GRASSCN_EXPANSION_URL ?? "") === "" &&
      (process.env.GRASSCN_TREE_INSTALLED_URL ?? "") === "" &&
      ((process.env.GRASSCN_FIXTURE_URL ?? "") === "" ||
        /^http:\/\/127\.0\.0\.1:5174\/?$/u.test(
          process.env.GRASSCN_FIXTURE_URL
        ))));

const previous = [];

for (const folder of await readdir(path.dirname(output))) {
  try {
    const filename = path.join(
      path.dirname(output),
      folder,
      "verification.json"
    );

    // eslint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
    const candidate = readVerificationState(await readFile(filename, "utf-8"));

    if (
      candidate !== undefined &&
      cacheAllowed &&
      candidate.source?.treeSha256 === before.treeSha256 &&
      candidate.source?.commit === before.commit &&
      JSON.stringify(candidate.environment) === JSON.stringify(environment)
    ) {
      previous.push({ filename, report: candidate });
    }
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) {
      throw error;
    }
  }
}

await save();

/** @type {[string, string[]][]} */
const steps = [
  ["generate", [packageBin("turbo", "turbo", repoRoot), "run", "generate"]],
  [
    "types",
    [
      packageBin("uncheck", "uncheck", repoRoot),
      "--only=tsc",
      "--require=tsc",
      "--cwd",
      repoRoot,
    ],
  ],
  ["primitives", [path.join(testRoot, "src/checks/check-primitives.mjs")]],
  [
    "registry-closure",
    [path.join(testRoot, "src/checks/check-registry-closure.mjs")],
  ],
  ["evidence", [path.join(pixelPerfectRoot, "src/runtime/check-map.mjs")]],
  [
    "porting-evidence",
    [path.join(pixelPerfectRoot, "src/runtime/check-porting-evidence.mjs")],
  ],
  ["unit-contracts", ["run", "test:unit"]],
  [
    "production-build",
    [packageBin("turbo", "turbo", repoRoot), "run", "build"],
  ],
  [
    "built-primitives",
    [path.join(testRoot, "src/checks/check-primitives.mjs"), "--built"],
  ],
];

if (managedFixture) {
  steps.push(["fixture-build", [path.join(testRoot, "cli/build-fixture.mjs")]]);
}

if (phase === "browser") {
  const prepared = readVerificationState(
    await readFile(path.join(output, "prepared.json"), "utf-8")
  );

  assert.ok(prepared?.websiteBuild, "Prepared website build identity required");

  if (
    prepared.source?.commit !== before.commit ||
    prepared.source?.treeSha256 !== before.treeSha256 ||
    JSON.stringify(prepared.environment) !== JSON.stringify(environment)
  ) {
    throw new Error("Prepared verification source/environment changed");
  }

  const build = await productionBuildIdentity({ source: before });

  if (build.outputSha256 !== prepared.websiteBuild?.outputSha256) {
    throw new Error("Prepared Next output changed");
  }

  if (
    managedFixture &&
    fixtureManifest().sha256 !== prepared.fixtureBundle?.sha256
  ) {
    throw new Error("Prepared fixture output changed");
  }

  steps.length = 0;
  report.preparation = prepared;
  report.websiteBuild = prepared.websiteBuild;
}

const classifiedCases = classifiedBrowserCases(
  classifyBrowserCases(collectBrowserCases())
);

const selectedCases = fullMode ? classifiedCases.full : classifiedCases.base;

// Retain exact case identities for historical reporting, independently of future source.
if (fullRun !== null) {
  report.fullCases = selectedCases;
  await save();
}

const browserFiles = [
  ...new Set((selectedCases ?? baseCatalogue()).map((test) => test.file)),
].toSorted();

if (phase !== "prepare") {
  for (const file of browserFiles) {
    steps.push([
      `browser:${file}`,
      [
        packageBin("@playwright/test", "playwright", pixelPerfectRoot),
        "test",
        "--config",
        path.join(pixelPerfectRoot, "playwright.config.ts"),
        browserFilePattern(file),
        `--workers=${workers}`,
        ...(workers > 1 ? ["--fully-parallel"] : []),
        `--output=${path.join(output, "browser", file)}`,
      ],
    ]);
  }
}

/** @type {Awaited<ReturnType<typeof serveProductionFixture>> | undefined} */
let fixtureHost;

/** @type {Awaited<ReturnType<typeof serveFullHosts>> | undefined} */
let fullHosts;

/** @type {Awaited<ReturnType<typeof serveNextProduction>> | undefined} */
let previewHost;
let testFailures = false;

try {
  for (const [name, args] of steps) {
    if (
      name === "production-build" &&
      process.env.GRASSCN_REUSE_PREPARED_NEXT_BUILD === "1"
    ) {
      // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
      report.websiteBuild = await readPreparedProductionBuild({
        source: before,
      });
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

    // Rebuild generated outputs and rerun prechecks. Browser passes are reused
    // individually below, with current test status and artifact hashes checked.
    console.log(`\nLocal verification: ${name}`);
    const browserEnvironment = {};
    /** @type {{line: string}[]} */
    let reusedTests = [];

    if (name.startsWith("browser:")) {
      // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
      await writeFile(
        path.join(output, "verification-phase.json"),
        JSON.stringify({ phase: "browser", source: before })
      );

      if (managedFixture && !fixtureHost && !fullHosts) {
        report.fixtureBundle = fixtureManifest();
        // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
        await writeFile(
          path.join(output, "fixture-bundle.json"),
          `${JSON.stringify(report.fixtureBundle, null, 2)}\n`
        );

        if (fullRun === null) {
          // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
          fixtureHost = await serveProductionFixture();
        } else {
          // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
          fullHosts = await serveFullHosts(fullRun.plan);
        }

        // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
        await save();
      }

      if (!previewHost && !fullHosts) {
        if ((process.env.GRASSCN_PREVIEW_URL ?? "") !== "") {
          throw new Error(
            "Ordinary verification owns its Next production server; do not provide a foreground preview URL"
          );
        }

        // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
        previewHost = await serveNextProduction({
          expectedSource: before,
          port: Number(process.env.GRASSCN_VERIFICATION_PREVIEW_PORT ?? 5176),
        });
        process.env.GRASSCN_PREVIEW_URL = `${previewHost.url}/`;
      }

      const website = verificationWebsite(
        previewHost?.identity ?? fullHosts?.websiteIdentity
      );

      report.websiteBuild = {
        buildId: website.buildId,
        outputSha256: website.outputSha256,
        source: website.source,
      };
      browserEnvironment.GRASSCN_WEBSITE_IDENTITY = JSON.stringify(
        report.websiteBuild
      );

      const file = name.slice("browser:".length);
      const directory = path.join(output, "checkpoints", file);

      // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
      reusedTests = browserReuseResults(
        // eslint-disable-next-line no-await-in-loop -- Read the previous stage checkpoints before selecting retained tests for this browser file.
        await reusableBrowserTests(
          previous.filter(
            (candidate) =>
              candidate.report.suite === suite &&
              candidate.report.websiteBuild?.outputSha256 ===
                report.websiteBuild.outputSha256 &&
              (!managedFixture ||
                candidate.report.fixtureBundle?.sha256 ===
                  report.fixtureBundle.sha256)
          ),
          file,
          pixelPerfectRoot
        )
      );
      // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
      await mkdir(directory, { recursive: true });

      if (reusedTests.length) {
        const list = path.join(directory, "retained-tests.txt");
        // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
        await writeFile(
          list,
          `${reusedTests.map((test) => test.line).join("\n")}\n`
        );
        args.push("--test-list-invert", list, "--pass-with-no-tests");
        console.log(
          `Retaining ${reusedTests.length} successful tests from matching source/environment`
        );
      }

      args.push(
        `--reporter=list,json,${path.join(testRoot, "src/runtime/checkpoint-reporter.mjs")}`
      );
      browserEnvironment.PLAYWRIGHT_JSON_OUTPUT_NAME = path.join(
        directory,
        "playwright.json"
      );
      browserEnvironment.GRASSCN_CHECKPOINT_REPORT_DIR = directory;
    }

    /** @type {Promise<number>} */

    // eslint-disable-next-line no-await-in-loop, promise/avoid-new -- Bridge the owned process or server callback events into an awaited lifecycle step.
    const completion = new Promise((resolve, reject) => {
      const commandArgs = [...args];

      if (commandArgs[0].startsWith("scripts/")) {
        commandArgs[0] = resolveRepositoryPath(commandArgs[0]);
      }

      const child = spawn(process.execPath, commandArgs, {
        cwd: ["generate", "production-build"].includes(name)
          ? repoRoot
          : pixelPerfectRoot,
        env: {
          ...process.env,
          GOMAXPROCS: "1",
          GOMEMLIMIT: process.env.GOMEMLIMIT ?? "768MiB",
          RAYON_NUM_THREADS: "1",
          ...browserEnvironment,
        },
        stdio: "inherit",
      });

      child.on("error", reject);
      child.on("exit", (exitCode, signal) => {
        resolve(exitCode ?? (signal ? 1 : 0));
      });
    });

    // eslint-disable-next-line no-await-in-loop -- Observe the owned stage exit before consuming its output and advancing.
    const code = await completion;
    /** @type {import("@grasscn/tests/verification-types").VerificationCheck} */
    const check = { exitCode: code, name };

    if (reusedTests.length > 0) {
      check.reusedTests = reusedTests;
    }

    report.checks.push(check);
    // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
    await save();

    if (name === "production-build" && code === 0) {
      // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
      report.websiteBuild = await stampProductionBuild({
        source: before,
        verifiedCommand: [process.execPath, ...args],
        verifiedExitCode: code,
      });
      // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
      await save();
    }

    if (name === "fixture-build" && code === 0) {
      report.fixtureBundle = fixtureManifest();
      // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
      await save();
    }

    if (code !== 0) {
      if (fullMode && name.startsWith("browser:")) {
        const file = name.slice("browser:".length);
        const directory = path.join(output, "checkpoints", file);

        /** @type {import("@grasscn/tests/verification-types").CheckpointSummary | undefined} */
        let summary;

        try {
          summary = checkpointSummary(
            // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
            await readFile(path.join(directory, "summary.json"), "utf-8")
          );
        } catch {
          // Missing or incomplete checkpoint artifacts cannot prove collection completed.
        }

        let collectionComplete = false;

        try {
          const expected = expectedCheckpoint(
            // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
            await readFile(path.join(directory, "expected.json"), "utf-8")
            // eslint-disable-next-line no-await-in-loop -- Complete each retained checkpoint read or generated-input restoration before advancing to the next dependent stage.
          );

          // eslint-disable-next-line no-await-in-loop -- Finish reading this failed browser file journal before advancing Full collection.
          const checkpointResultsBytes = await readFile(
            path.join(directory, "results.jsonl"),
            "utf-8"
          );

          const results =
            // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
            checkpointResultsBytes
              .trim()
              .split("\n")
              .filter(Boolean)
              .map(checkpointResult);

          const terminal = new Set(
            results.flatMap((result) =>
              result.status === "interrupted" ? [] : [result.id]
            )
          );

          const browserReport = browserCollectionReport(
            // eslint-disable-next-line no-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
            await readFile(path.join(directory, "playwright.json"), "utf-8")
          );

          collectionComplete =
            (browserReport.errors?.length ?? 0) === 0 &&
            expected.tests.every((test) => terminal.has(test.id));
        } catch {
          // Missing or incomplete checkpoint artifacts cannot prove collection completed.
        }

        if (
          collectionComplete &&
          summary?.status === "failed" &&
          summary.counts.failed + summary.counts.timedOut > 0 &&
          summary.counts.interrupted === 0 &&
          (summary.changedSources?.length ?? 0) === 0
        ) {
          testFailures = true;
          console.error(
            `${name} has test failures; collecting the remaining Full files before repairs`
          );
          continue;
        }
      }

      throw new Error(
        `${name} failed before complete test collection (${code})`
      );
    }
  }

  report.sourceAfter = await identity();

  if (
    report.sourceAfter.treeSha256 !== before.treeSha256 ||
    report.sourceAfter.commit !== before.commit
  ) {
    throw new Error(
      "Source changed during verification; rerun against the final tree"
    );
  }

  report.dependenciesAfter = installedDependencyState();

  if (
    JSON.stringify(report.dependenciesAfter) !==
    JSON.stringify(environment.installedDependencies)
  ) {
    throw new Error(
      "Installed dependencies changed during verification; rerun against the final environment"
    );
  }

  if (managedFixture) {
    report.fixtureBundleAfter = fixtureManifest();

    if (report.fixtureBundleAfter.sha256 !== report.fixtureBundle.sha256) {
      throw new Error("The production fixture changed during verification");
    }
  }

  report.completed = phase !== "prepare";
  report.prepared = phase === "prepare";
  report.passed = phase !== "prepare" && !testFailures;

  if (phase === "prepare") {
    await writeFile(
      path.join(output, "prepared.json"),
      `${JSON.stringify(
        {
          environment,
          fixtureBundle: report.fixtureBundle,
          source: before,
          websiteBuild: report.websiteBuild,
        },
        null,
        2
      )}\n`
    );
  }

  if (testFailures) {
    process.exitCode = 1;
  }
} catch (error) {
  report.error = String(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await fullHosts?.close();
  await fixtureHost?.close();
  await previewHost?.close();
  report.finishedAt = new Date().toISOString();
  await save();
  console.log(`Verification receipt: ${receipt}`);
}
