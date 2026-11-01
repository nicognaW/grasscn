import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeCasePath, relativeCaseFile } from "@grasscn/tests/case-paths";
import { packageBin } from "@grasscn/tests/tooling";
import type { JSONReport, JSONReportSuite } from "@playwright/test/reporter";
import { repoRoot } from "@ppt/paths";

type ReportTest = JSONReportSuite["specs"][number]["tests"][number] & {
  testId?: string;
};

interface ReportSpec extends Omit<JSONReportSuite["specs"][number], "tests"> {
  tests: ReportTest[];
}

interface ReportSuite extends Omit<JSONReportSuite, "specs" | "suites"> {
  specs: ReportSpec[];
  suites?: ReportSuite[];
}

interface CollectionReport extends Omit<JSONReport, "suites"> {
  suites: ReportSuite[];
}

export interface CaseIdentity {
  file: string;
  titlePath: string[];
}

export interface BrowserCase extends CaseIdentity {
  id: string;
  package: "pixel-perfect" | "tests";
  projectName: string;
}

interface BaseEvidence {
  kind: string;
  reason: string;
  route?: string;
  url?: string;
  upstreamTest?: string;
}

export interface BaseCase extends CaseIdentity {
  title: string;
  components: string[];
  evidence: BaseEvidence;
}

interface BaseCatalogue {
  schemaVersion: number;
  cases: BaseCase[];
}

export const browserRoot = fileURLToPath(new URL("../..", import.meta.url));
const suiteConfig = path.join(browserRoot, "playwright.config.ts");
const cli = packageBin("@playwright/test", "playwright");
const catalogueFile = path.join(browserRoot, "src/selection/base-cases.json");

const isBaseTitle = (title: unknown): title is string =>
  typeof title === "string" && !/[\r\n]/u.test(title);

const escape = (value: string) =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");

export const caseKey = (test: CaseIdentity) =>
  JSON.stringify([test.file, test.titlePath]);

const assertBaseIdentity = (test: BaseCase) => {
  if (
    normalizeCasePath(test.file) !== test.file ||
    !/\.spec\.(?:ts|js)$/u.test(test.file) ||
    !test.title ||
    !Array.isArray(test.titlePath) ||
    !test.titlePath.length ||
    test.titlePath.some((title) => !isBaseTitle(title)) ||
    test.titlePath.at(-1) !== test.title
  ) {
    throw new Error("Invalid Base case identity");
  }
};

const assertBaseEvidence = (test: BaseCase) => {
  const { evidence } = test;

  if (
    !evidence?.reason ||
    !test.components?.length ||
    !["website-default", "shadcn-test"].includes(evidence.kind)
  ) {
    throw new Error(`Missing Base evidence: ${test.title}`);
  }

  if (
    evidence.kind === "website-default" &&
    evidence.route?.startsWith("/") !== true
  ) {
    throw new Error(`Missing website route: ${test.title}`);
  }

  if (
    evidence.kind === "shadcn-test" &&
    (!/^https:\/\/github\.com\/shadcn-ui\/ui\/blob\/[a-f0-9]{40}\//u.test(
      evidence.url ?? ""
    ) ||
      evidence.upstreamTest === undefined ||
      evidence.upstreamTest === "")
  ) {
    throw new Error(`Missing actual shadcn-test mapping: ${test.title}`);
  }
};

export const baseCatalogue = () => {
  // SAFETY: this owner reads its versioned Base catalogue and retains every
  // existing identity/evidence check below; the assertion adds no runtime parsing.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Owner catalogue contract; existing checks are preserved.
  const data = JSON.parse(
    fs.readFileSync(catalogueFile, "utf-8")
  ) as BaseCatalogue;

  if (
    data.schemaVersion !== 1 ||
    !Array.isArray(data.cases) ||
    !data.cases.length
  ) {
    throw new Error("Invalid or empty Base catalogue");
  }

  const keys = new Set();

  for (const test of data.cases) {
    assertBaseIdentity(test);

    const key = caseKey(test);

    if (keys.has(key)) {
      throw new Error(`Duplicate Base case: ${test.file}: ${test.title}`);
    }

    keys.add(key);
    assertBaseEvidence(test);
  }

  return data.cases;
};

