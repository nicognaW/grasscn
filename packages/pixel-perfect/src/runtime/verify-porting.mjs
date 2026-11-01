import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

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
} from "@grasscn/tests/next-production";
import { serveFullHosts } from "@ppt/full-runs/hosts.mjs";
import { assertFullBrowserExecution } from "@ppt/full-runs/run.mjs";
import {
  repoRoot,
  webRoot,
  testRoot,
  pixelPerfectRoot,
  resolveRepositoryPath,
  packageBin,
} from "@ppt/paths";
import {
  baseCatalogue,
  collectBrowserCases,
  classifyBrowserCases,
} from "@ppt/selection/suite.mjs";

const root = repoRoot;
const [suite, output, workerArgument = "1"] = process.argv.slice(2);
const workers = Number(workerArgument);
const phase = process.env.GRASSCN_VERIFY_PHASE ?? "all";
if (!["all", "prepare", "browser"].includes(phase))
  throw Error("Use prepare, browser or all verification phase");
if (!Number.isInteger(workers) || workers < 1 || workers > 8)
  throw Error("Use 1-8 browser workers");
if (!["regressions", "pixels", "all", "full"].includes(suite) || !output)
  throw Error("Use the guarded package commands");
if (suite === "pixels")
  throw Error(
    "Matrix pixel audits are Full tests and require an approved run issue. Use the ordinary Base commands."
  );
