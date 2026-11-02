// Ordered entries preserve retained report bytes and their evidence hashes.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { normalizeCasePath } from "@grasscn/tests/case-paths";
import type { BrowserVerification } from "@grasscn/tests/checkpoints";
import {
  fullRoot,
  readRunPlan,
  readRunState,
  readRunAttempts,
} from "@ppt/full-runs/history";
import type { FullVerificationReceipt } from "@ppt/full-runs/history";
import { readIssuePages, readCommentPages } from "@ppt/full-runs/report-api";
import {
  readRetainedCatalogue,
  readRetainedSummary,
  readRetainedBrowserReport,
  readFindingReview,
  readPublicationJournal,
} from "@ppt/full-runs/report-readers";
import type {
  ReportApiResponse,
  FullCaseRecord,
  FullCaseHistory,
  FullCompletedCase,
  FullReportDraft,
  CompletedRun,
  RetainedResult,
  GitHubFindingIssue,
  GitHubReportComment,
  PublicationJournal,
  PublishedFinding,
  FindingLink,
  FindingRecord,
  FindingReviewDraft,
  GitHubPublicationBody,
  ReportDocument,
  ReportComparable,
  PreparedReport,
  PublishedReport,
  RepairHandoff,
} from "@ppt/full-runs/report-types";
import {
  evidenceLocation,
  validateReview,
  findingBody,
} from "@ppt/full-runs/review";
import type { RetainedArtifact } from "@ppt/full-runs/review";
import { caseKey } from "@ppt/selection/suite";

export { validateReview } from "@ppt/full-runs/review";

const hasText = (value: string | null | undefined): value is string =>
  value !== undefined && value !== null && value !== "";

const hasNonzeroNumber = (value: number | null | undefined): value is number =>
  value !== undefined && value !== null && value !== 0 && !Number.isNaN(value);

const hash = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const json = (value: ReportDocument) => `${JSON.stringify(value, null, 2)}\n`;

const api = (args: string[]) => {
  const parsed: unknown = JSON.parse(
    execFileSync("gh", ["api", ...args], {
      cwd: fullRoot,
      encoding: "utf-8",
      maxBuffer: 128 * 1024 * 1024,
    })
  );

  // SAFETY: these endpoints return only issue/comment records or paginated arrays of those records.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return parsed as ReportApiResponse;
};

const same = (a: ReportComparable, b: ReportComparable) =>
  JSON.stringify(a) === JSON.stringify(b);

const atomic = function atomic(file: string, value: ReportDocument) {
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, json(value));
  fs.renameSync(temp, file);
};

const beneath = function beneath(root: string, file: string) {
  const resolved = fs.realpathSync(file);
  const parent = fs.realpathSync(root);

  if (!resolved.startsWith(parent + path.sep)) {
    throw new Error(`Evidence escapes retained attempt: ${file}`);
  }

  return resolved;
};

const evidence = function evidence(root: string, file: string) {
  const retainedFile = beneath(root, file);

  return {
    localPath: retainedFile,
    sha256: hash(fs.readFileSync(retainedFile)),
  };
};

