import assert from "node:assert/strict";

export interface SourceIdentity {
  commit: string;
  status?: string;
  treeSha256: string;
}

export interface FileIdentity {
  path: string;
  sha256: string;
}

export interface ProductionIdentity {
  buildId: string;
  files: FileIdentity[];
  outputSha256: string;
  preparation?: {
    completed: boolean;
    dependencies: InstalledIdentity;
    environment: {
      arch: string;
      bun: string;
      bunOptionsSha256: string;
      locale: string;
      platform: string;
      timeZone: string;
    };
    generated: FileIdentity[];
  };
  source: SourceIdentity;
  verifiedCommand?: string[];
  verifiedExitCode?: number;
}

// eslint-disable-next-line anti-slop/no-runtime-typeof -- Validate string fields at the persisted JSON protocol boundary.
const isString = (value: unknown): value is string => typeof value === "string";

// eslint-disable-next-line anti-slop/no-unsafe-dictionary-type -- Persisted JSON members remain unknown until the adjacent field guards validate them.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && value instanceof Object && !Array.isArray(value);

const isSource = (value: unknown): value is SourceIdentity =>
  isRecord(value) &&
  isString(value.commit) &&
  isString(value.treeSha256) &&
  (value.status === undefined || isString(value.status));

const isFile = (value: unknown): value is FileIdentity =>
  isRecord(value) && isString(value.path) && isString(value.sha256);

export interface DirectoryIdentity {
  files: Record<string, string>;
  sha256: string;
}

export interface InstalledIdentity {
  bun: string;
  bunOptionsSha256: string;
  files: number;
  installedSha256: string;
  lockSha256: string;
}

export interface ConsumerEnvironment {
  arch: string;
  bunOptionsSha256: string;
  locale: string;
  platform: string;
  timezone: string;
}

export interface WebsiteIdentity {
  buildId: string;
  bun?: string;
  outputSha256: string;
  runtime?: string;
  source: SourceIdentity;
}

export interface ConsumerSnapshot {
  bun: string;
  environment: ConsumerEnvironment;
  source: SourceIdentity;
  status: string;
  websiteIdentity: WebsiteIdentity;
}

export interface PreparedProject {
  buildOutput: DirectoryIdentity;
  dependencyIdentity: unknown;
  directory: string;
  framework: string;
  inputs: DirectoryIdentity;
  installedBytes: InstalledIdentity;
}

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every(isString);

const isDirectory = (value: unknown): value is DirectoryIdentity =>
  isRecord(value) && isString(value.sha256) && isStringRecord(value.files);

const isEnvironment = (value: unknown): value is ConsumerEnvironment =>
  isRecord(value) &&
  [
    value.arch,
    value.platform,
    value.locale,
    value.timezone,
    value.bunOptionsSha256,
  ].every(isString);

const isWebsite = (value: unknown): value is WebsiteIdentity =>
  isRecord(value) &&
  isString(value.buildId) &&
  isString(value.outputSha256) &&
  isSource(value.source) &&
  (value.bun === undefined || isString(value.bun)) &&
  (value.runtime === undefined || isString(value.runtime));

const isInstalled = (value: unknown): value is InstalledIdentity =>
  isRecord(value) &&
  [
    value.bun,
    value.bunOptionsSha256,
    value.installedSha256,
    value.lockSha256,
  ].every(isString) &&
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- Installed receipts record the number of hashed files as a number.
  typeof value.files === "number";

const isProductionPreparation = (
  value: unknown
): value is NonNullable<ProductionIdentity["preparation"]> =>
  isRecord(value) &&
  (value.completed === true || value.completed === false) &&
  isInstalled(value.dependencies) &&
  Array.isArray(value.generated) &&
  value.generated.every(isFile) &&
  isRecord(value.environment) &&
  [
    value.environment.arch,
    value.environment.bun,
    value.environment.bunOptionsSha256,
    value.environment.locale,
    value.environment.platform,
    value.environment.timeZone,
  ].every(isString);

const isProduction = (value: unknown): value is ProductionIdentity =>
  isRecord(value) &&
  isSource(value.source) &&
  isString(value.buildId) &&
  isString(value.outputSha256) &&
  Array.isArray(value.files) &&
  value.files.every(isFile) &&
  (value.verifiedCommand === undefined ||
    (Array.isArray(value.verifiedCommand) &&
      value.verifiedCommand.every(isString))) &&
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- A completed command receipt records a numeric exit code.
  (value.verifiedExitCode === undefined ||
    typeof value.verifiedExitCode === "number") &&
  (value.preparation === undefined ||
    isProductionPreparation(value.preparation));

export const parseProductionIdentity = (text: string): ProductionIdentity => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isProduction(value),
    "Complete production source/output receipt required"
  );

  return value;
};

