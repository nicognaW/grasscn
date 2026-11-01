import assert from "node:assert/strict";

export interface DirectoryIdentity {
  files: Record<string, string>;
  sha256: string;
}

export interface ConsumerEnvironment {
  arch: string;
  bunOptionsSha256: string;
  locale: string;
  platform: string;
  timezone: string;
}

export interface SourceIdentity {
  commit: string;
  status: string;
  treeSha256: string;
}

export interface WebsiteIdentity {
  buildId: string;
  outputSha256: string;
  source: SourceIdentity;
}

export interface ManualManifest {
  dependencies: string[];
  files: { destination: string; url: string }[];
  name: string;
}

export interface PublicInputs {
  browserVersion: string;
  bun: string;
  copiedExamples: Record<string, string>;
  exampleItems: Record<string, string[]>;
  environment: ConsumerEnvironment;
  manifests: ManualManifest[];
  projectRoot: string;
  source: SourceIdentity;
  websiteIdentity: WebsiteIdentity;
}

export interface PreparedManualConsumer {
  buildOutput: DirectoryIdentity;
  dependencyIdentity: unknown;
  directory: string;
  downloadedFiles: Record<string, string>;
  framework: string;
  inputs: DirectoryIdentity;
  installedBytes: unknown;
  prebuildInputs: DirectoryIdentity;
}

export interface ManualReport {
  artifacts?: DirectoryIdentity;
  browserVersion?: string;
  bun: string;
  consumers: PreparedManualConsumer[];
  copiedExamples?: Record<string, string>;
  environment: ConsumerEnvironment;
  error?: string;
  exampleSha256?: string;
  phase: string;
  projectRoot: string;
  publicInputsSha256?: string;
  publicManifestSha256?: string;
  source: SourceIdentity;
  sourceCommit?: string;
  status: string;
  website: string;
  websiteIdentity: WebsiteIdentity;
}

export interface PreparedManualReport extends ManualReport {
  publicInputsSha256: string;
}

export interface CliReport {
  artifacts?: DirectoryIdentity;
  browserVersion?: string;
  buildOutput?: DirectoryIdentity;
  bun: string;
  cli?: { packageSha256: string; path: string; version: string };
  consumer: string;
  currentItemNames?: string[];
  dependencyIdentity?: unknown;
  environment?: ConsumerEnvironment;
  error?: string;
  inputs?: DirectoryIdentity;
  installation?: unknown;
  installedBytes?: unknown;
  phase: string;
  registryPayloads?: Record<string, { sha256: string; url: string }>;
  runtime?: { buttonVisibleAndActivatable: string };
  source: SourceIdentity;
  status: string;
  steps: string[];
  website: string;
  websiteIdentity: WebsiteIdentity;
}

// JSON parsing yields unknown until each consumed protocol field is checked.
// eslint-disable-next-line anti-slop/no-runtime-typeof -- JSON string fields are checked at the external protocol boundary.
const isString = (value: unknown): value is string => typeof value === "string";

// eslint-disable-next-line anti-slop/no-unsafe-dictionary-type -- Raw JSON object members are unknown until the adjacent domain guards validate them.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && value instanceof Object && !Array.isArray(value);

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every(isString);

const isSource = (value: unknown): value is SourceIdentity =>
  isRecord(value) &&
  isString(value.commit) &&
  isString(value.status) &&
  isString(value.treeSha256);

const isWebsite = (value: unknown): value is WebsiteIdentity =>
  isRecord(value) &&
  isString(value.buildId) &&
  isString(value.outputSha256) &&
  isSource(value.source);

const isEnvironment = (value: unknown): value is ConsumerEnvironment =>
  isRecord(value) &&
  [
    value.arch,
    value.platform,
    value.locale,
    value.timezone,
    value.bunOptionsSha256,
  ].every(isString);

const isDirectory = (value: unknown): value is DirectoryIdentity =>
  isRecord(value) && isString(value.sha256) && isStringRecord(value.files);

const isManualFile = (
  value: unknown
): value is ManualManifest["files"][number] =>
  isRecord(value) && isString(value.destination) && isString(value.url);