/** Read historical evidence only. Never calls authorizeFullRun or launches a browser. */
export const completedRunReport = function completedRunReport(
  number: string | number | undefined
) {
  const run = readRunPlan(number);
  const testedCommit = run.plan.commit;
  const state = readRunState(number);

  if (run.plan.repository.toLowerCase() !== run.repo.toLowerCase()) {
    throw new Error("Run repository mismatch");
  }

  if (
    state?.phase !== "completed" ||
    !["passed", "failed"].some((outcome) => outcome === state.outcome)
  ) {
    throw new Error(
      "Full collection is incomplete; defer finding publication and repairs"
    );
  }

  if (
    state.issue !== run.number ||
    state.repository !== run.repo ||
    state.commit !== testedCommit ||
    state.planHash !== run.planHash ||
    !same(state.environment, run.plan.environment) ||
    !hasText(state.executionThread) ||
    !hasNonzeroNumber(state.approval?.eventId)
  ) {
    throw new Error(
      "Completed state does not bind this plan, snapshot, environment and executor"
    );
  }

  const attempts = readRunAttempts(number).sort((a, b) =>
    a.directory.localeCompare(b.directory)
  );

  const final = attempts.find(
    (attempt) =>
      path.resolve(attempt.directory) === path.resolve(state.attempt ?? "")
  );

  if (
    !final ||
    final !== attempts.at(-1) ||
    state.receipt !== path.join(final.directory, "verification.json")
  ) {
    throw new Error(
      "Final attempt/receipt binding is missing or newer evidence exists"
    );
  }

  const last = final.receipt;

  if (
    last?.completed !== true ||
    last.browserScope !== "full" ||
    last.suite !== "full" ||
    last.passed !== (state.outcome === "passed") ||
    !Array.isArray(last.fullCases) ||
    !last.fullCases.length
  ) {
    throw new Error(
      "No complete Full receipt with exact scope; finishedAt alone is insufficient"
    );
  }

  const scope = new Map(last.fullCases.map((test) => [caseKey(test), test]));

  if (scope.size !== last.fullCases.length) {
    throw new Error("Duplicate Full scope identities");
  }

  const records = new Map<string | undefined, FullCaseRecord>();
  const history = new Map<string, FullCaseHistory[]>();
  const sourceHashes = new Map<string, Set<string>>();
  const ownerSources = new Map<string, string>();
  const definitionHashes = new Map<string, Set<string>>();
  const files = new Set(last.fullCases.map((test) => test.file));
  const retainedEvidence: RetainedArtifact[] = [];

  let environment: FullVerificationReceipt["environment"] | undefined;

  for (const attempt of attempts) {
    beneath(run.paths.attempts, attempt.directory);
    const resourceFile = path.join(attempt.directory, "resource-summary.json");

    if (fs.existsSync(resourceFile)) {
      retainedEvidence.push(evidence(attempt.directory, resourceFile));
    }

    const { receipt } = attempt;

    if (!receipt) {
      if (
        attempt === final ||
        fs.existsSync(path.join(attempt.directory, "checkpoints"))
      ) {
        throw new Error(
          `Missing attempt receipt with collection evidence: ${attempt.directory}`
        );
      }

      // A guard can stop before verification starts. This attempt contributes no results.
      continue;
    }

    const binding = receipt.environment?.fullRun;

    if (
      receipt.source?.commit !== testedCommit ||
      receipt.browserScope !== "full" ||
      binding?.issue !== run.number ||
      binding?.planHash !== run.planHash ||
      binding?.approvalEvent !== state.approval.eventId
    ) {
      throw new Error(
        "Attempt belongs to different source, scope or authorization"
      );
    }

    for (const field of [
      "bun",
      "platform",
      "arch",
      "timezone",
      "locale",
      "ci",
      "webgl",
      "edge",
    ] as const) {
      if (!same(receipt.environment[field], run.plan.environment[field])) {
        throw new Error(`Receipt environment differs from approved ${field}`);
      }
    }

    if (
      receipt.environment.workers !== run.plan.execution.workers ||
      receipt.environment.installedDependencies?.installedSha256 !==
        run.plan.environment.installedDependenciesSha256 ||
      receipt.environment.installedDependencies?.lockSha256 !==
        run.plan.environment.bunLockSha256
    ) {
      throw new Error(
        "Receipt workers/dependencies differ from approved environment"
      );
    }

    if (
      environment &&
      (!same(environment, receipt.environment) ||
        receipt.source.treeSha256 !== last.source.treeSha256)
    ) {
      throw new Error("Attempt environment/tree changed across resumes");
    }

    ({ environment } = receipt);

    if (receipt.sourceAfter && !same(receipt.sourceAfter, receipt.source)) {
      throw new Error("Source changed during collection");
    }

    if (
      receipt.completed &&
      (!same(
        receipt.dependenciesAfter,
        receipt.environment.installedDependencies
      ) ||
        receipt.fixtureBundleAfter?.sha256 !== receipt.fixtureBundle?.sha256)
    ) {
      throw new Error("Completed receipt changed dependencies or fixture");
    }

    retainedEvidence.push(
      evidence(
        attempt.directory,
        path.join(attempt.directory, "verification.json")
      )
    );

    for (const file of files) {
      if (normalizeCasePath(file) !== file) {
        throw new Error("Browser file is outside Full scope");
      }

      const directory = path.join(attempt.directory, "checkpoints", file);

      if (!fs.existsSync(directory)) {
        continue;
      }

      const check = receipt.checks?.find(
        (item) => item.name === `browser:${file}`
      );

      const expectedFile = beneath(
        attempt.directory,
        path.join(directory, "expected.json")
      );

      // SAFETY: the retained checkpoint reporter writes this declaration catalogue; existing schema/source checks remain below.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const expected = readRetainedCatalogue(expectedFile);

      if (
        ![2, 3].includes(expected.schemaVersion) ||
        !Array.isArray(expected.tests)
      ) {
        throw new Error("Invalid checkpoint declarations");
      }

      retainedEvidence.push(evidence(attempt.directory, expectedFile));

      const journalFile = beneath(
        attempt.directory,
        path.join(directory, "results.jsonl")
      );

      retainedEvidence.push(evidence(attempt.directory, journalFile));

      const raw = fs.readFileSync(journalFile, "utf-8");
      const lines = raw.split("\n");

      if (!raw.endsWith("\n")) {
        lines.pop();
      }

      const journal = lines.filter(Boolean).map(
        (line) =>
          // SAFETY: each complete journal line is a checkpoint reporter result with existing identity checks below.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          JSON.parse(line) as RetainedResult
      );

      const declarations = new Map(
        expected.tests.map((test) => [test.id, test])
      );

      if (!sourceHashes.has(file)) {
        // Resolve the path in the approved snapshot, including pre-extraction runs.
        const candidates =
          receipt.pptOnly === true
            ? [`packages/pixel-perfect/tests/${file}`]
            : [
                `packages/pixel-perfect/tests/${file}`,
                `packages/tests/tests/${file}`,
              ];

        const sources = execFileSync(
          "git",
          ["ls-tree", "-r", "--name-only", testedCommit, "--", ...candidates],
          { cwd: fullRoot, encoding: "utf-8" }
        )
          .trim()
          .split("\n")
          .filter(Boolean);

        if (sources.length !== 1) {
          throw new Error(
            `Ambiguous or missing source in approved snapshot: ${file}`
          );
        }

        ownerSources.set(file, sources[0]);

        const bytes = execFileSync(
          "git",
          ["show", `${testedCommit}:${sources[0]}`],
          { cwd: fullRoot, maxBuffer: 16 * 1024 * 1024 }
        );

        // Windows core.autocrlf checks out committed text with CRLF; both byte
        // representations identify the same committed source, not changed logic.
        sourceHashes.set(
          file,
          new Set([
            hash(bytes),
            hash(bytes.toString("utf-8").replaceAll(/\r?\n/gu, "\r\n")),
          ])
        );
      }

      for (const declaration of expected.tests) {
        const key = caseKey({ file, titlePath: declaration.title?.slice(2) });

        // SAFETY: this file's source-hash cache is initialized immediately above.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const approvedSourceHashes = sourceHashes.get(file) as Set<string>;

        if (
          !scope.has(key) ||
          !approvedSourceHashes.has(declaration.sourceSha256)
        ) {
          throw new Error(
            "Declaration source or case identity differs from approved scope"
          );
        }

        if (expected.schemaVersion === 2) {
          // A legacy helper declaration cannot establish the owning wrapper's source.
          const recorded = normalizeCasePath(declaration.file);

          if (
            ![file, `tests/${file}`, ownerSources.get(file)].includes(recorded)
          ) {
            throw new Error(
              "Legacy declaration does not prove a direct owning case source"
            );
          }
        } else {
          if (
            !hasText(expected.sourceRoot) ||
            !hasText(expected.repositoryRoot) ||
            !Array.isArray(declaration.sourceFiles)
          ) {
            throw new Error("Checkpoint is missing source-root binding");
          }

          const owner = normalizeCasePath(declaration.file);
          const definition = normalizeCasePath(declaration.definitionFile);

          if (
            owner !== declaration.file ||
            definition !== declaration.definitionFile
          ) {
            throw new Error("Checkpoint source paths are not canonical");
          }

          const ownerAbsolute = path.resolve(expected.sourceRoot, owner);

          const caseFile = normalizeCasePath(
            path
              .relative(expected.rootDir, ownerAbsolute)
              .replaceAll(path.sep, "/")
          );

          const ownerRepositoryFile = normalizeCasePath(
            path
              .relative(expected.repositoryRoot, ownerAbsolute)
              .replaceAll(path.sep, "/")
          );

          if (
            caseFile !== file ||
            ownerRepositoryFile !== ownerSources.get(file)
          ) {
            throw new Error(
              "Checkpoint owner differs from approved case source"
            );
          }

          const required = new Map([
            [owner, declaration.sourceSha256],
            [definition, declaration.definitionSha256],
          ]);

          if (required.size !== declaration.sourceFiles.length) {
            throw new Error(
              "Checkpoint does not bind exactly its owner and definition sources"
            );
          }

          for (const source of declaration.sourceFiles) {
            const sourceFile = normalizeCasePath(source.file);

            if (
              sourceFile !== source.file ||
              required.get(sourceFile) !== source.sha256
            ) {
              throw new Error("Checkpoint source inputs are ambiguous");
            }

            const repositoryFile = normalizeCasePath(
              path
                .relative(
                  expected.repositoryRoot,
                  path.resolve(expected.sourceRoot, sourceFile)
                )
                .replaceAll(path.sep, "/")
            );

            if (repositoryFile.includes(":")) {
              throw new Error(
                "Checkpoint source is outside the approved repository"
              );
            }

            if (!definitionHashes.has(repositoryFile)) {
              const bytes = execFileSync(
                "git",
                ["show", `${testedCommit}:${repositoryFile}`],
                { cwd: fullRoot, maxBuffer: 16 * 1024 * 1024 }
              );

              definitionHashes.set(
                repositoryFile,
                new Set([
                  hash(bytes),
                  hash(bytes.toString("utf-8").replaceAll(/\r?\n/gu, "\r\n")),
                ])
              );
            }

            // SAFETY: this repository source's hash cache is populated above.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            const approvedDefinitionHashes = definitionHashes.get(
              repositoryFile
            ) as Set<string>;

            if (!approvedDefinitionHashes.has(source.sha256)) {
              throw new Error(
                "Checkpoint definition source differs from approved snapshot"
              );
            }

            required.delete(sourceFile);
          }

          if (required.size) {
            throw new Error("Checkpoint omitted a source input");
          }
        }
      }

      const terminal = new Set();
      const accounted = new Set();

      for (const record of journal) {
        const declaration = declarations.get(record.id);

        if (
          !declaration ||
          !same(record.title, declaration.title) ||
          record.file !== declaration.file ||
          record.sourceChanged !== false ||
          !Number.isInteger(record.retry)
        ) {
          throw new Error("Journal identity or source changed");
        }

        if (
          expected.schemaVersion === 3 &&
          (record.definitionFile !== declaration.definitionFile ||
            record.sourceSha256 !== declaration.sourceSha256 ||
            record.definitionSha256 !== declaration.definitionSha256 ||
            !same(record.sourceFiles, declaration.sourceFiles))
        ) {
          throw new Error(
            "Journal source binding differs from its declaration"
          );
        }

        if (
          !["passed", "failed", "timedOut", "skipped", "interrupted"].includes(
            record.status
          ) ||
          !["passed", "failed", "skipped"].includes(record.expectedStatus)
        ) {
          throw new Error("Invalid recorded result status");
        }

        const key = caseKey({ file, titlePath: declaration.title.slice(2) });
        accounted.add(key);

        const artifacts = (record.verification?.artifacts ?? []).map(
          (artifact) => {
            if (path.basename(artifact.file) !== artifact.file) {
              throw new Error("Invalid artifact filename");
            }

            // SAFETY: artifact iteration comes from this same checkpoint verification attachment.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            const verification = record.verification as BrowserVerification;

            const result = evidence(
              attempt.directory,
              path.join(verification.outputDirectory, artifact.file)
            );

            if (result.sha256 !== artifact.pngSha256) {
              throw new Error("Artifact hash changed");
            }

            return result;
          }
        );

        // SAFETY: these ordered entries define exactly the owned Full case-record protocol.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const result = Object.fromEntries([
          ["key", key],
          ["file", file],
          ["titlePath", declaration.title.slice(2)],
          ["status", record.status],
          ["expectedStatus", record.expectedStatus],
          ["retry", record.retry],
          ["errors", record.errors],
          ["artifacts", artifacts],
          ["verification", record.verification],
          ["journal", journalFile],
          ["attempt", attempt.directory],
        ]) as FullCaseRecord;

        const previous = records.get(key);

        if (
          previous?.attempt === attempt.directory &&
          record.retry < previous.retry
        ) {
          throw new Error("Retry journal regressed");
        }

        records.set(key, result);
        // SAFETY: these ordered entries preserve one exact case-history record.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        history.set(key, [
          ...(history.get(key) ?? []),
          // SAFETY: these ordered entries define the owned case-history record.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          Object.fromEntries([
            ["status", record.status],
            ["expectedStatus", record.expectedStatus],
            ["retry", record.retry],
            ["attempt", attempt.directory],
          ]) as FullCaseHistory,
        ]);

        if (record.status !== "interrupted") {
          terminal.add(record.id);
        }
      }

      if (receipt.completed) {
        const summaryFile = beneath(
          attempt.directory,
          path.join(directory, "summary.json")
        );

        // SAFETY: the checkpoint reporter writes this terminal summary; original completeness checks remain below.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const summary = readRetainedSummary(summaryFile);

        const browserFile = beneath(
          attempt.directory,
          path.join(directory, "playwright.json")
        );

        // SAFETY: Playwright JSON reporter writes its root errors array; original completion checks remain below.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const browser = readRetainedBrowserReport(browserFile);

        retainedEvidence.push(
          evidence(attempt.directory, summaryFile),
          evidence(attempt.directory, browserFile)
        );

        if (
          !["passed", "failed"].includes(summary.status) ||
          hasNonzeroNumber(summary.changedSources?.length) ||
          hasNonzeroNumber(summary.counts?.interrupted) ||
          hasNonzeroNumber(browser.errors?.length) ||
          (raw && !raw.endsWith("\n")) ||
          expected.tests.some((test) => !terminal.has(test.id))
        ) {
          throw new Error(
            "Completed receipt has incomplete/corrupt browser collection"
          );
        }
      }

      for (const reused of check?.reusedTests ?? []) {
        // Retained identities are checked below through the prior attempt declarations, not titles in a command string.
        const from = attempts.find(
          (item) =>
            path.join(item.directory, "verification.json") === reused.from
        );

        if (!from) {
          throw new Error("Retained pass has no source-bound attempt");
        }

        const old = readRetainedCatalogue(
          beneath(
            from.directory,
            path.join(from.directory, "checkpoints", file, "expected.json")
          )
        ).tests.find((test) => test.id === reused.id);

        const key = old && caseKey({ file, titlePath: old.title.slice(2) });
        const retained = records.get(key);

        if (
          !retained ||
          retained.status !== "passed" ||
          retained.expectedStatus !== "passed" ||
          retained.retry !== 0 ||
          retained.attempt !== from.directory
        ) {
          throw new Error(
            "Retained pass was superseded or lacks valid provenance"
          );
        }

        accounted.add(key);
      }

      if (
        attempt === final &&
        [...scope].some(
          ([key, test]) => test.file === file && !accounted.has(key)
        )
      ) {
        throw new Error(
          "Final file omitted cases without retained-pass provenance"
        );
      }
    }
  }

  for (const file of files) {
    if (!last.checks?.some((check) => check.name === `browser:${file}`)) {
      throw new Error("Final receipt did not finish every Full file");
    }
  }

  if (
    last.checks.some(
      (check) => !check.name.startsWith("browser:") && check.exitCode !== 0
    )
  ) {
    throw new Error("Precheck failed before Full completion");
  }

  const cases = [...scope.keys()].map((key) => {
    const result = records.get(key);

    if (!result || result.status === "interrupted") {
      throw new Error(`Uncollected Full case: ${key}`);
    }

    // SAFETY: every case record is inserted together with its history in the journal loop.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const caseHistory = history.get(key) as FullCaseHistory[];

    // SAFETY: the owned result plus these ordered derived fields forms a complete final case.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return Object.fromEntries([
      ...Object.entries(result),
      ["history", caseHistory],
      ["unexpected", result.status !== result.expectedStatus],
      [
        "flaky",
        ["passed", "failed", "timedOut"].includes(result.status) &&
          result.status === result.expectedStatus &&
          caseHistory.some(
            (item) =>
              ["passed", "failed", "timedOut"].includes(item.status) &&
              item.status !== item.expectedStatus
          ),
      ],
    ]) as FullCompletedCase;
  });

  if (cases.some((test) => test.unexpected) === last.passed) {
    throw new Error("Receipt outcome disagrees with final case results");
  }

  // SAFETY: these ordered entries define the report before its evidence hash is appended.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const reportDraft = Object.fromEntries([
    ["schemaVersion", 1],
    ["runIssue", run.number],
    ["repository", run.repo],
    ["issueUrl", run.issue.html_url],
    ["testedCommit", testedCommit],
    ["planHash", run.planHash],
    ["scope", "full"],
    ["environment", run.plan.environment],
    ["executionThread", state.executionThread],
    ["executionSession", state.executionSession],
    ["approval", state.approval],
    ["outcome", state.outcome],
    ["total", cases.length],
    ["failures", cases.filter((test) => test.unexpected)],
    ["flaky", cases.filter((test) => test.flaky)],
    [
      "skipped",
      cases.flatMap((test) => (test.status === "skipped" ? [test.key] : [])),
    ],
    ["evidence", retainedEvidence],
  ]) as FullReportDraft;

  const report = Object.assign(reportDraft, {
    evidenceHash: hash(json(reportDraft)),
  });

  // SAFETY: these ordered entries return the bound run and its completed report.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Object.fromEntries([
    ["run", run],
    ["report", report],
  ]) as CompletedRun;
};