// Playwright's grep subject is project, file, describe titles and test title,
// separated by spaces. The catalogue selects leaf cases, never whole files.
export const baseGrep = () =>
  new RegExp(
    baseCatalogue()
      .map(
        (test) =>
          `(?:^|[ /\\\\])${test.file.split("/").map(escape).join("[\\\\/]")} ${escape(test.titlePath.join(" "))}$`
      )
      .join("|"),
    "u"
  );

export const flattenBrowserReport = (report: CollectionReport) => {
  const cases: BrowserCase[] = [];

  const appendSpecs = (
    suite: ReportSuite,
    currentFile: string,
    currentTitles: string[]
  ) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const source = path.resolve(
          report.config?.rootDir ?? path.join(browserRoot, "tests"),
          currentFile
        );

        const relative = path.relative(path.join(browserRoot, "tests"), source);

        const owner =
          relative &&
          relative !== ".." &&
          !relative.startsWith(`..${path.sep}`) &&
          !path.isAbsolute(relative)
            ? "pixel-perfect"
            : "tests";

        cases.push({
          file: currentFile,
          id: test.testId ?? spec.id,
          package: owner,
          projectName: test.projectName ?? "",
          titlePath: [...currentTitles, spec.title],
        });
      }
    }
  };

  const visit = (
    suite: ReportSuite,
    file: string | undefined,
    titles: string[]
  ) => {
    const isFile = suite.file !== "" && (file === undefined || file === "");

    const currentFile = isFile
      ? relativeCaseFile(
          report.config?.rootDir ?? path.join(browserRoot, "tests"),
          path.resolve(
            report.config?.rootDir ?? path.join(browserRoot, "tests"),
            suite.file
          )
        )
      : file;

    const currentTitles = isFile
      ? []
      : [...titles, ...(suite.title ? [suite.title] : [])];

    appendSpecs(suite, currentFile, currentTitles);

    for (const child of suite.suites ?? []) {
      visit(child, currentFile, currentTitles);
    }
  };

  for (const suite of report.suites ?? []) {
    visit(suite, undefined, []);
  }

  return cases;
};

const withoutReporter = (args: string[]) => {
  const result = [];

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--reporter") {
      index += 1;
      continue;
    }

    if (args[index].startsWith("--reporter=")) {
      continue;
    }

    if (args[index] === "--list") {
      continue;
    }

    if (/^--(?:ui|debug)(?:=|$)/u.test(args[index])) {
      throw new Error(
        "Interactive execution is not supported by the browser selection guard"
      );
    }

    result.push(args[index]);
  }

  return result;
};

export const collectBrowserCases = (
  args: string[] = [],
  { effectiveSelection = false }: { effectiveSelection?: boolean } = {}
) => {
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "test",
      "--config",
      suiteConfig,
      ...withoutReporter(args),
      "--list",
      "--reporter=json",
    ],
    {
      cwd: browserRoot,
      encoding: "utf-8",
      env: {
        ...process.env,
        GOMAXPROCS: "1",
        GRASSCN_BROWSER_GUARD_COLLECTION: effectiveSelection ? "1" : "",
        PLAYWRIGHT_JSON_OUTPUT_DIR: "",
        PLAYWRIGHT_JSON_OUTPUT_FILE: "",
        PLAYWRIGHT_JSON_OUTPUT_NAME: "",
        RAYON_NUM_THREADS: "1",
      },
      maxBuffer: 128 * 1024 * 1024,
    }
  );

  if (result.error) {
    throw result.error;
  }

  let report: CollectionReport;

  try {
    // SAFETY: stdout is produced by this invocation's Playwright JSON reporter;
    // parse failures and reporter errors retain their existing failure paths.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Playwright JSON reporter contract.
    report = JSON.parse(result.stdout) as CollectionReport;
  } catch {
    throw new Error(
      `Browser collection failed: ${result.stderr || result.stdout}`
    );
  }

  if (result.status !== 0 || report.errors?.length) {
    throw new Error(
      `Browser collection failed: ${report.errors?.map((error) => error.message).join("\n") ?? result.stderr}`
    );
  }

  return flattenBrowserReport(report);
};