const isProject = (value: unknown): value is PreparedProject =>
  isRecord(value) &&
  isString(value.directory) &&
  isString(value.framework) &&
  isInstalled(value.installedBytes) &&
  isDirectory(value.inputs) &&
  isDirectory(value.buildOutput);

const isSnapshot = (value: unknown): value is ConsumerSnapshot =>
  isRecord(value) &&
  isString(value.bun) &&
  isString(value.status) &&
  isSource(value.source) &&
  isWebsite(value.websiteIdentity) &&
  isEnvironment(value.environment);

// eslint-disable-next-line anti-slop/no-unsafe-dictionary-type -- Journey-specific fields stay unknown until their existing verification stage consumes them.
// eslint-disable-next-line anti-slop/no-unsafe-dictionary-type -- Only this parsed snapshot boundary retains unconsumed journey fields as unknown.
type RawConsumerSnapshot = ConsumerSnapshot & Record<string, unknown>;

export const parseConsumerSnapshot = (text: string): RawConsumerSnapshot => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isRecord(value) && isSnapshot(value),
    "Complete prepared consumer snapshot required"
  );

  return value;
};

export const parseCollectedSnapshot = (
  text: string
): Pick<ConsumerSnapshot, "source" | "websiteIdentity" | "environment"> => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isRecord(value) &&
      isSource(value.source) &&
      isWebsite(value.websiteIdentity) &&
      isEnvironment(value.environment),
    "Complete collected consumer snapshot required"
  );

  return {
    environment: value.environment,
    source: value.source,
    websiteIdentity: value.websiteIdentity,
  };
};

// eslint-disable-next-line anti-slop/no-unknown-parameters -- Validate each persisted installation before inspecting its paths and dependency identities.
export const preparedProject = (value: unknown): PreparedProject => {
  assert.ok(
    isProject(value),
    "Complete prepared consumer dependency/input/build identities required"
  );

  return value;
};

// eslint-disable-next-line anti-slop/no-unknown-parameters -- Validate retained browser artifact identities at the receipt boundary.
export const retainedArtifacts = (value: unknown): DirectoryIdentity => {
  assert.ok(
    isDirectory(value),
    "Passed ordinary runtime must retain browser and artifact identities"
  );

  return value;
};

export interface FixtureIdentity {
  sha256: string;
}

export interface VerificationState {
  environment: unknown;
  fixtureBundle?: FixtureIdentity;
  source: SourceIdentity;
  suite?: string;
  websiteBuild?: WebsiteIdentity & { verifiedCommand?: string[] };
}

export interface VerificationCheck {
  exitCode: number | null;
  name: string;
  reusedCompletedBuild?: boolean;
  reusedTests?: { line: string }[];
  verifiedCommand?: string[];
}

export interface VerificationReport extends VerificationState {
  browserScope?: string;
  checks: VerificationCheck[];
  completed: boolean;
  dependenciesAfter?: InstalledIdentity | null;
  error?: string;
  finishedAt?: string;
  fixtureBundleAfter?: FixtureIdentity;
  fullCases?: unknown;
  passed: boolean;
  phase?: string;
  pptIncluded?: boolean;
  pptOnly?: boolean;
  preparation?: VerificationState;
  prepared?: boolean;
  scope: string;
  sourceAfter?: SourceIdentity;
  startedAt: string;
}

const isFixture = (value: unknown): value is FixtureIdentity =>
  isRecord(value) && isString(value.sha256);

export const readVerificationState = (
  text: string
): VerificationState | undefined => {
  const value: unknown = JSON.parse(text);

  if (!isRecord(value) || !isSource(value.source)) {
    return undefined;
  }

  if (value.websiteBuild !== undefined && !isWebsite(value.websiteBuild)) {
    return undefined;
  }

  if (value.fixtureBundle !== undefined && !isFixture(value.fixtureBundle)) {
    return undefined;
  }

  if (value.suite !== undefined && !isString(value.suite)) {
    return undefined;
  }

  return {
    ...value,
    environment: value.environment,
    fixtureBundle: value.fixtureBundle,
    source: value.source,
    suite: value.suite,
    websiteBuild: value.websiteBuild,
  };
};

export interface WorkflowReport {
  generationOwnership?: {
    cacheHit: true;
    directory: string;
    generationHash: string;
    guardFiles: { path: string; sha256: string }[];
    restored: true;
  };
  build?: { buildId: string; generatedSha256: string; outputSha256: string };
  bun: string;
  finishedAt?: string;
  freshDependencyInstall?: {
    backup: string;
    previousDirectories: { physical: string; relative: string }[];
  };
  freshToolchain?: Record<string, string>;
  invalidation?: {
    after: string;
    before: string;
    input: string;
    task: string;
  }[];
  passed: boolean;
  source: SourceIdentity;
  sourceAfter?: SourceIdentity;
  startedAt: string;
  steps: { exitCode: number | null; name: string }[];
}