export const prepareReport = function prepareReport(
  number: string | number | undefined
) {
  const { run, report } = completedRunReport(number);
  const directory = path.join(run.paths.directory, "reporting");
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, `report-${report.evidenceHash}.json`);
  atomic(file, report);

  // SAFETY: these ordered entries define the prepared review template, including contributor instructions.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const review = Object.fromEntries([
    ["schemaVersion", 1],
    ["runIssue", run.number],
    ["planHash", run.planHash],
    ["testedCommit", run.plan.commit],
    ["evidenceHash", report.evidenceHash],
    ["reviewedBy", ""],
    ["groups", []],
    [
      "instructions",
      "Inspect evidence and existing issues. Account for every failure exactly once. Each semantic problemKey needs a cause hypothesis and evidence; shared error text alone is not a root cause. Optional existingIssue requires reuseReason. No repairs until collection completes.",
    ],
  ]) as FindingReviewDraft;

  const reviewFile = path.join(directory, `review-${report.evidenceHash}.json`);

  if (!fs.existsSync(reviewFile)) {
    atomic(reviewFile, review);
  }

  // SAFETY: these ordered entries are the report preparation command result.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Object.fromEntries([
    ["report", file],
    ["review", reviewFile],
    ["failures", report.failures.length],
    ["flaky", report.flaky.length],
    ["publishing", false],
  ]) as PreparedReport;
};

