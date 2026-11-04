import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import {
  readFile,
  writeFile,
  mkdir,
  rename,
  realpath,
  readdir,
  lstat,
} from "node:fs/promises";
import path from "node:path";

import {
  sourceIdentity,
  productionBuildIdentity,
  stampProductionBuild,
} from "@grasscn/tests/next-production";
import { repoRoot, webRoot } from "@tests/paths";
import { packageBin } from "@tests/tooling";

import type * as VerificationTypes from "../runtime/verification-types";
import {
  workspaceNames,
  packageManager,
  taskHashes as parseTaskHashes,
  registryDocument,
} from "../runtime/verification-types";
import { verifyGenerationCacheOwnership } from "./verify-generation-cache-ownership";

// Execute once sources are frozen, through the 4% build guard. Backups are kept;
// generated-output restoration and source probes never touch another worktree.
const directory = path.join(
  repoRoot,
  "test-results",
  "next-workflow",
  randomUUID()
);

await mkdir(directory, { recursive: true });

const awaitedIdentity1 = await realpath(directory);

assert.ok(
  awaitedIdentity1.startsWith((await realpath(repoRoot)) + path.sep),
  "Workflow backups must stay physically in this source workspace"
);

const source = await sourceIdentity();

/** @type {VerificationTypes.WorkflowReport} */
const report: VerificationTypes.WorkflowReport = {
  bun: Bun.version,
  passed: false,
  source,
  startedAt: new Date().toISOString(),
  steps: [],
};

/** @param {Buffer} value - Owned process error output. */
const onStderr = (value: Buffer) => {
  process.stderr.write(value);
};

/**
 * @param {string} name - Receipt step.
 * @param {string[]} args - Owned command arguments.
 * @param {{capture?: boolean}} [options] - Capture output without echoing it.
 */
const run = async (
  name: string,
  args: string[],
  { capture = false }: { capture?: boolean } = {}
) => {
  let stdout = "";

  const child = spawn(process.execPath, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      GOMAXPROCS: "1",
      GOMEMLIMIT: "768MiB",
      RAYON_NUM_THREADS: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  /** @param {Buffer} value - Owned process output. */
  const onStdout = (value: Buffer) => {
    stdout += value.toString("utf-8");

    if (!capture) {
      process.stdout.write(value);
    }
  };

  child.stdout.on("data", onStdout);
  child.stderr.on("data", onStderr);

  /** @type {Promise<number | null>} */

  // eslint-disable-next-line promise/avoid-new -- Bridge the owned process or server callback events into an awaited lifecycle step.
  const completion = new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });

  const code = await completion;
  await writeFile(path.join(directory, `${name}.log`), stdout);
  report.steps.push({ exitCode: code, name });
  assert.equal(code, 0, `${name} failed`);

  return stdout;
};

/** @type {string} */
let turbo: string;

