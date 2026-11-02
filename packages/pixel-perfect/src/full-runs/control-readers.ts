import fs from "node:fs";

import type {
  FullRunState,
  FullApproval,
  FullVerificationReceipt,
  FullRunResources,
} from "@ppt/full-runs/history";

export const readControlState = (file: string) => {
  // SAFETY: the owned Full control/verification producer writes this exact FullRunState document.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as FullRunState;

  return parsed;
};

export const readExecutorState = (file: string) => {
  // SAFETY: the owned Full control/verification producer writes this exact FullRunState & { approval: FullApproval } document.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as FullRunState & {
    approval: FullApproval;
  };

  return parsed;
};

export const readExecutionReceipt = (file: string) => {
  // SAFETY: the owned Full control/verification producer writes this exact FullVerificationReceipt document.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    fs.readFileSync(file, "utf-8")
  ) as FullVerificationReceipt;

  return parsed;
};

export const readExecutionResources = (file: string) => {
  // SAFETY: the owned Full control/verification producer writes this exact FullRunResources document.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    fs.readFileSync(file, "utf-8").replace(/^\uFEFF/u, "")
  ) as FullRunResources;

  return parsed;
};
