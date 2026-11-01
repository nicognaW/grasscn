import assert from "node:assert/strict";

// eslint-disable-next-line anti-slop/no-runtime-typeof -- Validate text fields at the specialized PPT protocol boundary.
const isString = (value: unknown): value is string => typeof value === "string";

// eslint-disable-next-line anti-slop/no-unsafe-dictionary-type -- Raw classifier and authorized-run members remain unknown until their field guards validate them.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && value instanceof Object && !Array.isArray(value);

export interface BrowserCase {
  file: string;
}

const isBrowserCase = (value: unknown): value is BrowserCase =>
  isRecord(value) && isString(value.file);

// eslint-disable-next-line anti-slop/no-unknown-parameters -- The existing classifier owns Base/Full policy; validate its consumed case-list interface here.
export const classifiedBrowserCases = (value: unknown) => {
  assert.ok(
    isRecord(value) &&
      Array.isArray(value.base) &&
      value.base.every(isBrowserCase) &&
      Array.isArray(value.full) &&
      value.full.every(isBrowserCase),
    "Classified browser cases required"
  );

  return { base: value.base, full: value.full };
};

export interface AuthorizedFullRun {
  approval: { eventId: number };
  number: number;
  plan: {
    execution: { fixturePort: number; previewPort: number; proxyPort: number };
  };
  planHash: string;
}

// eslint-disable-next-line anti-slop/no-runtime-typeof -- Validate numeric fields returned by the existing Full authorization boundary.
const isNumber = (value: unknown): value is number => typeof value === "number";

// eslint-disable-next-line anti-slop/no-unknown-parameters -- Call only after existing Full authorization succeeds; this guard checks consumed plan fields and grants no authorization.
export const authorizedFullRun = (value: unknown): AuthorizedFullRun => {
  assert.ok(
    isRecord(value) &&
      isRecord(value.approval) &&
      isNumber(value.approval.eventId) &&
      isNumber(value.number) &&
      isString(value.planHash) &&
      isRecord(value.plan) &&
      isRecord(value.plan.execution) &&
      isNumber(value.plan.execution.fixturePort) &&
      isNumber(value.plan.execution.previewPort) &&
      isNumber(value.plan.execution.proxyPort),
    "Authorized Full run plan fields required"
  );

  return {
    approval: { eventId: value.approval.eventId },
    number: value.number,
    plan: {
      execution: {
        fixturePort: value.plan.execution.fixturePort,
        previewPort: value.plan.execution.previewPort,
        proxyPort: value.plan.execution.proxyPort,
      },
    },
    planHash: value.planHash,
  };
};