const fullMode = suite === "full";
const fullRun = fullMode ? assertFullBrowserExecution([]) : null;
if (fullMode) {
  for (const name of [
    "POPOVER_SURFACE_ONLY",
    "GRASSCN_TRADING_SCROLL_REFERENCE",
    "GRASSCN_EXPANSION_REFERENCE",
    "GRASSCN_INSTALLED_BUNDLE_SHA256",
  ])
    if (process.env[name]) throw Error(`Full scope cannot use ${name}`);
  const { fixturePort, previewPort, proxyPort } = fullRun.plan.execution;
  process.env.GRASSCN_BROWSER_SCOPE = "full";
  process.env.GRASSCN_FULL_PROXY_PORT = String(proxyPort);
  process.env.GRASSCN_FIXTURE_URL = `http://127.0.0.1:${fixturePort}`;
  process.env.GRASSCN_PREVIEW_URL = `http://127.0.0.1:${previewPort}/`;
  process.env.GRASSCN_EXPANSION_URL =
    process.env.GRASSCN_FIXTURE_URL + "/adventure.html";
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
    ].some((name) => process.env[name]));
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
  workers,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  locale: Intl.DateTimeFormat().resolvedOptions().locale,
  ci: process.env.CI ?? null,
  fixtureOverrides: Object.fromEntries(
    [
      "GRASSCN_EXPANSION_URL",
      "GRASSCN_EXPANSION_REFERENCE",
      "GRASSCN_TREE_INSTALLED_URL",
      "GRASSCN_INSTALLED_BUNDLE_SHA256",
    ].map((key) => [key, process.env[key] ?? null])
  ),
  bun: Bun.version,
  platform: process.platform,
  arch: process.arch,
  webgl: process.env.GRASSCN_WEBGL_BACKEND ?? null,
  fixture: process.env.GRASSCN_FIXTURE_URL ?? null,
  preview: process.env.GRASSCN_PREVIEW_URL ?? null,
};
for (const executable of [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
]) {
  try {
    const info = await stat(executable);
    environment.edge = { executable, size: info.size, modified: info.mtimeMs };
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
async function installedDependencyState() {
  return installedDependencyIdentity(repoRoot);
}

environment.installedDependencies = await installedDependencyState();
environment.browserSelection = fullMode ? "full" : "base";
environment.nonPptIncluded = false;
if (fullMode)
  environment.fullRun = {
    issue: fullRun.number,
    planHash: fullRun.planHash,
    approvalEvent: fullRun.approval.eventId,
  };
environment.fixtureMode = managedFixture
  ? "production"
  : "provided-or-development";
environment.websiteMode = "owned-bun-next-production";
const report = {
  suite,
  pptOnly: true,
  browserScope: fullMode ? "full" : "base",
  startedAt: new Date().toISOString(),
  source: before,
  environment,
  checks: [],
  completed: false,
  passed: false,
  scope: `${fullMode ? "Approved Full" : "Base"} browser selection only. No fresh native launch or shadcn CLI installation; no merge performed.`,
};
const receipt = path.join(output, "verification.json");
const save = () => writeFile(receipt, JSON.stringify(report, null, 2) + "\n");
const cacheAllowed =
  environment.installedDependencies !== null &&
  (managedFixture ||
    (!process.env.GRASSCN_EXPANSION_REFERENCE &&
      !process.env.GRASSCN_EXPANSION_URL &&
      !process.env.GRASSCN_TREE_INSTALLED_URL &&
      (!process.env.GRASSCN_FIXTURE_URL ||
        /^http:\/\/127\.0\.0\.1:5174\/?$/.test(
          process.env.GRASSCN_FIXTURE_URL
        ))));
const previous = [];
for (const folder of await readdir(path.dirname(output))) {
  try {
    const filename = path.join(
        path.dirname(output),
        folder,
        "verification.json"
      ),
      candidate = JSON.parse(await readFile(filename, "utf8"));
    if (
      cacheAllowed &&
      candidate.source?.treeSha256 === before.treeSha256 &&
      candidate.source?.commit === before.commit &&
      JSON.stringify(candidate.environment) === JSON.stringify(environment)
    )
      previous.push({ filename, report: candidate });
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
  }
}
await save();
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
if (managedFixture)
  steps.push(["fixture-build", [path.join(testRoot, "cli/build-fixture.mjs")]]);
if (phase === "browser") {
  const prepared = JSON.parse(
    await readFile(path.join(output, "prepared.json"), "utf8")
  );
  if (
    prepared.source?.commit !== before.commit ||
    prepared.source?.treeSha256 !== before.treeSha256 ||
    JSON.stringify(prepared.environment) !== JSON.stringify(environment)
  )
    throw Error("Prepared verification source/environment changed");
  const build = await productionBuildIdentity({ source: before });
  if (build.outputSha256 !== prepared.websiteBuild?.outputSha256)
    throw Error("Prepared Next output changed");
  if (
    managedFixture &&
    fixtureManifest().sha256 !== prepared.fixtureBundle?.sha256
  )
    throw Error("Prepared fixture output changed");
  steps.length = 0;
  report.preparation = prepared;
  report.websiteBuild = prepared.websiteBuild;
}
const classifiedCases = classifyBrowserCases(collectBrowserCases());
const selectedCases = fullMode ? classifiedCases.full : classifiedCases.base;
// Retain exact case identities for historical reporting, independently of future source.
if (fullMode) {
  report.fullCases = selectedCases;
  await save();
}
const browserFiles = [
  ...new Set((selectedCases ?? baseCatalogue()).map((test) => test.file)),
].sort();
if (phase !== "prepare")
  for (const file of browserFiles)
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
let fixtureHost, previewHost, fullHosts;
let testFailures = false;
try {
  for (const [name, args] of steps) {
    // Rebuild generated outputs and rerun prechecks. Browser passes are reused
    // individually below, with current test status and artifact hashes checked.
    console.log(`\nLocal verification: ${name}`);
    let browserEnvironment = {};
    let reusedTests = [];
    if (name.startsWith("browser:")) {
      await writeFile(
        path.join(output, "verification-phase.json"),
        JSON.stringify({ phase: "browser", source: before })
      );
      if (managedFixture && !fixtureHost && !fullHosts) {
        report.fixtureBundle = fixtureManifest();
        await writeFile(
          path.join(output, "fixture-bundle.json"),
          JSON.stringify(report.fixtureBundle, null, 2) + "\n"
        );
        if (fullMode) {
          fullHosts = await serveFullHosts(fullRun.plan);
        } else fixtureHost = await serveProductionFixture();
        await save();
      }
      if (!previewHost && !fullHosts) {
        if (process.env.GRASSCN_PREVIEW_URL)
          throw Error(
            "Ordinary verification owns its Next production server; do not provide a foreground preview URL"
          );
        previewHost = await serveNextProduction({
          port: Number(process.env.GRASSCN_VERIFICATION_PREVIEW_PORT ?? 5176),
          expectedSource: before,
        });
        process.env.GRASSCN_PREVIEW_URL = previewHost.url + "/";
      }
      const website = previewHost?.identity ?? fullHosts?.websiteIdentity;
      report.websiteBuild = {
        source: website.source,
        buildId: website.buildId,
        outputSha256: website.outputSha256,
      };
      browserEnvironment.GRASSCN_WEBSITE_IDENTITY = JSON.stringify(
        report.websiteBuild
      );
      const file = name.slice("browser:".length),
        directory = path.join(output, "checkpoints", file);
      reusedTests = await reusableBrowserTests(
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
      );
      await mkdir(directory, { recursive: true });
      if (reusedTests.length) {
        const list = path.join(directory, "retained-tests.txt");
        await writeFile(
          list,
          reusedTests.map((test) => test.line).join("\n") + "\n"
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
    const code = await new Promise((resolve, reject) => {
      const commandArgs = [...args];
      if (commandArgs[0].startsWith("scripts/"))
        commandArgs[0] = resolveRepositoryPath(commandArgs[0]);
      const child = spawn(process.execPath, commandArgs, {
        cwd: ["generate", "production-build"].includes(name)
          ? repoRoot
          : pixelPerfectRoot,
        stdio: "inherit",
        env: {
          ...process.env,
          GOMEMLIMIT: process.env.GOMEMLIMIT ?? "768MiB",
          GOMAXPROCS: "1",
          RAYON_NUM_THREADS: "1",
          ...browserEnvironment,
        },
      });
      child.on("error", reject);
      child.on("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
    });
    report.checks.push({
      name,
      exitCode: code,
      ...(reusedTests.length ? { reusedTests } : {}),
    });
    await save();
    if (name === "production-build" && code === 0) {
      report.websiteBuild = await stampProductionBuild({ source: before });
      await save();
    }
    if (name === "fixture-build" && code === 0) {
      report.fixtureBundle = fixtureManifest();
      await save();
    }
    if (code !== 0) {
      if (fullMode && name.startsWith("browser:")) {
        const file = name.slice("browser:".length),
          directory = path.join(output, "checkpoints", file);
        let summary;
        try {
          summary = JSON.parse(
            await readFile(path.join(directory, "summary.json"), "utf8")
          );
        } catch {}
        let collectionComplete = false;
        try {
          const expected = JSON.parse(
            await readFile(path.join(directory, "expected.json"), "utf8")
          );
          const results = (
            await readFile(path.join(directory, "results.jsonl"), "utf8")
          )
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line));
          const terminal = new Set(
            results
              .filter((result) => result.status !== "interrupted")
              .map((result) => result.id)
          );
          const browserReport = JSON.parse(
            await readFile(path.join(directory, "playwright.json"), "utf8")
          );
          collectionComplete =
            !browserReport.errors?.length &&
            expected.tests.every((test) => terminal.has(test.id));
        } catch {}
        if (
          collectionComplete &&
          summary?.status === "failed" &&
          summary.counts.failed + summary.counts.timedOut > 0 &&
          !summary.counts.interrupted &&
          !summary.changedSources?.length
        ) {
          testFailures = true;
          console.error(
            `${name} has test failures; collecting the remaining Full files before repairs`
          );
          continue;
        }
      }
      throw Error(`${name} failed before complete test collection (${code})`);
    }
  }
  report.sourceAfter = await identity();
  if (
    report.sourceAfter.treeSha256 !== before.treeSha256 ||
    report.sourceAfter.commit !== before.commit
  )
    throw Error(
      "Source changed during verification; rerun against the final tree"
    );
  report.dependenciesAfter = await installedDependencyState();
  if (
    JSON.stringify(report.dependenciesAfter) !==
    JSON.stringify(environment.installedDependencies)
  )
    throw Error(
      "Installed dependencies changed during verification; rerun against the final environment"
    );
  if (managedFixture) {
    report.fixtureBundleAfter = fixtureManifest();
    if (report.fixtureBundleAfter.sha256 !== report.fixtureBundle.sha256)
      throw Error("The production fixture changed during verification");
  }
  report.completed = phase !== "prepare";
  report.prepared = phase === "prepare";
  report.passed = phase !== "prepare" && !testFailures;
  if (phase === "prepare")
    await writeFile(
      path.join(output, "prepared.json"),
      JSON.stringify(
        {
          source: before,
          environment,
          websiteBuild: report.websiteBuild,
          fixtureBundle: report.fixtureBundle,
        },
        null,
        2
      ) + "\n"
    );
  if (testFailures) process.exitCode = 1;
} catch (error) {
  report.error = error.message;
  process.exitCode = 1;
} finally {
  await fullHosts?.close();
  await fixtureHost?.close();
  await previewHost?.close();
  report.finishedAt = new Date().toISOString();
  await save();
  console.log(`Verification receipt: ${receipt}`);
}
