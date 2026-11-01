import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { ReusableBrowserTest } from "@grasscn/tests/checkpoints";
import { coordinationRoot } from "@grasscn/tests/coordination";
import type { installedDependencyIdentity } from "@grasscn/tests/dependency-identity";
import { parseRunPlan } from "@ppt/full-runs/plan";
import type { FullEnvironment } from "@ppt/full-runs/plan";
import { repoRoot } from "@ppt/paths";
import type { BrowserCase } from "@ppt/selection/suite";

export const fullRoot = repoRoot;
export const stateMarker = "<!-- grasscn-full-run-state:v1 -->";

interface GitHubActor {
  login: string;
  type: string;
}

interface GitHubRunIssue {
  id: number;
  body: string | null;
  state: string;
  html_url: string;
  labels: (string | { name?: string })[];
  pull_request?: { url: string };
}

interface GitHubIssueEdits {
  data: {
    repository: {
      issue: { lastEditedAt: string | null; createdAt: string } | null;
    };
  };
}

interface GitHubIssueEvent {
  id: number;
  event: string;
  created_at: string;
  actor?: GitHubActor | null;
  label?: { name: string };
}

interface GitHubIssueComment {
  id: number;
  body: string;
}

export interface FullApproval {
  actor: string;
  createdAt: string;
  eventId: number;
}

export interface FullRunState {
  schemaVersion: 1;
  issue: number;
  repository: string;
  commit: string;
  planHash: string;
  environment: FullEnvironment;
  phase: "running" | "incomplete" | "completed";
  approval?: FullApproval;
  outcome?: "passed" | "failed" | null;
  attempt?: string;
  receipt?: string;
  executionThread?: string;
  executionSession?: string;
  startedAt?: string;
  updatedAt?: string;
  exitCode?: number;
  resourceStop?: string | null;
  error?: string;
}

interface ReceiptSource {
  commit: string;
  treeSha256: string;
}

interface ReceiptEnvironment extends Pick<
  FullEnvironment,
  "bun" | "platform" | "arch" | "timezone" | "locale" | "ci" | "webgl"
> {
  edge?: FullEnvironment["edge"];
  fullRun?: { issue: number; planHash: string; approvalEvent: number };
  workers: number;
  installedDependencies: ReturnType<typeof installedDependencyIdentity>;
}

export interface FullVerificationReceipt {
  source: ReceiptSource;
  sourceAfter?: ReceiptSource;
  environment: ReceiptEnvironment;
  checks: {
    name: string;
    exitCode: number;
    reusedTests?: ReusableBrowserTest[];
  }[];
  completed: boolean;
  passed: boolean;
  browserScope: string;
  suite: string;
  pptOnly?: boolean;
  startedAt: string;
  fullCases?: BrowserCase[];
  fixtureBundle?: { sha256: string };
  fixtureBundleAfter?: { sha256: string };
  dependenciesAfter?: ReturnType<typeof installedDependencyIdentity>;
}

export interface FullRunResources {
  Reason: string;
  ExitCode: number;
  Samples: number;
  PeakSystemCpuPercent: number;
  PeakSystemRamPercent: number;
  CpuHardCapPercent: number;
  MemoryCapGiB: number;
}

const git = (args: string[]) =>
  execFileSync("git", args, { cwd: fullRoot, encoding: "utf-8" }).trim();

const github = (args: string[]) =>
  execFileSync("gh", args, {
    cwd: fullRoot,
    encoding: "utf-8",
    maxBuffer: 32 * 1024 * 1024,
  });

export const issueNumber = (value: string | number | undefined) => {
  if (!/^[1-9]\d*$/u.test(String(value))) {
    throw new Error("Use a positive GitHub run issue number");
  }

  return Number(value);
};

export const repository = () => {
  const remote = git(["remote", "get-url", "origin"]);
  const match = /github\.com[:/](?<repository>[^/]+\/[^/]+?)(?:\.git)?$/u.exec(
    remote
  );

  if (!match) {
    throw new Error(
      "Full run authorization requires this repository's GitHub origin"
    );
  }

  return match[1];
};

export const fullRunPaths = (number: string | number | undefined) => {
  const directory = path.join(
    coordinationRoot(),
    "full-runs",
    String(issueNumber(number))
  );

  return {
    attempts: path.join(directory, "attempts"),
    claim: path.join(directory, "claim.json"),
    directory,
    state: path.join(directory, "state.json"),
  };
};

