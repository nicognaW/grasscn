import type {
  BrowserVerification,
  CheckpointCatalogue,
  CheckpointDeclaration,
  CheckpointResult,
  CheckpointSource,
} from "@grasscn/tests/checkpoints";
import type {
  FullApproval,
  FullVerificationReceipt,
  readRunPlan,
} from "@ppt/full-runs/history";
import type { FullEnvironment } from "@ppt/full-runs/plan";
import type {
  CompletedFindingCase,
  CompletedReport,
  FindingGroup,
  FindingReview,
  RetainedArtifact,
} from "@ppt/full-runs/review";

export interface RetainedDeclaration extends CheckpointDeclaration {
  file: string;
  title: string[];
}

export interface RetainedCatalogue extends Omit<CheckpointCatalogue, "tests"> {
  repositoryRoot?: string;
  tests: RetainedDeclaration[];
}

export interface RetainedResult extends Omit<
  CheckpointResult,
  "title" | "file"
> {
  file: string;
  title: string[];
  errors?: (string | null)[];
}

export interface RetainedSummary {
  status: string;
  changedSources?: string[];
  counts?: { interrupted?: number };
}

export interface RetainedBrowserReport {
  errors?: { message?: string }[];
}

export interface FullCaseRecord extends CompletedFindingCase {
  file: string;
  titlePath: string[];
  verification?: BrowserVerification;
  attempt: string;
}

export interface FullCaseHistory {
  status: string;
  expectedStatus: string;
  retry: number;
  attempt: string;
}

export interface FullCompletedCase extends FullCaseRecord {
  history: FullCaseHistory[];
  unexpected: boolean;
  flaky: boolean;
}

export interface FullCompletedReport extends CompletedReport {
  schemaVersion: 1;
  scope: "full";
  approval: FullApproval;
  outcome: "passed" | "failed";
  total: number;
  failures: FullCompletedCase[];
  flaky: FullCompletedCase[];
  skipped: string[];
  evidence: RetainedArtifact[];
}

export type FullReportDraft = Omit<FullCompletedReport, "evidenceHash">;

export interface CompletedRun {
  run: ReturnType<typeof readRunPlan>;
  report: FullCompletedReport;
}

export interface FindingReviewDraft extends FindingReview {
  instructions: string;
}

export interface GitHubFindingIssue {
  id: number;
  number: number;
  body: string | null;
  state: string;
  url: string;
  html_url: string;
  pull_request?: { url: string };
}

export interface GitHubReportComment {
  id: number;
  body: string | null;
  issue_url: string;
  html_url: string;
}

export interface PublishedFinding {
  issue: number;
  url: string;
  evidenceHash: string;
  groupHash: string;
  comment?: number;
}

export interface PublicationJournal {
  groups: Record<string, PublishedFinding | undefined>;
  report?: { comment: number; evidenceHash: string };
}

export interface PreparedReport {
  report: string;
  review: string;
  failures: number;
  flaky: number;
  publishing: false;
}

export type FindingLink = {
  problem: string;
  issue: string;
  state: string;
};

export interface PublishedReport {
  reportComment: string;
  findings: FindingLink[];
}

export interface RepairHandoff {
  handoff: string;
  issue: string;
  sessionCreated: false;
  fullExecutionAuthorized: false;
}

export interface FindingRecord {
  report: string;
  reportSha256: string;
  reviewedBy: string;
  group: FindingGroup;
}

export type GitHubPublicationBody =
  | { body: string }
  | { title: string; body: string; labels: string[] };

export type ReportDocument =
  | FullReportDraft
  | FindingReviewDraft
  | PublicationJournal
  | FindingRecord
  | FindingGroup
  | GitHubPublicationBody
  | { pid: number; startedAt: string };

export type ReportComparable =
  | string
  | number
  | boolean
  | null
  | undefined
  | FullEnvironment
  | FullEnvironment["edge"]
  | FullVerificationReceipt["environment"]
  | FullVerificationReceipt["source"]
  | FullVerificationReceipt["dependenciesAfter"]
  | string[]
  | CheckpointSource[];

export type ReportApiResponse =
  | GitHubFindingIssue
  | GitHubReportComment
  | GitHubFindingIssue[][]
  | GitHubReportComment[][];
