import { createHash } from "node:crypto";
import path from "node:path";

import type { TestError } from "@playwright/test/reporter";
import { fullRunPaths } from "@ppt/full-runs/history";
import type { FullEnvironment } from "@ppt/full-runs/plan";

export interface RetainedArtifact {
  localPath: string;
  sha256: string;
}

export interface CompletedFindingCase {
  key: string;
  expectedStatus: string;
  status: string;
  retry: number;
  errors?: TestError[];
  artifacts: RetainedArtifact[];
  journal: string;
}

export interface CompletedReport {
  runIssue: number;
  repository: string;
  issueUrl: string;
  testedCommit: string;
  planHash: string;
  evidenceHash: string;
  executionSession?: string;
  executionThread?: string;
  environment: FullEnvironment;
  failures: CompletedFindingCase[];
}

export interface FindingGroup {
  problemKey: string;
  title: string;
  hypothesis: string;
  evidence: string;
  context: string;
  cases: string[];
  existingIssue?: number;
  reuseReason?: string;
}

export interface FindingReview {
  schemaVersion: number;
  runIssue: number;
  planHash: string;
  testedCommit: string;
  evidenceHash: string;
  reviewedBy: string;
  groups: FindingGroup[];
}

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

// No GitHub read or authorization needed to locate durable local reporting artifacts.
export const readRunPlanPaths = (number: string | number | undefined) =>
  path.join(fullRunPaths(number).directory, "reporting");

export const evidenceLocation = (report: CompletedReport) =>
  path.join(
    readRunPlanPaths(report.runIssue),
    `report-${report.evidenceHash}.json`
  );

const assertReviewBinding = (
  report: CompletedReport,
  review: FindingReview
) => {
  if (
    review.schemaVersion !== 1 ||
    review.runIssue !== report.runIssue ||
    review.planHash !== report.planHash ||
    review.testedCommit !== report.testedCommit ||
    review.evidenceHash !== report.evidenceHash ||
    !review.reviewedBy?.trim() ||
    !Array.isArray(review.groups)
  ) {
    throw new Error(
      "Review must bind the completed evidence and name its reviewer"
    );
  }
};

const assertGroupDescription = (
  group: FindingGroup,
  keys: ReadonlySet<string>
) => {
  if (
    !/^[a-z0-9][a-z0-9.-]{2,100}$/u.test(group.problemKey ?? "") ||
    keys.has(group.problemKey) ||
    !group.title?.trim() ||
    !group.hypothesis?.trim() ||
    !group.evidence?.trim() ||
    !group.context?.trim() ||
    !group.cases?.length
  ) {
    throw new Error(
      "Each distinct problem needs a unique semantic key, title, hypothesis, evidence, context and member cases"
    );
  }
};

export const validateReview = (
  report: CompletedReport,
  review: FindingReview
) => {
  assertReviewBinding(report, review);

  const remaining = new Set(report.failures.map((test) => test.key));
  const keys = new Set<string>();

  for (const group of review.groups) {
    assertGroupDescription(group, keys);

    keys.add(group.problemKey);

    if (
      group.existingIssue !== undefined &&
      (!Number.isInteger(group.existingIssue) ||
        group.existingIssue < 1 ||
        !(group.reuseReason?.trim() ?? ""))
    ) {
      throw new Error(
        "Existing issue reuse requires an issue number and semantic reason"
      );
    }

    for (const key of group.cases) {
      if (!remaining.delete(key)) {
        throw new Error(
          "Failure omitted, duplicated or outside this completed run"
        );
      }
    }
  }

  if (remaining.size) {
    throw new Error(
      `${remaining.size} failures remain ungrouped; inspect them before publication`
    );
  }
};

export const findingBody = (report: CompletedReport, group: FindingGroup) => {
  const memberCaseKeys = new Set(group.cases);
  const failures = report.failures.filter((test) =>
    memberCaseKeys.has(test.key)
  );

  return `Full finding from ${report.issueUrl}\n\nTested local commit: ${report.testedCommit}\nPlan: ${report.planHash}\nEvidence identity: ${report.evidenceHash}\nExecution session: ${String(report.executionSession ?? report.executionThread)}\nEnvironment: ${JSON.stringify(report.environment)}\n\nCause hypothesis: ${group.hypothesis}\n\nReviewed evidence: ${group.evidence}\n\nRepair context: ${group.context}\n\n${failures.length} affected cases; first 10:\n${failures
    .slice(0, 10)
    .map(
      (test) =>
        `- ${test.key}: expected ${test.expectedStatus}, observed ${test.status}; retry ${test.retry}. Errors: ${JSON.stringify(test.errors)?.slice(0, 1000)}\n  Local journal: ${test.journal}\n${test.artifacts
          .slice(0, 3)
          .map(
            (artifact) =>
              `  Local artifact: ${artifact.localPath} (sha256 ${artifact.sha256})`
          )
          .join("\n")}`
    )
    .join(
      "\n"
    )}\n\nComplete case/error/retry history and hashed evidence manifest (local, not uploaded): ${evidenceLocation(report)}\nReviewed membership/context: ${path.join(readRunPlanPaths(report.runIssue), `finding-${hash(group.problemKey)}.json`)}\n\nThe Full collection is complete. This finding enters the normal queue and does not block merging. Any suitable existing session, including the main session when its context fits, may repair it. Use a new repair session with this handoff when appropriate; do not create one per case. Reporting, assignment and reproduction commands grant no Full execution authorization. Changed-source Full validation requires a new run issue, human maintainer label approval and an independent executor. Base results and this historical Full snapshot establish only their own coverage.\n`;
};
