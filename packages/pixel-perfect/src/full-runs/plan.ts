import path from "node:path";

export const approvalLabel = "full-tests:approved";
export const planMarker = "<!-- grasscn-full-run-plan:v1 -->";

export interface FullExecution {
  workers: number;
  fixturePort: number;
  previewPort: number;
  proxyPort: number;
}

export interface FullEnvironment {
  bun: string;
  platform: string;
  arch: string;
  hostname: string;
  timezone: string;
  locale: string;
  bunLockSha256: string;
  installedDependenciesSha256: string;
  edge: { executable: string; size: number; modified: number };
  webgl: string | null;
  ci: string | null;
}

export interface FullRunPlan {
  schemaVersion: 1;
  scope: "full";
  repository: string;
  commit: string;
  initiatingThread: string;
  initiatingCheckout: string;
  environment: FullEnvironment;
  execution: FullExecution;
}

export type FullRunPlanDraft = Omit<FullRunPlan, "initiatingThread"> & {
  initiatingThread: string | undefined;
};

type ExactRunFields = (
  value: unknown,
  keys: readonly string[],
  subject: string
) => asserts value is object;

const isInitiatingCheckout = (value: unknown): value is string =>
  typeof value === "string" && path.isAbsolute(value);

const isEnvironmentText = (value: unknown): value is string =>
  typeof value === "string" && value !== "";

interface BrowserEnvironmentInput {
  edge: { executable: unknown; size: unknown; modified: unknown };
  webgl: unknown;
  ci: unknown;
}

const isBrowserEnvironment = (
  environment: BrowserEnvironmentInput
): environment is Pick<FullEnvironment, "edge" | "webgl" | "ci"> =>
  typeof environment.edge.executable === "string" &&
  Number.isFinite(environment.edge.size) &&
  Number.isFinite(environment.edge.modified) &&
  (environment.webgl === null || typeof environment.webgl === "string") &&
  (environment.ci === null || typeof environment.ci === "string");

const json = (value: FullRunPlanDraft) => `${JSON.stringify(value, null, 2)}\n`;

const exactKeys: ExactRunFields = (
  value,
  keys,
  subject
): asserts value is object => {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`Invalid ${subject} fields`);
  }

  const actualFieldNames = Object.keys(value);
  actualFieldNames.sort();
  const actualFieldSignature = actualFieldNames.join("|");
  const requiredFieldNames = [...keys];
  requiredFieldNames.sort();

  if (actualFieldSignature !== requiredFieldNames.join("|")) {
    throw new Error(`Invalid ${subject} fields`);
  }
};

const assertExecution = (execution: FullExecution) => {
  if (
    !Number.isInteger(execution.workers) ||
    execution.workers < 1 ||
    execution.workers > 8
  ) {
    throw new Error("Full workers must be 1-8");
  }

  const ports = [
    execution.fixturePort,
    execution.previewPort,
    execution.proxyPort,
  ];

  if (
    ports.some(
      (port) => !Number.isInteger(port) || port < 1024 || port > 65_535
    ) ||
    new Set(ports).size !== ports.length ||
    ports.some((port) => [5173, 5174, 5176, 5178].includes(port))
  ) {
    throw new Error("Full run needs distinct, non-foreground loopback ports");
  }
};

const assertEnvironment = (environment: FullEnvironment) => {
  for (const key of [
    "bun",
    "platform",
    "arch",
    "hostname",
    "timezone",
    "locale",
  ] as const) {
    if (!isEnvironmentText(environment[key])) {
      throw new Error(`Invalid environment ${key}`);
    }
  }

  for (const key of ["bunLockSha256", "installedDependenciesSha256"] as const) {
    if (!/^[a-f0-9]{64}$/u.test(environment[key])) {
      throw new Error(`Invalid environment ${key}`);
    }
  }

  exactKeys(
    environment.edge,
    ["executable", "size", "modified"],
    "Edge environment"
  );

  if (!isBrowserEnvironment(environment)) {
    throw new Error("Invalid browser environment");
  }
};

export const parseRunPlan = (body: string) => {
  const marker = body.indexOf(planMarker);

  if (marker === -1 || body.includes(planMarker, marker + planMarker.length)) {
    throw new Error("Issue is not a dedicated Full run plan");
  }

  const match = /^\s*```json\s*\n(?<planJson>[\s\S]*?)\n```/u.exec(
    body.slice(marker + planMarker.length)
  );

  if (!match) {
    throw new Error("Missing machine-readable Full run plan");
  }

  // SAFETY: the following existing exact-key, identity, port and environment
  // checks validate this versioned owner format without altering parsed bytes.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Full plan owner contract; all existing validation retained.
  const plan = JSON.parse(match[1]) as FullRunPlan;
  exactKeys(
    plan,
    [
      "schemaVersion",
      "scope",
      "repository",
      "commit",
      "initiatingThread",
      "initiatingCheckout",
      "environment",
      "execution",
    ],
    "Full run plan"
  );
  exactKeys(
    plan.execution,
    ["workers", "fixturePort", "previewPort", "proxyPort"],
    "Full execution"
  );
  exactKeys(
    plan.environment,
    [
      "bun",
      "platform",
      "arch",
      "hostname",
      "timezone",
      "locale",
      "bunLockSha256",
      "installedDependenciesSha256",
      "edge",
      "webgl",
      "ci",
    ],
    "Full environment"
  );

  if (
    plan.schemaVersion !== 1 ||
    plan.scope !== "full" ||
    !/^[a-f0-9]{40}$/u.test(plan.commit) ||
    !/^[\w.-]+\/[\w.-]+$/u.test(plan.repository) ||
    !/^[a-zA-Z0-9-]{10,100}$/u.test(plan.initiatingThread)
  ) {
    throw new Error("Invalid Full run identity");
  }

  if (!isInitiatingCheckout(plan.initiatingCheckout)) {
    throw new Error("Invalid initiating checkout");
  }

  assertExecution(plan.execution);
  assertEnvironment(plan.environment);

  return plan;
};

export const runPlanBody = (plan: FullRunPlanDraft) =>
  `# Full Pixel Perfect Test run\n\nThis approval covers Full PPTs only; non-PPT tests run in ordinary verification.\n\nApprove this fixed plan by applying ${approvalLabel} as a human maintainer. Executors must not apply authorization. Progress and results belong in comments; do not edit an approved body.\n\n${planMarker}\n\`\`\`json\n${json(plan)}\`\`\`\n`;
