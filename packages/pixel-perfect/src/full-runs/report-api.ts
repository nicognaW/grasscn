import { execFileSync } from "node:child_process";

import { fullRoot } from "@ppt/full-runs/history";
import type {
  GitHubFindingIssue,
  GitHubReportComment,
} from "@ppt/full-runs/report-types";

export const readIssuePages = (args: string[]) => {
  // SAFETY: the paginated GitHub endpoint selected by the caller returns GitHubFindingIssue[][] without normalization.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    execFileSync("gh", ["api", ...args], {
      cwd: fullRoot,
      encoding: "utf-8",
      maxBuffer: 128 * 1024 * 1024,
    })
  ) as GitHubFindingIssue[][];

  return parsed;
};

export const readCommentPages = (args: string[]) => {
  // SAFETY: the paginated GitHub endpoint selected by the caller returns GitHubReportComment[][] without normalization.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    execFileSync("gh", ["api", ...args], {
      cwd: fullRoot,
      encoding: "utf-8",
      maxBuffer: 128 * 1024 * 1024,
    })
  ) as GitHubReportComment[][];

  return parsed;
};