export const publishReport = function publishReport(
  number: string | number | undefined,
  reviewFile: string
) {
  const { run, report } = completedRunReport(number);
  // SAFETY: this file is the contributor's completed finding-review document, validated immediately below.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const review = readFindingReview(reviewFile);

  validateReview(report, review);
  const directory = path.join(run.paths.directory, "reporting");
  fs.mkdirSync(directory, { recursive: true });
  const lock = path.join(directory, "publication.lock");

  try {
    fs.writeFileSync(
      lock,
      json({ pid: process.pid, startedAt: new Date().toISOString() }),
      { flag: "wx" }
    );
  } catch (error) {
    // SAFETY: the try block only performs the exclusive Node filesystem lock write.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const failure = error as NodeJS.ErrnoException;

    if (failure.code === "EEXIST") {
      throw new Error(
        `Another publisher or stale publication claim exists: ${lock}; inspect before removing it`,
        { cause: error }
      );
    }

    throw error;
  }

  const journalFile = path.join(directory, "publication.json");

  // SAFETY: prior publication writes this journal; preserve all extra persisted fields.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const journal: PublicationJournal = fs.existsSync(journalFile)
    ? readPublicationJournal(journalFile)
    : { groups: {} };

  const writeApi = function writeApi(
    endpoint: string,
    body: GitHubPublicationBody,
    method = "POST"
  ) {
    const file = path.join(directory, `request-${process.pid}.json`);
    fs.writeFileSync(file, json(body));

    try {
      return api(["--method", method, endpoint, "--input", file]);
    } finally {
      fs.rmSync(file, { force: true });
    }
  };

  const writeIssueComment = (
    endpoint:
      | `repos/${string}/issues/${number}/comments`
      | `repos/${string}/issues/comments/${number}`,
    body: { body: string },
    method = "POST"
  ) =>
    // SAFETY: both comment create/update endpoints return REST issue-comment records.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    writeApi(endpoint, body, method) as GitHubReportComment;

  try {
    // Paginate bodies rather than relying on eventually indexed search. After an ambiguous
    // API error, stop; a later invocation scans operation markers before retrying writes.
    // SAFETY: the paginated issue-list endpoint returns arrays of REST issue records.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const issues = readIssuePages([
      "--paginate",
      "--slurp",
      `repos/${run.repo}/issues?state=all&per_page=100`,
    ])
      .flat()
      .filter((issue) => !issue.pull_request);

    // SAFETY: the paginated repository-comment endpoint returns arrays of REST comment records.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const repositoryComments = review.groups.length
      ? readCommentPages([
          "--paginate",
          "--slurp",
          `repos/${run.repo}/issues/comments?per_page=100`,
        ]).flat()
      : [];

    atomic(evidenceLocation(report), report);
    const links: FindingLink[] = [];

    for (const group of review.groups) {
      const identity = hash(`${run.repo.toLowerCase()}\n${group.problemKey}`);
      const marker = `<!-- grasscn-full-problem:v1:${identity} -->`;

      const occurrence = `<!-- grasscn-full-occurrence:v1:${run.number}:${run.planHash}:${identity} -->`;

      const matches = issues.filter(
        (issue) =>
          issue.body?.includes(marker) ??
          repositoryComments.some(
            (comment) =>
              comment.issue_url === issue.url &&
              comment.body?.includes(marker) === true
          )
      );

      if (matches.length > 1) {
        throw new Error(
          "Multiple issues already claim this semantic problem; resolve duplicates before publishing"
        );
      }

      let issue = matches.at(0);

      if (hasNonzeroNumber(group.existingIssue)) {
        const chosen = issues.find(
          (item) => item.number === group.existingIssue
        );

        if (
          !chosen ||
          chosen.number === run.number ||
          (issue && issue.number !== chosen.number)
        ) {
          throw new Error(
            "Reviewed existing issue is invalid or conflicts with problem identity"
          );
        }

        issue = chosen;
      }

      if (!issue) {
        // SAFETY: this exact issue-create body and response follow GitHub issue endpoint contracts.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        issue = writeApi(
          `repos/${run.repo}/issues`,
          // SAFETY: these ordered entries are the issue-create title, body and labels request.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          Object.fromEntries([
            ["title", group.title],
            ["body", `${marker}\n\n${findingBody(report, group)}`],
            ["labels", ["needs-triage"]],
          ]) as GitHubPublicationBody
        ) as GitHubFindingIssue;
        issues.push(issue);
      }

      // SAFETY: these ordered entries define the retained finding and its reviewed evidence binding.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      atomic(
        path.join(directory, `finding-${hash(group.problemKey)}.json`),
        // SAFETY: these ordered entries bind the reviewed finding to its report.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        Object.fromEntries([
          ["report", evidenceLocation(report)],
          ["reportSha256", hash(json(report))],
          ["reviewedBy", review.reviewedBy],
          ["group", group],
        ]) as FindingRecord
      );

      // SAFETY: these ordered entries bind this reviewed problem to its published issue.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const publishedGroup = Object.fromEntries([
        ["issue", issue.number],
        ["url", issue.html_url],
        ["evidenceHash", report.evidenceHash],
        ["groupHash", hash(json(group))],
      ]) as PublishedFinding;

      journal.groups[group.problemKey] = publishedGroup;
      atomic(journalFile, journal);

      // SAFETY: the paginated comment endpoint returns arrays of REST issue-comment records.

      // oxlint-disable-next-line typescript/no-unsafe-type-assertion

      const comments = readCommentPages([
        "--paginate",
        "--slurp",
        `repos/${run.repo}/issues/${issue.number}/comments`,
      ]).flat();

      if (
        !comments.some((comment) => comment.body?.includes(occurrence) === true)
      ) {
        // SAFETY: the create-comment endpoint returns a REST issue-comment record.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const comment = writeIssueComment(
          `repos/${run.repo}/issues/${issue.number}/comments`,
          {
            body: `${marker}\n${occurrence}\n\n${hasText(group.reuseReason) ? `Reuse rationale: ${group.reuseReason}\n\n` : ""}${findingBody(report, group)}`,
          }
        );

        publishedGroup.comment = comment.id;
        atomic(journalFile, journal);
      }

      // SAFETY: these ordered entries are the finding link shown in the report.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      links.push(
        // SAFETY: these ordered entries define the problem, issue URL and state link.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        Object.fromEntries([
          ["problem", group.problemKey],
          ["issue", issue.html_url],
          ["state", issue.state],
        ]) as FindingLink
      );
    }

    const marker = `<!-- grasscn-full-report:v1:${run.number}:${run.planHash} -->`;
    const body = `${marker}\n\nFull collection completed: **${report.outcome}** against local commit ${report.testedCommit}. Scope: ${report.total} Full cases; ${report.failures.length} unexpected final results, ${report.flaky.length} recovered/flaky cases, ${report.skipped.length} skipped. Skips are not passes.\n\nPlan hash: ${report.planHash}\nExecution session: ${report.executionSession ?? report.executionThread}\nEnvironment: ${JSON.stringify(report.environment)}\nReviewed by: ${review.reviewedBy}\nEvidence bundle sha256 identity: ${report.evidenceHash}\n\n${links.map((link) => `- ${link.problem}: ${link.issue} (${link.state}; no automatic reopening)`).join("\n") || "No unexpected final failures."}\n\nFlaky case identities: ${report.flaky.length} (complete identities in local report bundle)\nSkipped case identities: ${report.skipped.length} (complete identities in local report bundle)\n\nLocal retained evidence (not uploaded):\n${evidenceLocation(report)} (file sha256 ${hash(json(report))}); contains every attempt receipt/journal/artifact path and recorded sha256\n\nThese results apply only to this Full snapshot. Base coverage is separate. Findings enter the normal work queue; merging is not blocked. Repairs may use any suitable session after completion. A Full rerun needs a new issue, human approval and independent execution session.\n`;

    // SAFETY: the paginated comment endpoint returns arrays of REST issue-comment records.

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion

    const comments = readCommentPages([
      "--paginate",
      "--slurp",
      `repos/${run.repo}/issues/${run.number}/comments`,
    ]).flat();

    const existing = comments.filter(
      (comment) => comment.body?.includes(marker) === true
    );

    if (existing.length > 1) {
      throw new Error("Duplicate run report markers require review");
    }

    // SAFETY: comment update/create endpoints both return a REST issue-comment record.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const comment = existing.length
      ? writeIssueComment(
          `repos/${run.repo}/issues/comments/${existing[0].id}`,
          { body },
          "PATCH"
        )
      : writeIssueComment(`repos/${run.repo}/issues/${run.number}/comments`, {
          body,
        });

    journal.report = { comment: comment.id, evidenceHash: report.evidenceHash };
    atomic(journalFile, journal);

    // SAFETY: these ordered entries are the publication command result.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return Object.fromEntries([
      ["reportComment", comment.html_url],
      ["findings", links],
    ]) as PublishedReport;
  } finally {
    fs.rmSync(lock, { force: true });
  }
};

