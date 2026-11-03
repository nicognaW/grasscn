import { serveVerificationHosts } from "@grasscn/tests/hosts";
import type { FullRunPlan } from "@ppt/full-runs/plan";

export const serveFullHosts = async (plan: FullRunPlan) =>
  await serveVerificationHosts(plan.execution);
