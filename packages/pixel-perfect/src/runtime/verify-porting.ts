import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  CheckpointCatalogue,
  CheckpointResult,
  ReusableBrowserTest,
} from "@grasscn/tests/checkpoints";
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
import { serveFullHosts } from "@ppt/full-runs/hosts";
import type { AuthorizedFullRun } from "@ppt/full-runs/run";
import { assertFullBrowserExecution } from "@ppt/full-runs/run";
import {
  repoRoot,
  webRoot,
  testRoot,
  pixelPerfectRoot,
  repositoryFile,
  webFile,
} from "@ppt/paths";
import type {
  PreviousVerification,
  RuntimeVerificationEnvironment,
  RuntimeVerificationReceipt,
  RuntimeCheckpointSummary,
} from "@ppt/runtime/verification-protocol";
import type { BrowserCase } from "@ppt/selection/suite";
import {
  baseCatalogue,
  collectBrowserCases,
  classifyBrowserCases,
} from "@ppt/selection/suite";
import type { ViteDevServer } from "vite";

const hasText = (value: string | null | undefined): value is string =>
  Boolean(value);

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
    if (hasText(process.env[name])) {
      throw new Error(`Full scope cannot use ${name}`);
    }
  }

  // SAFETY: Full mode is the branch that just authorized and returned this run.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const approvedRun = fullRun as AuthorizedFullRun;

  const { fixturePort, previewPort, proxyPort } = approvedRun.plan.execution;
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

const git = (args: string[]) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf-8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();

