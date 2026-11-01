import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";

import { serveVerificationHosts } from "@grasscn/tests/hosts";
import { packageBin } from "@grasscn/tests/tooling";
import { repoRoot, testRoot, webRoot } from "@tests/paths";

const [output, workerArgument = "1"] = process.argv.slice(2);
const workers = Number(workerArgument);

if (!output || !Number.isInteger(workers) || workers < 1 || workers > 8) {
  throw new Error("Use the guarded normal verification command");
}

await fs.mkdir(output, { recursive: true });

interface VerificationReceipt {
  checks: { exitCode: number; name: string }[];
  completed: boolean;
  error?: string;
  finishedAt?: string;
  passed: boolean;
  scope: "normal";
  startedAt: string;
}

type VerificationStep = [name: string, args: string[], directory: string];

const report: VerificationReceipt = {
  checks: [],
  completed: false,
  passed: false,
  scope: "normal",
  startedAt: new Date().toISOString(),
};

const save = async () =>
  fs.writeFile(
    path.join(output, "verification.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );

const steps: VerificationStep[] = [
  ["generate", [path.join(webRoot, "scripts/prepare-preview.mjs")], repoRoot],
  [
    "types",
    [
      packageBin("uncheck", "uncheck", repoRoot),
      "--only=tsc",
      "--cwd",
      repoRoot,
    ],
    repoRoot,
  ],
  [
    "primitives",
    [path.join(testRoot, "src/checks/check-primitives.ts")],
    testRoot,
  ],
  [
    "registry-closure",
    [path.join(testRoot, "src/checks/check-registry-closure.ts")],
    testRoot,
  ],
  [
    "registry-build",
    [packageBin("shadcn", "shadcn", webRoot), "build"],
    webRoot,
  ],
  [
    "built-primitives",
    [path.join(testRoot, "src/checks/check-primitives.ts"), "--built"],
    testRoot,
  ],
  [
    "website-build",
    [
      packageBin("vite", "vite", webRoot),
      "build",
      "--config",
      path.join(webRoot, "vite.config.ts"),
    ],
    webRoot,
  ],
  ["fixture-build", [path.join(testRoot, "cli/build-fixture.ts")], testRoot],
  [
    "normal-tests",
    [
      path.join(testRoot, "cli/test.ts"),
      `--workers=${workers}`,
      `--output=${path.join(output, "browser")}`,
    ],
    testRoot,
  ],
];

let hosts: Awaited<ReturnType<typeof serveVerificationHosts>> | undefined;

try {
  /* oxlint-disable no-await-in-loop -- Build steps consume earlier outputs; save each receipt and fail before starting the next step. */
  for (const [name, args, cwd] of steps) {
    if (name === "normal-tests") {
      hosts = await serveVerificationHosts({
        fixturePort: 5284,
        previewPort: 5286,
        proxyPort: 5287,
      });
    }

    const env = {
      ...process.env,
      GOMAXPROCS: "1",
      GRASSCN_BROWSER_SCOPE: "ordinary",
      RAYON_NUM_THREADS: "1",
      ...(hosts
        ? {
            GRASSCN_BROWSER_PROXY_PORT: "5287",
            GRASSCN_EXPANSION_URL: "http://127.0.0.1:5174/adventure.html",
            GRASSCN_FIXTURE_URL: "http://127.0.0.1:5174",
            GRASSCN_PREVIEW_URL: "http://127.0.0.1:5176/",
            GRASSCN_TREE_INSTALLED_URL: "http://127.0.0.1:5174/adventure.html",
          }
        : {}),
    };

    console.log(`Normal verification: ${name}`);

    const child = spawn(process.execPath, args, {
      cwd,
      env,
      stdio: "inherit",
    });
    // SAFETY: Node's ChildProcess exit event provides (code, signal); events.once rejects on spawn errors.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- This owned child has no callers operating on its handle after exit.
    const [exitCode, signal] = (await once(child, "exit")) as [
      number | null,
      NodeJS.Signals | null,
    ];
    const code = exitCode ?? (signal === null ? 0 : 1);

    report.checks.push({ exitCode: code, name });
    await save();

    if (code !== 0) {
      throw new Error(`${name} failed (${code})`);
    }
  }

  /* oxlint-enable no-await-in-loop */
  report.completed = true;
  report.passed = true;
} catch (error) {
  // SAFETY: owned verification operations report native/explicit failures through their optional message property.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Preserve the original message projection, without converting errors or adding guards.
  report.error = (error as { message?: string }).message;
  process.exitCode = 1;
} finally {
  await hosts?.close();
  report.finishedAt = new Date().toISOString();
  await save();
  console.log(
    `Verification receipt: ${path.join(output, "verification.json")}`
  );
}
