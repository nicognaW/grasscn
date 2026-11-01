import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  reusableBrowserTests,
  browserFilePattern,
} from "@grasscn/tests/checkpoints";
import { installedDependencyIdentity } from "@grasscn/tests/dependency-identity";
import {
  fixtureManifest,
  serveProductionFixture,
} from "@grasscn/tests/fixture";
import { packageBin } from "@grasscn/tests/tooling";
import { serveFullHosts } from "@ppt/full-runs/hosts.mjs";
import { assertFullBrowserExecution } from "@ppt/full-runs/run.mjs";
import {
  repoRoot,
  webRoot,
  testRoot,
  pixelPerfectRoot,
  repositoryFile,
  webFile,
} from "@ppt/paths";
import {
  baseCatalogue,
  collectBrowserCases,
  classifyBrowserCases,
} from "@ppt/selection/suite";

const root = repoRoot;
const [suite, output, workerArgument = "1"] = process.argv.slice(2);
const workers = Number(workerArgument);

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
const fullRun = fullMode ? assertFullBrowserExecution([]) : null;

if (fullMode) {
  for (const name of [
    "POPOVER_SURFACE_ONLY",
    "GRASSCN_TRADING_SCROLL_REFERENCE",
    "GRASSCN_EXPANSION_REFERENCE",
    "GRASSCN_INSTALLED_BUNDLE_SHA256",
  ]) {
    if (process.env[name]) {
      throw Error(`Full scope cannot use ${name}`);
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
    ].some((name) => process.env[name]));

if (managedFixture && !fullMode) {
  process.env.GRASSCN_FIXTURE_URL = "http://127.0.0.1:5178";
  process.env.GRASSCN_EXPANSION_URL = "http://127.0.0.1:5178/adventure.html";
  process.env.GRASSCN_TREE_INSTALLED_URL =
    "http://127.0.0.1:5178/adventure.html";
}

await mkdir(output, { recursive: true });

const git = (args) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf-8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();

async function identity() {
  const names = [
    ...new Set(
      git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
        .split("\0")
        .filter(Boolean)
    ),
  ].toSorted();

  const hash = createHash("sha256");

  for (const name of names) {
    let bytes;

    try {
      bytes = await readFile(repositoryFile(name));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      bytes = Buffer.from("<deleted>");
    }

    hash
      .update(name)
      .update("\0")
      .update(createHash("sha256").update(bytes).digest())
      .update("\0");
  }

  return {
    commit: git(["rev-parse", "HEAD"]),
    status: git(["status", "--porcelain=v1"]),
    treeSha256: hash.digest("hex"),
  };
}

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
    const info = await stat(executable);
    environment.edge = { executable, modified: info.mtimeMs, size: info.size };
    break;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function installedDependencyState() {
  return installedDependencyIdentity(repoRoot);
}

environment.installedDependencies = installedDependencyState();

environment.browserSelection = fullMode ? "full" : "base";

environment.nonPptIncluded = false;

if (fullMode) {
  environment.fullRun = {
    approvalEvent: fullRun.approval.eventId,
    issue: fullRun.number,
    planHash: fullRun.planHash,
  };
}

environment.fixtureMode = managedFixture
  ? "production"
  : "provided-or-development";

const report = {
  browserScope: fullMode ? "full" : "base",
  checks: [],
  completed: false,
  environment,
  passed: false,
  pptOnly: true,
  scope: `${fullMode ? "Approved Full PPTs only" : "Base PPTs only"}. No fresh native launch or shadcn CLI installation; no merge performed.`,
  source: before,
  startedAt: new Date().toISOString(),
  suite,
};

const receipt = path.join(output, "verification.json");

const save = async () =>
  writeFile(receipt, `${JSON.stringify(report, null, 2)}\n`);

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
    );

    const candidate = JSON.parse(await readFile(filename, "utf-8"));

    if (
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

const steps = [
  ["prepare-preview", [path.join(webRoot, "scripts/prepare-preview.mjs")]],
  [
    "types",
    [
      packageBin("uncheck", "uncheck", repoRoot),
      "--only=tsc",
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
  [
    "evidence-negative-controls",
    [
      "test",
      "--timeout",
      "120000",
      ...(await readdir(path.join(pixelPerfectRoot, "tests/unit")))
        .filter((name) => name.endsWith(".test.mjs"))
        .map((name) => path.join(pixelPerfectRoot, "tests/unit", name)),
    ],
  ],
];

if (suite === "all" || fullMode) {
  steps.push(
    ["registry-build", [packageBin("shadcn", "shadcn", webRoot), "build"]],
    [
      "built-primitives",
      [path.join(testRoot, "src/checks/check-primitives.mjs"), "--built"],
    ],
    [
      "preview-build",
      [
        packageBin("vite", "vite", webRoot),
        "build",
        "--config",
        path.join(webRoot, "vite.config.ts"),
      ],
    ]
  );
}

if (managedFixture) {
  steps.push(["fixture-build", [path.join(testRoot, "cli/build-fixture.ts")]]);
}

const selectedCases = fullMode
  ? classifyBrowserCases(collectBrowserCases()).full
  : null;

// Retain exact case identities for historical reporting, independently of future source.
if (fullMode) {
  report.fullCases = selectedCases;
  await save();
}

const browserFiles = [
  ...new Set((selectedCases ?? baseCatalogue()).map((test) => test.file)),
].toSorted();

for (const file of browserFiles) {
  steps.push([
    `browser:${file}`,
    [
      packageBin("@playwright/test", "playwright"),
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

let fixtureHost;
let fullHosts;
let previewHost;
let testFailures = false;

try {
  for (const [name, args] of steps) {
    // Rebuild generated outputs and rerun prechecks. Browser passes are reused
    // individually below, with current test status and artifact hashes checked.
    console.log(`\nLocal verification: ${name}`);
    const browserEnvironment = {};
    let reusedTests = [];

    if (name.startsWith("browser:") || name === "general-tests") {
      if (managedFixture && !fixtureHost && !fullHosts) {
        report.fixtureBundle = fixtureManifest();
        await writeFile(
          path.join(output, "fixture-bundle.json"),
          `${JSON.stringify(report.fixtureBundle, null, 2)}\n`
        );

        if (fullMode) {
          fullHosts = await serveFullHosts(fullRun.plan);
        } else {
          fixtureHost = await serveProductionFixture();
        }

        let previewReady = false;

        try {
          const response = await fetch(
            process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/",
            { signal: AbortSignal.timeout(2500) }
          );

          previewReady = response.ok;
          await response.body?.cancel();
        } catch {}

        if (!previewReady) {
          if (process.env.GRASSCN_PREVIEW_URL) {
            throw new Error("The configured preview server is unavailable");
          }

          const { createServer } = await import("vite");
          previewHost = await createServer({
            configFile: webFile("vite.config.ts"),
          });
          await previewHost.listen();
        }

        await save();
      }
    }

    if (name.startsWith("browser:")) {
      const file = name.slice("browser:".length);
      const directory = path.join(output, "checkpoints", file);

      reusedTests = await reusableBrowserTests(
        previous.filter(
          (candidate) =>
            candidate.report.suite === suite &&
            (!managedFixture ||
              candidate.report.fixtureBundle?.sha256 ===
                report.fixtureBundle.sha256)
        ),
        file,
        pixelPerfectRoot,
        repoRoot
      );
      await mkdir(directory, { recursive: true });

      if (reusedTests.length) {
        const list = path.join(directory, "retained-tests.txt");
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
        `--reporter=list,${fullMode ? "json," : ""}${fileURLToPath(import.meta.resolve("@grasscn/tests/checkpoint-reporter"))}`
      );

      if (fullMode) {
        browserEnvironment.PLAYWRIGHT_JSON_OUTPUT_NAME = path.join(
          directory,
          "playwright.json"
        );
      }

      browserEnvironment.GRASSCN_CHECKPOINT_REPORT_DIR = directory;
    }

    const code = await new Promise((resolve, reject) => {
      const commandArgs = [...args];

      const child = spawn(process.execPath, commandArgs, {
        cwd: ["registry-build", "preview-build"].includes(name)
          ? webRoot
          : pixelPerfectRoot,
        env: {
          ...process.env,
          GOMAXPROCS: "1",
          RAYON_NUM_THREADS: "1",
          ...browserEnvironment,
        },
        stdio: "inherit",
      });

      child.on("error", reject);
      child.on("exit", (code, signal) => {
        resolve(code ?? (signal ? 1 : 0));
      });
    });

    report.checks.push({
      exitCode: code,
      name,
      ...(reusedTests.length ? { reusedTests } : {}),
    });
    await save();

    if (code !== 0) {
      if (name === "general-tests") {
        testFailures = true;
        continue;
      }

      if (fullMode && name.startsWith("browser:")) {
        const file = name.slice("browser:".length);
        const directory = path.join(output, "checkpoints", file);

        let summary;

        try {
          summary = JSON.parse(
            await readFile(path.join(directory, "summary.json"), "utf-8")
          );
        } catch {}

        let collectionComplete = false;

        try {
          const expected = JSON.parse(
            await readFile(path.join(directory, "expected.json"), "utf-8")
          );

          const results = (
            await readFile(path.join(directory, "results.jsonl"), "utf-8")
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
            await readFile(path.join(directory, "playwright.json"), "utf-8")
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

  report.completed = true;
  report.passed = !testFailures;

  if (testFailures) {
    process.exitCode = 1;
  }
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
