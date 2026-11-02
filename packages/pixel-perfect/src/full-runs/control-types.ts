import type { fullRunPaths, FullRunState } from "@ppt/full-runs/history";
import type { FullRunPlan, FullRunPlanDraft } from "@ppt/full-runs/plan";
import type {
  prepareReport,
  publishReport,
  repairHandoff,
} from "@ppt/full-runs/report";

export interface FullExecutorClaim {
  pid: number;
  planHash: string;
  start: string | null | undefined;
  thread: string | undefined;
}

export interface FullRunContext {
  attempt: string;
  coordination: string;
  paths: ReturnType<typeof fullRunPaths>;
  plan: FullRunPlan;
}

export interface FullRunStatus {
  authorizedLabelPresent: boolean;
  issue: string;
  local: FullRunState | null;
  state: string;
}

export interface FullRunHandoff {
  handoff: string;
  issue: string;
  next: string;
  sessionCreated: false;
}

export type FullControlDocument =
  | FullRunPlanDraft
  | FullRunState
  | FullExecutorClaim
  | FullRunContext
  | FullRunStatus
  | FullRunHandoff
  | ReturnType<typeof prepareReport>
  | ReturnType<typeof publishReport>
  | ReturnType<typeof repairHandoff>;
