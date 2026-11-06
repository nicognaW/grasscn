import assert from "node:assert/strict";

export interface NativeButtonCase {
  height: number;
  label: string;
  name: string;
  scale: number;
  sha256: string;
  state: string;
  width: number;
}

export interface NativeButtonManifest {
  cases: NativeButtonCase[];
  sourceJarSha256: string;
}

const isString = (value: unknown): value is string => typeof value === "string";

// eslint-disable-next-line anti-slop/no-unsafe-dictionary-type -- Raw native artifact members are checked by the adjacent case and catalogue guards.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && value instanceof Object && !Array.isArray(value);

const isNativeCase = (value: unknown): value is NativeButtonCase =>
  isRecord(value) &&
  [value.height, value.width, value.scale].every(Number.isFinite) &&
  [value.label, value.name, value.sha256, value.state].every(isString);

const isNativeManifest = (value: unknown): value is NativeButtonManifest =>
  isRecord(value) &&
  isString(value.sourceJarSha256) &&
  Array.isArray(value.cases) &&
  value.cases.every(isNativeCase);

const isCatalogue = (
  value: unknown
): value is { cases: { file: string; title: string }[] } =>
  isRecord(value) &&
  Array.isArray(value.cases) &&
  value.cases.every(
    // eslint-disable-next-line anti-slop/no-unknown-parameters -- Validate each raw external JSON array member before accepting its domain shape.
    (entry: unknown) =>
      isRecord(entry) && isString(entry.file) && isString(entry.title)
  );

export const parseNativeManifest = (text: string): NativeButtonManifest => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isNativeManifest(value),
    "Complete native Button manifest required"
  );

  return value;
};

export const parseBaseCatalogue = (
  text: string
): { cases: { file: string; title: string }[] } => {
  const value: unknown = JSON.parse(text);
  assert.ok(isCatalogue(value), "Base catalogue entries required");

  return value;
};