export const workspaceNames = (text: string): string[] => {
  const value: unknown = Bun.JSON5.parse(text);
  assert.ok(isRecord(value), "Workspace lock must be an object");
  const workspaces = value.workspaces ?? {};
  assert.ok(isRecord(workspaces), "Workspace lock entries required");

  return Object.keys(workspaces);
};

export const packageManager = (text: string): string => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isRecord(value) && isString(value.packageManager),
    "Pinned package manager required"
  );

  return value.packageManager;
};

const isTaskHash = (
  value: unknown
): value is { hash: string; taskId: string } =>
  isRecord(value) && isString(value.hash) && isString(value.taskId);

export const taskHashes = (text: string): Record<string, string> => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isRecord(value) &&
      Array.isArray(value.tasks) &&
      value.tasks.every(isTaskHash),
    "Turbo task hashes required"
  );

  return Object.fromEntries(
    value.tasks.map((task) => [task.taskId, task.hash])
  );
};

const isRegistryItem = (
  value: unknown
): value is { description?: string; name: string } =>
  isRecord(value) &&
  isString(value.name) &&
  (value.description === undefined || isString(value.description));

export const registryDocument = (text: string) => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isRecord(value) &&
      Array.isArray(value.items) &&
      value.items.every(isRegistryItem),
    "Authored registry items required"
  );

  return { ...value, items: value.items };
};

const isReusedTest = (value: unknown): value is { line: string } =>
  isRecord(value) && isString(value.line);

// eslint-disable-next-line anti-slop/no-unknown-parameters -- Validate the reusable checkpoint interface before consuming its returned records.
export const browserReuseResults = (value: unknown): { line: string }[] => {
  assert.ok(
    Array.isArray(value) && value.every(isReusedTest),
    "Reusable browser records require test-list lines"
  );

  return value;
};

export interface DevelopmentReport {
  browser?: string;
  bun: string;
  command: string[];
  finishedAt?: string;
  generatedInputsRestored?: boolean;
  pages: { route: string; title: string }[];
  passed: boolean;
  process?: { pid: number | undefined; runtime: string };
  source: SourceIdentity;
  sourceAfter?: SourceIdentity;
  startedAt: string;
}

// eslint-disable-next-line anti-slop/no-runtime-typeof -- Validate numeric fields of persisted checkpoint summaries.
const isNumber = (value: unknown): value is number => typeof value === "number";

export interface CheckpointSummary {
  changedSources?: unknown[];
  counts: { failed: number; interrupted: number; timedOut: number };
  status: string;
}

export const checkpointSummary = (text: string): CheckpointSummary => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isRecord(value) &&
      isString(value.status) &&
      isRecord(value.counts) &&
      isNumber(value.counts.failed) &&
      isNumber(value.counts.interrupted) &&
      isNumber(value.counts.timedOut) &&
      (value.changedSources === undefined ||
        Array.isArray(value.changedSources)),
    "Complete browser checkpoint summary required"
  );

  return {
    changedSources: value.changedSources,
    counts: {
      failed: value.counts.failed,
      interrupted: value.counts.interrupted,
      timedOut: value.counts.timedOut,
    },
    status: value.status,
  };
};

const isTestId = (value: unknown): value is { id: string } =>
  isRecord(value) && isString(value.id);

export const expectedCheckpoint = (text: string) => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isRecord(value) &&
      Array.isArray(value.tests) &&
      value.tests.every(isTestId),
    "Expected browser checkpoint identities required"
  );

  return { tests: value.tests };
};

export const checkpointResult = (text: string) => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isRecord(value) && isString(value.id) && isString(value.status),
    "Complete browser checkpoint result required"
  );

  return { id: value.id, status: value.status };
};

export const browserCollectionReport = (text: string) => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isRecord(value) &&
      (value.errors === undefined || Array.isArray(value.errors)),
    "Browser collection report required"
  );

  return { errors: value.errors };
};

// eslint-disable-next-line anti-slop/no-unknown-parameters -- Validate the persisted browser identity at its receipt boundary.
export const retainedBrowserVersion = (value: unknown): string => {
  assert.ok(
    isString(value) && value.length > 0,
    "Passed ordinary runtime must retain browser and artifact identities"
  );

  return value;
};

// eslint-disable-next-line anti-slop/no-unknown-parameters -- Validate the build identity returned by owned verification hosts before checkpoint binding.
export const verificationWebsite = (value: unknown): WebsiteIdentity => {
  assert.ok(isWebsite(value), "Owned verification website identity required");

  return value;
};

/** Decode the serialized host summary carried by browser verification environments. */
export const parseWebsiteIdentity = (text: string): WebsiteIdentity => {
  const value: unknown = JSON.parse(text);

  return verificationWebsite(value);
};