export const readRunIssue = (number: string | number | undefined) => {
  const repo = repository();
  const n = issueNumber(number);

  // SAFETY: this REST issue endpoint supplies the issue fields consumed here.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- GitHub REST issue response contract.
  const issue = JSON.parse(
    github(["api", `repos/${repo}/issues/${n}`])
  ) as GitHubRunIssue;
  const [owner, name] = repo.split("/");

  // SAFETY: the fixed GraphQL query selects exactly these edit timestamps.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Owned GitHub GraphQL selection contract.
  const response = JSON.parse(
    github([
      "api",
      "graphql",
      "-f",
      "query=query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){issue(number:$number){lastEditedAt createdAt}}}",
      "-f",
      `owner=${owner}`,
      "-f",
      `name=${name}`,
      "-F",
      `number=${n}`,
    ])
  ) as GitHubIssueEdits;
  const edit = response.data.repository.issue;

  // SAFETY: --paginate --slurp returns pages of the REST issue-event records.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- GitHub paginated issue event response contract.
  const eventPages = JSON.parse(
    github(["api", "--paginate", "--slurp", `repos/${repo}/issues/${n}/events`])
  ) as GitHubIssueEvent[][];
  const events = eventPages.flat();

  // SAFETY: --paginate --slurp returns pages of the REST issue-comment records.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- GitHub paginated issue comment response contract.
  const commentPages = JSON.parse(
    github([
      "api",
      "--paginate",
      "--slurp",
      `repos/${repo}/issues/${n}/comments`,
    ])
  ) as GitHubIssueComment[][];
  const comments = commentPages.flat();

  return { comments, edit, events, issue, number: n, repo };
};

// Historical readers deliberately perform no execution authorization.
export const readRunPlan = (number: string | number | undefined) => {
  const run = readRunIssue(number);
  const plan = parseRunPlan(run.issue.body ?? "");

  return {
    ...run,
    paths: fullRunPaths(number),
    plan,
    planHash: createHash("sha256")
      .update(`${JSON.stringify(plan, null, 2)}\n`)
      .digest("hex"),
  };
};

export const readRunState = (number: string | number | undefined) => {
  const paths = fullRunPaths(number);

  if (!fs.existsSync(paths.state)) {
    return null;
  }

  // SAFETY: writeRunState owns this durable state format; readers retain their
  // existing phase, source, environment and approval checks before use.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Full run durable state producer contract.
  const state = JSON.parse(
    fs.readFileSync(paths.state, "utf-8")
  ) as FullRunState;
  return state;
};

const readAttemptText = (file: string) =>
  fs.existsSync(file)
    ? fs.readFileSync(file, "utf-8").replace(/^\uFEFF/u, "")
    : null;

const readAttemptReceipt = (file: string) => {
  const text = readAttemptText(file);
  if (text === null) {
    return null;
  }
  // SAFETY: verify-porting writes the receipt; reporting retains all original
  // completion, scope, source, environment and journal checks before reuse.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Verification receipt producer contract.
  const receipt = JSON.parse(text) as FullVerificationReceipt;
  return receipt;
};

const readAttemptResources = (file: string) => {
  const text = readAttemptText(file);
  if (text === null) {
    return null;
  }
  // SAFETY: run-workload writes these named resource-summary fields.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Guarded workload resource-summary producer contract.
  const resources = JSON.parse(text) as FullRunResources;
  return resources;
};

export const readRunAttempts = (number: string | number | undefined) => {
  const paths = fullRunPaths(number);
  if (!fs.existsSync(paths.attempts)) {
    return [];
  }
  return fs
    .readdirSync(paths.attempts, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const directory = path.join(paths.attempts, entry.name);
      return {
        directory,
        receipt: readAttemptReceipt(path.join(directory, "verification.json")),
        resources: readAttemptResources(
          path.join(directory, "resource-summary.json")
        ),
      };
    });
};

export const parseStateComment = (body: string) => {
  const index = body.indexOf(stateMarker);

  if (index === -1) {
    return null;
  }

  const match = /^\s*```json\s*\n(?<stateJson>[\s\S]*?)\n```/u.exec(
    body.slice(index + stateMarker.length)
  );

  try {
    // SAFETY: state comments serialize writeRunState output; callers retain
    // their original phase/identity checks and malformed JSON still returns null.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Full state comment producer contract.
    return match ? (JSON.parse(match[1]) as FullRunState) : null;
  } catch {
    return null;
  }
};
