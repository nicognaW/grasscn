import type { ReusableBrowserTest } from "@grasscn/tests/checkpoints";
import type { installedDependencyIdentity } from "@grasscn/tests/dependency-identity";
import type { fixtureManifest } from "@grasscn/tests/fixture";
import type { FullEnvironment } from "@ppt/full-runs/plan";
import type { BrowserCase } from "@ppt/selection/suite";

export interface RuntimeSourceIdentity {
  commit: string;
  status: string;
  treeSha256: string;
}

export interface RuntimeVerificationEnvironment {
  arch: string;
  bun: string;
  ci: string | null;
  fixture: string | null;
  fixtureOverrides: Record<string, string | null>;
  locale: string;
  platform: string;
  preview: string | null;
  timezone: string;
  webgl: string | null;
  workers: number;
  edge?: FullEnvironment["edge"];
  installedDependencies?: ReturnType<typeof installedDependencyIdentity>;
  browserSelection?: "full" | "base";
  nonPptIncluded?: boolean;
  fullRun?: { approvalEvent: number; issue: number; planHash: string };
  fixtureMode?: "production" | "provided-or-development";
}

export interface RuntimeVerificationReceipt {
  browserScope: "full" | "base";
  checks: {
    exitCode: number;
    name: string;
    reusedTests?: ReusableBrowserTest[];
  }[];
  completed: boolean;
  environment: RuntimeVerificationEnvironment;
  passed: boolean;
  pptOnly: true;
  scope: string;
  source: RuntimeSourceIdentity;
  startedAt: string;
  suite: string;
  fullCases?: BrowserCase[];
  fixtureBundle?: ReturnType<typeof fixtureManifest>;
  fixtureBundleAfter?: ReturnType<typeof fixtureManifest>;
  sourceAfter?: RuntimeSourceIdentity;
  dependenciesAfter?: ReturnType<typeof installedDependencyIdentity>;
  error?: string;
  finishedAt?: string;
}

export interface PreviousVerification {
  filename: string;
  report: Partial<RuntimeVerificationReceipt>;
}

export interface RuntimeCheckpointSummary {
  status: string;
  counts: { failed: number; timedOut: number; interrupted: number };
  changedSources?: string[];
}
