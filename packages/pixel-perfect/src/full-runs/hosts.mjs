import { serveVerificationHosts } from "@grasscn/tests/hosts";

export const serveFullHosts = async (plan) =>
  serveVerificationHosts(plan.execution);