const identity = async function identity() {
  const names = [
    ...new Set(
      git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
        .split("\0")
        .filter(Boolean)
    ),
  ].sort();

  const hash = createHash("sha256");

  for (const name of names) {
    let bytes: Buffer;

    try {
      bytes = await readFile(repositoryFile(name));
    } catch (error) {
      // SAFETY: the Node filesystem call supplies its error/code contract.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const failure = error as NodeJS.ErrnoException;

      if (failure.code !== "ENOENT") {
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
};

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

if (fullMode) {
  // SAFETY: Full mode has the authorized run returned before environment construction.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const approvedRun = fullRun as AuthorizedFullRun;

  environment.fullRun = {
    approvalEvent: approvedRun.approval.eventId,
    issue: approvedRun.number,
    planHash: approvedRun.planHash,
  };
}

environment.fixtureMode = managedFixture
  ? "production"
  : "provided-or-development";

const report: RuntimeVerificationReceipt = {
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

    // SAFETY: prior attempts write this receipt shape; existing source/environment checks follow.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const candidate = JSON.parse(
      await readFile(filename, "utf-8")
    ) as Partial<RuntimeVerificationReceipt>;

    if (
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
];

const unitFiles = await readdir(path.join(pixelPerfectRoot, "tests/unit"));

steps.push([
  "evidence-negative-controls",
  [
    "test",
    "--timeout",
    "120000",
    ...unitFiles.flatMap((name) =>
      name.endsWith(".test.ts")
        ? [path.join(pixelPerfectRoot, "tests/unit", name)]
        : []
    ),
  ],
]);

if (suite === "all" || fullMode) {
  steps.push(
    ["registry-build", [packageBin("shadcn", "shadcn", webRoot), "build"]],
    [
      "built-primitives",
      [path.join(testRoot, "src/checks/check-primitives.ts"), "--built"],
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
  // SAFETY: Full mode selected this exact array from the Full partition above.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  report.fullCases = selectedCases as BrowserCase[];
  await save();
}

const browserFiles = [
  ...new Set((selectedCases ?? baseCatalogue()).map((test) => test.file)),
].sort();

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

let fixtureHost: Awaited<ReturnType<typeof serveProductionFixture>> | undefined;
let fullHosts: Awaited<ReturnType<typeof serveFullHosts>> | undefined;
let previewHost: ViteDevServer | undefined;
let testFailures = false;

try {
  for (const [name, args] of steps) {
    // Rebuild generated outputs and rerun prechecks. Browser passes are reused
    // individually below, with current test status and artifact hashes checked.
    console.log(`\nLocal verification: ${name}`);
    const browserEnvironment: NodeJS.ProcessEnv = {};
    let reusedTests: ReusableBrowserTest[] = [];

    if (
      (name.startsWith("browser:") || name === "general-tests") &&
      managedFixture &&
      !fixtureHost &&
      !fullHosts
    ) {
      report.fixtureBundle = fixtureManifest();
      await writeFile(
        path.join(output, "fixture-bundle.json"),
        `${JSON.stringify(report.fixtureBundle, null, 2)}\n`
      );

      if (fullMode) {
        // SAFETY: host startup is inside the authorized Full-mode branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const approvedRun = fullRun as AuthorizedFullRun;

        fullHosts = await serveFullHosts(approvedRun.plan);
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
      } catch {
        // Preserve the existing unavailable/incomplete-evidence fallback.
      }

      if (!previewReady) {
        if (hasText(process.env.GRASSCN_PREVIEW_URL)) {
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

    if (name.startsWith("browser:")) {
      const file = name.slice("browser:".length);
      const directory = path.join(output, "checkpoints", file);

      // SAFETY: managed fixture startup records its bundle before browser cache selection; retain missing-bundle behavior.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const initialFixture = report.fixtureBundle as ReturnType<
        typeof fixtureManifest
      >;

      reusedTests = await reusableBrowserTests(
        previous.filter(
          (candidate) =>
            candidate.report.suite === suite &&
            (!managedFixture ||
              candidate.report.fixtureBundle?.sha256 === initialFixture.sha256)
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

    const code = await new Promise<number>((resolve, reject) => {
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
      child.on("exit", (exitCode, signal) => {
        resolve(exitCode ?? (hasText(signal) ? 1 : 0));
      });
    });

    const check: RuntimeVerificationReceipt["checks"][number] = {
      exitCode: code,
      name,
    };

    if (reusedTests.length) {
      check.reusedTests = reusedTests;
    }

    report.checks.push(check);
    await save();

    if (code !== 0) {
      if (name === "general-tests") {
        testFailures = true;
        continue;
      }

      if (fullMode && name.startsWith("browser:")) {
        const file = name.slice("browser:".length);
        const directory = path.join(output, "checkpoints", file);

        let summary: RuntimeCheckpointSummary | undefined;

        try {
          // SAFETY: checkpoint reporting writes this summary; original completeness checks remain.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          summary = JSON.parse(
            await readFile(path.join(directory, "summary.json"), "utf-8")
          ) as RuntimeCheckpointSummary;
        } catch {
          // Preserve the existing unavailable/incomplete-evidence fallback.
        }

        let collectionComplete = false;

        try {
          // SAFETY: checkpoint reporter owns the expected declaration catalogue.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          const expected = JSON.parse(
            await readFile(path.join(directory, "expected.json"), "utf-8")
          ) as CheckpointCatalogue;

          const journal = await readFile(
            path.join(directory, "results.jsonl"),
            "utf-8"
          );

          const results = journal
            .trim()
            .split("\n")
            .flatMap((line) => {
              if (!line) {
                return [];
              }

              // SAFETY: complete journal lines are owned checkpoint result records.
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion
              const result = JSON.parse(line) as CheckpointResult;

              return [result];
            });

          const terminal = new Set(
            results.flatMap((result) =>
              result.status === "interrupted" ? [] : [result.id]
            )
          );

          // SAFETY: Playwright writes the terminal JSON report; original error checks remain.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          const browserReport = JSON.parse(
            await readFile(path.join(directory, "playwright.json"), "utf-8")
          ) as { errors?: { message?: string }[] };

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

  report.completed = true;
  report.passed = !testFailures;

  if (testFailures) {
    process.exitCode = 1;
  }
} catch (error) {
  // SAFETY: owned checks and Node/browser-host APIs reject with Error instances.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const failure = error as Error;

  report.error = failure.message;
  process.exitCode = 1;
} finally {
  await fullHosts?.close();
  await fixtureHost?.close();
  await previewHost?.close();
  report.finishedAt = new Date().toISOString();
  await save();
  console.log(`Verification receipt: ${receipt}`);
}