const isManifest = (value: unknown): value is ManualManifest =>
  isRecord(value) &&
  isString(value.name) &&
  Array.isArray(value.dependencies) &&
  value.dependencies.every(isString) &&
  Array.isArray(value.files) &&
  value.files.every(isManualFile);

const isManualConsumer = (value: unknown): value is PreparedManualConsumer =>
  isRecord(value) &&
  isString(value.framework) &&
  isString(value.directory) &&
  isDirectory(value.inputs) &&
  isDirectory(value.buildOutput) &&
  isDirectory(value.prebuildInputs) &&
  isStringRecord(value.downloadedFiles);

// eslint-disable-next-line anti-slop/no-unsafe-dictionary-type -- Common receipt guards precede the journey-specific field guards below.
const isReceipt = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  isString(value.status) &&
  isString(value.bun) &&
  isSource(value.source) &&
  isWebsite(value.websiteIdentity) &&
  isEnvironment(value.environment);

const isPublicInputs = (value: unknown): value is PublicInputs =>
  isRecord(value) &&
  isSource(value.source) &&
  isWebsite(value.websiteIdentity) &&
  isEnvironment(value.environment) &&
  isString(value.projectRoot) &&
  isString(value.browserVersion) &&
  isString(value.bun) &&
  isStringRecord(value.copiedExamples) &&
  isRecord(value.exampleItems) &&
  Object.values(value.exampleItems).every(
    (items) => Array.isArray(items) && items.every(isString)
  ) &&
  Array.isArray(value.manifests) &&
  value.manifests.every(isManifest);

const isManualReceipt = (value: unknown): value is PreparedManualReport =>
  isReceipt(value) &&
  isString(value.publicInputsSha256) &&
  isString(value.projectRoot) &&
  isString(value.website) &&
  isString(value.phase) &&
  Array.isArray(value.consumers) &&
  value.consumers.every(isManualConsumer);

const isCliReceipt = (value: unknown): value is CliReport =>
  isReceipt(value) &&
  isString(value.consumer) &&
  isString(value.website) &&
  isString(value.phase) &&
  Array.isArray(value.steps) &&
  value.steps.every(isString);

const isRegistry = (value: unknown): value is { items: { name: string }[] } =>
  isRecord(value) &&
  Array.isArray(value.items) &&
  value.items.every(
    // eslint-disable-next-line anti-slop/no-unknown-parameters -- Validate each raw external JSON array member before accepting its domain shape.
    (entry: unknown) => isRecord(entry) && isString(entry.name)
  );

export const parseWebsiteIdentity = (text: string): WebsiteIdentity => {
  const value: unknown = JSON.parse(text);
  assert.ok(isWebsite(value), "Complete website build identity required");

  return value;
};

export const parsePublicInputs = (text: string): PublicInputs => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isPublicInputs(value),
    "Complete collected manual instructions required"
  );

  return value;
};

export const parseManualReceipt = (text: string): PreparedManualReport => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isManualReceipt(value),
    "Complete prepared manual receipt required"
  );

  return value;
};

export const parseCliReceipt = (text: string): CliReport => {
  const value: unknown = JSON.parse(text);
  assert.ok(isCliReceipt(value), "Complete prepared CLI receipt required");

  return value;
};

// eslint-disable-next-line anti-slop/no-unknown-parameters -- This is the HTTP JSON boundary and returns a validated manifest.
export const parseManualManifest = (value: unknown): ManualManifest => {
  assert.ok(isManifest(value), "Complete public manual manifest required");

  return value;
};

export const parseRegistry = (text: string): { items: { name: string }[] } => {
  const value: unknown = JSON.parse(text);
  assert.ok(isRegistry(value), "Current registry items required");

  return value;
};

// eslint-disable-next-line anti-slop/no-unknown-parameters -- The file writer validates its text-or-JSON input before writing bytes.
export const encodeConsumerFile = (value: unknown): string => {
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- The file writer accepts literal source text or a JSON-serializable document at its I/O boundary.
  if (typeof value === "string") {
    return value;
  }

  const text = JSON.stringify(value, null, 2);
  assert.ok(
    text !== undefined,
    "Consumer file contents must be JSON-serializable"
  );

  return text;
};