export const classifyBrowserCases = (cases: BrowserCase[]) => {
  if (cases.some((test) => test.package !== "pixel-perfect")) {
    throw new Error(
      "Base/Full classification accepts only PPT cases; non-PPT tests run normally"
    );
  }

  const catalogue = baseCatalogue();
  const selected = new Map<string, BaseCase>();

  for (const entry of catalogue) {
    const matches = cases.filter((test) => caseKey(test) === caseKey(entry));

    if (matches.length !== 1) {
      throw new Error(
        `Base mapping must identify exactly one case (${matches.length} found): ${entry.file}: ${entry.title}`
      );
    }

    selected.set(caseKey(matches[0]), entry);
  }

  return {
    base: cases.filter((test) => selected.has(caseKey(test))),
    evidence: selected,
    full: cases.filter((test) => !selected.has(caseKey(test))),
  };
};

export const assertBaseExecution = (cases: BrowserCase[]) => {
  if (cases.some((test) => test.package !== "pixel-perfect")) {
    throw new Error(
      "The PPT selector cannot execute non-PPT cases; use packages/tests"
    );
  }

  const allowed = new Set(baseCatalogue().map(caseKey));
  const full = cases.filter((test) => !allowed.has(caseKey(test)));

  if (full.length) {
    throw new Error(
      `Full PPTs are not authorized by an ordinary PPT command (${full.length} selected). Use an approved Full run issue and its independent execution session.`
    );
  }
};

export const main = async (inputArgs = process.argv.slice(2)) => {
  let args = inputArgs;
  const command = args.shift() ?? "run";

  if (args.includes("--behavior")) {
    throw new Error(
      "Non-PPT tests run through packages/tests, without Base/Full selection"
    );
  }

  args = args.filter((arg) => arg !== "--pixel-perfect");

  if (command === "list") {
    const mode =
      args.find((arg) => ["--base", "--full", "--all"].includes(arg)) ??
      "--base";

    const pool = collectBrowserCases();
    const partition = classifyBrowserCases(pool);

    let cases = partition.base;

    if (mode === "--all") {
      cases = pool;
    } else if (mode === "--full") {
      cases = partition.full;
    }

    const summary = {
      base: partition.base.length,
      cases,
      full: partition.full.length,
      total: pool.length,
    };

    console.log(
      args.includes("--json")
        ? JSON.stringify(summary, null, 2)
        : `${summary.base} Base + ${summary.full} Full = ${summary.total} Pixel Perfect Test cases\n${cases.map((test) => `${test.file} › ${test.titlePath.join(" › ")}`).join("\n")}`
    );

    return;
  }

  if (command !== "run") {
    throw new Error(
      "Use browser-suite.mjs run [Playwright filters] or list [--base|--full|--all] [--json]"
    );
  }

  if (process.env.GRASSCN_BROWSER_SCOPE === "full") {
    throw new Error(
      "Ordinary Base commands cannot become Full commands; use the approved Full executor"
    );
  }

  if (args.some((arg) => /^--test-list(?:=|$)/u.test(arg))) {
    throw new Error(
      "The Base runner owns --test-list; use file or --grep filters within Base tests"
    );
  }

  const { foregroundLease } = await import("@grasscn/tests/coordination");
  const releaseForeground = foregroundLease();
  let selection: string | undefined;

  try {
    const { base } = classifyBrowserCases(collectBrowserCases());

    const directory = path.join(
      repoRoot,
      ".pixel-perfect-test/browser-selection"
    );

    fs.mkdirSync(directory, { recursive: true });
    selection = path.join(directory, `base-${process.pid}.txt`);
    const selected = base;

    if (!selected.length) {
      throw new Error("No Base cases in selected package");
    }

    fs.writeFileSync(
      selection,
      `${selected
        .map(
          (test) =>
            `[${test.projectName}] › ${test.file} › ${test.titlePath.join(" › ")}`
        )
        .join("\n")}\n`
    );

    const result = spawnSync(
      process.execPath,
      [cli, "test", "--config", suiteConfig, ...args, "--test-list", selection],
      { cwd: browserRoot, env: process.env, stdio: "inherit" }
    );

    if (result.error) {
      throw result.error;
    }

    process.exitCode = result.status ?? 1;
  } finally {
    if (selection !== undefined && selection !== "") {
      fs.rmSync(selection, { force: true });
    }

    releaseForeground();
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  try {
    await main();
  } catch (error) {
    // SAFETY: main's failure paths throw Error instances from owned checks or Node APIs.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Owned CLI Error contract.
    const failure = error as Error;
    console.error(failure.message);
    process.exitCode = 1;
  }
}