export const repairHandoff = function repairHandoff(
  number: string | number | undefined,
  reviewFile: string,
  problemKey: string | undefined
) {
  const { run, report } = completedRunReport(number);
  // SAFETY: this file is the contributor's completed finding-review document, validated immediately below.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const review = readFindingReview(reviewFile);

  validateReview(report, review);
  const group = review.groups.find((item) => item.problemKey === problemKey);

  if (!group) {
    throw new Error("Unknown reviewed problem key");
  }

  const directory = path.join(run.paths.directory, "reporting");
  fs.mkdirSync(directory, { recursive: true });

  const journalFile = path.join(directory, "publication.json");

  // SAFETY: the publication writer owns this journal's finding bindings.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const published = fs.existsSync(journalFile)
    ? readPublicationJournal(journalFile).groups?.[group.problemKey]
    : null;

  const issue = published?.url;

  if (
    !hasText(issue) ||
    published?.evidenceHash !== report.evidenceHash ||
    published?.groupHash !== hash(json(group))
  ) {
    throw new Error(
      "Publish/link this reviewed finding and evidence before creating its repair handoff"
    );
  }

  const file = path.join(directory, `repair-${problemKey}.md`);
  fs.writeFileSync(
    file,
    `# Repair handoff: ${group.title}\n\nFinding issue: ${issue}\n\n${findingBody(report, group)}`
  );

  // SAFETY: these ordered entries are the nonexecuting repair-handoff result.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Object.fromEntries([
    ["handoff", file],
    ["issue", issue],
    ["sessionCreated", false],
    ["fullExecutionAuthorized", false],
  ]) as RepairHandoff;
};
