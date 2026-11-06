import type { CheckpointCandidate } from "@grasscn/tests/checkpoints";
import type { installedDependencyIdentity } from "@grasscn/tests/dependency-identity";
import type {
  VerificationReport,
  VerificationState,
} from "@grasscn/tests/verification-types";
import type { FullEnvironment } from "@ppt/full-runs/plan";
import type { BrowserCase } from "@ppt/selection/suite";

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
  websiteMode?: "owned-bun-next-production";
}

export interface RuntimeVerificationReceipt extends VerificationReport {
  browserScope: "full" | "base";
  environment: RuntimeVerificationEnvironment;
  pptOnly: true;
  suite: string;
  fullCases?: BrowserCase[];
}

export interface PreviousVerification {
  filename: string;
  report: VerificationState & CheckpointCandidate["report"];
}
