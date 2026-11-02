import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
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
import { packageBin } from "@grasscn/tests/tooling";
import {
  browserReuseResults,
  readVerificationState,
  checkpointSummary,
  expectedCheckpoint,
  checkpointResult,
  browserCollectionReport,
  verificationWebsite,
} from "@grasscn/tests/verification-types";
import { serveFullHosts } from "@ppt/full-runs/hosts";
import { assertFullBrowserExecution } from "@ppt/full-runs/run";
import {
  repoRoot,
  testRoot,
  pixelPerfectRoot,
  repositoryFile,
} from "@ppt/paths";
import type {
  PreviousVerification,
  RuntimeVerificationEnvironment,
  RuntimeVerificationReceipt,
} from "@ppt/runtime/verification-protocol";

const hasText = (value: string | null | undefined): value is string =>
  Boolean(value);


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
  ? assertFullBrowserExecution([])
  : null;

if (fullRun !== null) {
  for (const name of [
    "POPOVER_SURFACE_ONLY",
    "GRASSCN_TRADING_SCROLL_REFERENCE",
    "GRASSCN_EXPANSION_REFERENCE",
    "GRASSCN_INSTALLED_BUNDLE_SHA256",
  ]) {
    if (hasText(process.env[name])) {
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
    ].some((name) => hasText(process.env[name])));

if (managedFixture && !fullMode) {
  process.env.GRASSCN_FIXTURE_URL = "http://127.0.0.1:5178";
  process.env.GRASSCN_EXPANSION_URL = "http://127.0.0.1:5178/adventure.html";
  process.env.GRASSCN_TREE_INSTALLED_URL =
    "http://127.0.0.1:5178/adventure.html";
}

await mkdir(output, { recursive: true });

const identity = sourceIdentity;
const before = await identity();

const environment: RuntimeVerificationEnvironment = {
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
    // SAFETY: the Node filesystem call supplies its error/code contract.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const failure = error as NodeJS.ErrnoException;

    if (failure.code !== "ENOENT") {
      throw error;
    }
  }
}

const installedDependencyState = function installedDependencyState() {
  return installedDependencyIdentity(repoRoot);
};

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

const report: RuntimeVerificationReceipt = {
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
    (!hasText(process.env.GRASSCN_EXPANSION_REFERENCE) &&
      !hasText(process.env.GRASSCN_EXPANSION_URL) &&
      !hasText(process.env.GRASSCN_TREE_INSTALLED_URL) &&
      (!hasText(process.env.GRASSCN_FIXTURE_URL) ||
        /^http:\/\/127\.0\.0\.1:5174\/?$/u.test(
          process.env.GRASSCN_FIXTURE_URL
        ))));

const previous: PreviousVerification[] = [];

for (const folder of await readdir(path.dirname(output))) {
  try {
    const filename = path.join(
      path.dirname(output),
      folder,
      "verification.json"
    );

    // eslint-disable-next-line no-await-in-loop, react-doctor/async-await-in-loop -- Each verification stage consumes prior outputs and records its receipt before the next stage.
    // SAFETY: this route reads owned verification.json receipts: current/legacy report writers emit ISO startedAt text; minimal historical states may omit it, preserving the checkpoint filename fallback.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Retain the actual optional timestamp projection alongside the existing source/environment filters and undefined result.
    const candidate = readVerificationState(await readFile(filename, "utf-8")) as PreviousVerification["report"] | undefined;

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
    // SAFETY: candidate reads/JSON parsing reject with Node errors or SyntaxError.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const failure = error as NodeJS.ErrnoException;

    if (failure.code !== "ENOENT" && !(error instanceof SyntaxError)) {
      throw error;
    }
  }
}

await save();

const steps: [name: string, args: string[]][] = [
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
  ["primitives", [path.join(testRoot, "src/checks/check-primitives.ts")]],
  [
    "registry-closure",
    [path.join(testRoot, "src/checks/check-registry-closure.ts")],
  ],
  ["evidence", [path.join(pixelPerfectRoot, "src/runtime/check-map.ts")]],
  [
    "porting-evidence",
    [path.join(pixelPerfectRoot, "src/runtime/check-porting-evidence.ts")],
  ],
  ["unit-contracts", ["run", "test:unit"]],
  [
    "production-build",
    [packageBin("turbo", "turbo", repoRoot), "run", "build"],
  ],
  [
    "built-primitives",
    [path.join(testRoot, "src/checks/check-primitives.ts"), "--built"],
  ],
];

if (managedFixture) {
  steps.push(["fixture-build", [path.join(testRoot, "cli/build-fixture.ts")]]);
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

const classifiedCases = (
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
].sort();

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

let fixtureHost: Awaited<ReturnType<typeof serveProductionFixture>> | undefined;

let fullHosts: Awaited<ReturnType<typeof serveFullHosts>> | undefined;

let previewHost: Awaited<ReturnType<typeof serveNextProduction>> | undefined;
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
    const browserEnvironment: NodeJS.ProcessEnv = {};
    let reusedTests: ReturnType<typeof browserReuseResults> = [];

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
                // SAFETY: this synchronous filter follows the current browser owner's websiteIdentity assignment above.
                // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Read the same owned website hash without adding a guard or changing cache eligibility.
                (report.websiteBuild as NonNullable<RuntimeVerificationReceipt["websiteBuild"]>).outputSha256 &&
              (!managedFixture ||
                candidate.report.fixtureBundle?.sha256 ===
                  // SAFETY: this arm executes only for managedFixture; its startup branch records the fixture bundle before assigning either host.
                  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Preserve the existing short-circuited bundle SHA read and missing-state behavior.
                  (report.fixtureBundle as NonNullable<RuntimeVerificationReceipt["fixtureBundle"]>).sha256)
          ),
          file,
          pixelPerfectRoot,
          repoRoot
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
        `--reporter=list,json,${path.join(testRoot, "src/runtime/checkpoint-reporter.ts")}`
      );
      browserEnvironment.PLAYWRIGHT_JSON_OUTPUT_NAME = path.join(
        directory,
        "playwright.json"
      );
      browserEnvironment.GRASSCN_CHECKPOINT_REPORT_DIR = directory;
    }

    const completion = Promise.withResolvers<number>();

    try {
      const commandArgs = [...args];

      if (commandArgs[0].startsWith("scripts/")) {
        commandArgs[0] = repositoryFile(commandArgs[0]);
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

      child.on("error", completion.reject);
      child.on("exit", (exitCode, signal) => {
        completion.resolve(exitCode ?? (hasText(signal) ? 1 : 0));
      });
    } catch (error) {
      completion.reject(error);
    }

    const code = await completion.promise;

    const check: RuntimeVerificationReceipt["checks"][number] = {
      exitCode: code,
      name,
    };

    if (reusedTests.length) {
      check.reusedTests = reusedTests;
    }

    report.checks.push(check);
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

        let summary: ReturnType<typeof checkpointSummary>;

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
            !Boolean(browserReport.errors?.length) &&
            expected.tests.every((test) => terminal.has(test.id));
        } catch {
          // Preserve the existing unavailable/incomplete-evidence fallback.
        }

        if (
          collectionComplete &&
          summary?.status === "failed" &&
          summary.counts.failed + summary.counts.timedOut > 0 &&
          !Boolean(summary.counts.interrupted) &&
          !Boolean(summary.changedSources?.length)
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

    // SAFETY: managed browser-host startup records the original fixture bundle; retain its existing missing-bundle failure.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const initialFixture = report.fixtureBundle as ReturnType<
      typeof fixtureManifest
    >;

    if (report.fixtureBundleAfter.sha256 !== initialFixture.sha256) {
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