const preserveInstalledDependencies = async () => {
  const root = await realpath(repoRoot);

  const workspaces = workspaceNames(
    await readFile(path.join(repoRoot, "bun.lock"), "utf-8")
  );

  /** @type {{target: string, relative: string, physical: string}[]} */
  const targets: { target: string; relative: string; physical: string }[] = [];

  for (const workspace of new Set(["", ...workspaces])) {
    const target = path.resolve(repoRoot, workspace, "node_modules");
    const relative = path.relative(repoRoot, target);

    assert.ok(
      relative &&
        !relative.startsWith(`..${path.sep}`) &&
        relative !== ".." &&
        !path.isAbsolute(relative),
      "Dependency backup must stay in this source workspace"
    );

    try {
      const info = await lstat(target);
      assert.ok(
        info.isDirectory() || info.isSymbolicLink(),
        "Expected an installed dependency directory"
      );
      const physical = await realpath(target);
      assert.ok(
        physical.startsWith(root + path.sep),
        "Dependency backup cannot follow an external directory"
      );
      targets.push({ physical, relative, target });
    } catch (error) {
      // SAFETY: this catch receives only errors from the owned Node filesystem and assertion operations above; their optional errno code is read without changing the original error or rethrow.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact Node fs/assert failure boundary; preserve the original code lookup and error object.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  const backup = path.join(directory, "installed-dependency-backup");
  await mkdir(backup);

  const targetsByDepth = [...targets];
  targetsByDepth.sort(
    (left, right) => right.target.length - left.target.length
  );

  for (const [index, item] of targetsByDepth.entries()) {
    // oxlint-disable-next-line no-await-in-loop -- Depth-sorted output moves preserve ancestor path validity; each mutate→hash/build/assert→finally restore probe must finish before next shared-workspace probe.
    await rename(item.target, path.join(backup, String(index)));
  }

  report.freshDependencyInstall = {
    backup,
    previousDirectories: targets.map(({ relative, physical }) => ({
      physical,
      relative,
    })),
  };
};

const generatedDocsIdentity = async () => {
  const hash = createHash("sha256");

  /** @param {string} folder - Generated source folder. */
  const visit = async (folder: string) => {
    const entries = await readdir(folder, { withFileTypes: true });

    const sortedEntries = [...entries];
    sortedEntries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of sortedEntries) {
      const filename = path.join(folder, entry.name);

      if (entry.isDirectory()) {
        await visit(filename);
      } else if (entry.isFile()) {
        hash
          .update(path.relative(webRoot, filename))
          .update(await readFile(filename));
      }
    }
  };

  await visit(path.join(webRoot, ".source"));
  hash.update(await readFile(path.join(webRoot, "next-env.d.ts")));

  return hash.digest("hex");
};

/** @param {string} name - Task-hash receipt step. */
const taskHashes = async (name: string) =>
  parseTaskHashes(
    await run(name, [turbo, "run", "build", "--dry=json"], { capture: true })
  );

try {
  const expectedBun = packageManager(
    await readFile(path.join(repoRoot, "package.json"), "utf-8")
  );

  assert.equal(
    `bun@${Bun.version}`,
    expectedBun,
    "Workflow uses the pinned Bun runtime"
  );
  await preserveInstalledDependencies();
  await run("frozen-install", ["install", "--frozen-lockfile"]);
  turbo = packageBin("turbo", "turbo", repoRoot);
  report.freshToolchain = {};

  for (const [name, binary, from] of [
    ["turbo", "turbo", repoRoot],
    ["next", "next", webRoot],
    ["uncheck", "uncheck", repoRoot],
    ["shadcn", "shadcn", webRoot],
  ]) {
    const physical = await realpath(packageBin(name, binary, from));
    assert.ok(
      physical.startsWith((await realpath(repoRoot)) + path.sep) &&
        physical.includes(`${path.sep}node_modules${path.sep}`),
      "Fresh toolchain must resolve inside this source workspace"
    );
    report.freshToolchain[name] = physical;
  }

  await run("generate", [turbo, "run", "generate"]);
  await run("workspace-types", [
    packageBin("uncheck", "uncheck", repoRoot),
    "--only=tsc",
    "--require=tsc",
  ]);
  await run("root-build", [turbo, "run", "build"]);

  const baseline = await productionBuildIdentity({ source });
  report.generationOwnership = await verifyGenerationCacheOwnership({
    artifactDirectory: directory,
    hashes: taskHashes,
    run,
    turbo,
    webRoot,
  });
  const afterOwnership = await productionBuildIdentity({ source });

  assert.equal(
    afterOwnership.outputSha256,
    baseline.outputSha256,
    "Generation ownership probe must preserve the exact prepared production output"
  );
  const generated = await generatedDocsIdentity();
  const hashes = await taskHashes("baseline-hashes");

  const outputPaths = [".source", ".next", "next-env.d.ts", "public/r"];
  const backup = path.join(directory, "generated-backup");
  await mkdir(backup);

  for (const [index, name] of outputPaths.entries()) {
    const target = path.resolve(webRoot, name);
    // oxlint-disable-next-line no-await-in-loop -- Keep physical-path validation and the ordered backup/restore transaction serial; stop later moves if an earlier safety check or move fails.
    const resolved = await realpath(target);

    assert.ok(
      // oxlint-disable-next-line no-await-in-loop -- Keep physical-path validation and the ordered backup/restore transaction serial; stop later moves if an earlier safety check or move fails.
      resolved.startsWith((await realpath(webRoot)) + path.sep),
      "Generated backup must stay in this web workspace"
    );
    // oxlint-disable-next-line no-await-in-loop -- Keep physical-path validation and the ordered backup/restore transaction serial; stop later moves if an earlier safety check or move fails.
    await rename(target, path.join(backup, String(index)));
  }

  const restoredLog = await run("cache-restore", [turbo, "run", "build"]);
  assert.match(
    restoredLog,
    /cache hit/u,
    "Restoration must actually use Turbo cache"
  );
  const restored = await productionBuildIdentity({ source });
  assert.equal(
    restored.outputSha256,
    baseline.outputSha256,
    "Restored Next/types/public-r output differs"
  );
  assert.equal(
    await generatedDocsIdentity(),
    generated,
    "Restored Fumadocs/env output differs"
  );
  await run("restored-workspace-types", [
    packageBin("uncheck", "uncheck", repoRoot),
    "--only=tsc",
    "--require=tsc",
  ]);

  /** @type {{name: string, file: string, task: string, change: (bytes: Buffer) => Buffer, run: string[]}[]} */
  const probes: {
    name: string;
    file: string;
    task: string;
    change: (bytes: Buffer) => Buffer;
    run: string[];
  }[] = [
    {
      change: (bytes) =>
        Buffer.concat([
          bytes,
          Buffer.from("\nWorkflow cache invalidation sentinel.\n"),
        ]),
      file: path.join(webRoot, "content/docs/components/button.mdx"),
      name: "mdx",
      run: [turbo, "run", "generate"],
      task: "@grasscn/web#generate",
    },
    {
      change: (bytes) => {
        const json = registryDocument(bytes.toString("utf-8"));
        const button = json.items.find((item) => item.name === "button");
        assert.ok(button, "Authored Button registry item required");
        button.description = "Workflow invalidation sentinel";

        return Buffer.from(`${JSON.stringify(json, null, 2)}\n`);
      },
      file: path.join(webRoot, "registry.json"),
      name: "registry",
      run: [turbo, "run", "registry:build"],
      task: "@grasscn/web#registry:build",
    },
    {
      change: (bytes) =>
        Buffer.concat([
          bytes,
          Buffer.from("\n// Workflow cache invalidation sentinel.\n"),
        ]),
      file: path.join(webRoot, "next.config.ts"),
      name: "config",
      run: [turbo, "run", "generate"],
      task: "@grasscn/web#generate",
    },
  ];

  report.invalidation = [];

  for (const probe of probes) {
    // oxlint-disable-next-line no-await-in-loop -- Depth-sorted output moves preserve ancestor path validity; each mutate→hash/build/assert→finally restore probe must finish before next shared-workspace probe.
    const original = await readFile(probe.file);

    try {
      // oxlint-disable-next-line no-await-in-loop -- Depth-sorted output moves preserve ancestor path validity; each mutate→hash/build/assert→finally restore probe must finish before next shared-workspace probe.
      await writeFile(probe.file, probe.change(original));
      // oxlint-disable-next-line no-await-in-loop -- Depth-sorted output moves preserve ancestor path validity; each mutate→hash/build/assert→finally restore probe must finish before next shared-workspace probe.
      const changed = await taskHashes(`${probe.name}-hashes`);
      assert.notEqual(
        changed[probe.task],
        hashes[probe.task],
        `${probe.name} did not invalidate ${probe.task}`
      );
      assert.notEqual(
        changed["@grasscn/web#build"],
        hashes["@grasscn/web#build"],
        `${probe.name} did not invalidate web build`
      );
      // oxlint-disable-next-line no-await-in-loop -- Depth-sorted output moves preserve ancestor path validity; each mutate→hash/build/assert→finally restore probe must finish before next shared-workspace probe.
      const log = await run(`${probe.name}-generation`, probe.run);
      assert.match(
        log,
        /cache miss/u,
        "Changed inputs must execute generation"
      );
      report.invalidation.push({
        after: changed[probe.task],
        before: hashes[probe.task],
        input: probe.name,
        task: probe.task,
      });
    } finally {
      // oxlint-disable-next-line no-await-in-loop -- Depth-sorted output moves preserve ancestor path validity; each mutate→hash/build/assert→finally restore probe must finish before next shared-workspace probe.
      await writeFile(probe.file, original);
    }
  }

  await run("restore-original-build", [turbo, "run", "build"]);
  const final = await productionBuildIdentity({ source });
  assert.equal(
    final.outputSha256,
    baseline.outputSha256,
    "Original source must restore original output"
  );
  report.sourceAfter = await sourceIdentity();
  assert.equal(
    report.sourceAfter.treeSha256,
    source.treeSha256,
    "Workflow probes changed source"
  );
  assert.equal(report.sourceAfter.commit, source.commit);
  await stampProductionBuild({
    source,
    verifiedCommand: [process.execPath, turbo, "run", "build"],
    verifiedExitCode: 0,
  });
  report.build = {
    buildId: final.buildId,
    generatedSha256: generated,
    outputSha256: final.outputSha256,
  };
  report.passed = true;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(
    path.join(directory, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );
  console.log(`Next workflow receipt: ${directory}`);
}
