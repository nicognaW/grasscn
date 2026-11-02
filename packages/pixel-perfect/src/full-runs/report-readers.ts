import fs from "node:fs";

import type {
  RetainedCatalogue,
  RetainedSummary,
  RetainedBrowserReport,
  PublicationJournal,
} from "@ppt/full-runs/report-types";
import type { FindingReview } from "@ppt/full-runs/review";

export const readRetainedCatalogue = (file: string) => {
  // SAFETY: the retained RetainedCatalogue producer owns this input; original caller validation and fresh reads remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    fs.readFileSync(file, "utf-8").replace(/^\uFEFF/u, "")
  ) as RetainedCatalogue;

  return parsed;
};

export const readRetainedSummary = (file: string) => {
  // SAFETY: the retained RetainedSummary producer owns this input; original caller validation and fresh reads remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    fs.readFileSync(file, "utf-8").replace(/^\uFEFF/u, "")
  ) as RetainedSummary;

  return parsed;
};

export const readRetainedBrowserReport = (file: string) => {
  // SAFETY: the retained RetainedBrowserReport producer owns this input; original caller validation and fresh reads remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    fs.readFileSync(file, "utf-8").replace(/^\uFEFF/u, "")
  ) as RetainedBrowserReport;

  return parsed;
};

export const readFindingReview = (file: string) => {
  // SAFETY: the retained FindingReview producer owns this input; original caller validation and fresh reads remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    fs.readFileSync(file, "utf-8").replace(/^\uFEFF/u, "")
  ) as FindingReview;

  return parsed;
};

export const readPublicationJournal = (file: string) => {
  // SAFETY: the retained PublicationJournal producer owns this input; original caller validation and fresh reads remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const parsed = JSON.parse(
    fs.readFileSync(file, "utf-8").replace(/^\uFEFF/u, "")
  ) as PublicationJournal;

  return parsed;
};
