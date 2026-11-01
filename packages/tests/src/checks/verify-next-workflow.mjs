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
import { repoRoot, webRoot, packageBin } from "@tests/paths";

// Execute once sources are frozen, through the 4% build guard. Backups are kept;
// generated-output restoration and source probes never touch another worktree.
const directory = path.join(
  repoRoot,
  "test-results",
  "next-workflow",
  randomUUID()
);
await mkdir(directory, { recursive: true });
assert.ok(
  (await realpath(directory)).startsWith((await realpath(repoRoot)) + path.sep),
  "Workflow backups must stay physically in this source workspace"
);
const source = await sourceIdentity(),
  report = {
    source,
    bun: Bun.version,
    startedAt: new Date().toISOString(),
    steps: [],
    passed: false,
  };
async function run(name, args, { capture = false } = {}) {
  let stdout = "";
  const child = spawn(process.execPath, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      GOMEMLIMIT: "768MiB",
      GOMAXPROCS: "1",
      RAYON_NUM_THREADS: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (value) => {
    stdout += value;
    if (!capture) process.stdout.write(value);
  });
  child.stderr.on("data", (value) => process.stderr.write(value));
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  await writeFile(path.join(directory, name + ".log"), stdout);
  report.steps.push({ name, exitCode: code });
  assert.equal(code, 0, `${name} failed`);
  return stdout;
}
let turbo;
async function preserveInstalledDependencies() {
  const root = await realpath(repoRoot),
    lock = Bun.JSON5.parse(
      await readFile(path.join(repoRoot, "bun.lock"), "utf8")
    );
  const targets = [];
  for (const workspace of new Set([
    "",
    ...Object.keys(lock.workspaces ?? {}),
  ])) {
    const target = path.resolve(repoRoot, workspace, "node_modules"),
      relative = path.relative(repoRoot, target);
    assert.ok(
      relative &&
        !relative.startsWith(".." + path.sep) &&
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
      targets.push({ target, relative, physical });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const backup = path.join(directory, "installed-dependency-backup");
  await mkdir(backup);
  for (const [index, item] of targets
    .sort((left, right) => right.target.length - left.target.length)
    .entries())
    await rename(item.target, path.join(backup, String(index)));
  report.freshDependencyInstall = {
    backup,
    previousDirectories: targets.map(({ relative, physical }) => ({
      relative,
      physical,
    })),
  };
}
async function generatedDocsIdentity() {
  const hash = createHash("sha256");
  async function visit(directory) {
    for (const entry of (
      await readdir(directory, { withFileTypes: true })
    ).sort((left, right) => left.name.localeCompare(right.name))) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(filename);
      else if (entry.isFile())
        hash
          .update(path.relative(webRoot, filename))
          .update(await readFile(filename));
    }
  }
  await visit(path.join(webRoot, ".source"));
  hash.update(await readFile(path.join(webRoot, "next-env.d.ts")));
  return hash.digest("hex");
}
const taskHashes = async (name) => {
  const data = JSON.parse(
    await run(name, [turbo, "run", "build", "--dry=json"], { capture: true })
  );
  return Object.fromEntries(data.tasks.map((task) => [task.taskId, task.hash]));
};
try {
  const expectedBun = JSON.parse(
    await readFile(path.join(repoRoot, "package.json"), "utf8")
  ).packageManager;
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
        physical.includes(path.sep + "node_modules" + path.sep),
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
  const baseline = await productionBuildIdentity({ source }),
    generated = await generatedDocsIdentity(),
    hashes = await taskHashes("baseline-hashes");
  const outputPaths = [".source", ".next", "next-env.d.ts", "public/r"];
  const backup = path.join(directory, "generated-backup");
  await mkdir(backup);
  for (const [index, name] of outputPaths.entries()) {
    const target = path.resolve(webRoot, name),
      resolved = await realpath(target);
    assert.ok(
      resolved.startsWith((await realpath(webRoot)) + path.sep),
      "Generated backup must stay in this web workspace"
    );
    await rename(target, path.join(backup, String(index)));
  }
  const restoredLog = await run("cache-restore", [turbo, "run", "build"]);
  assert.match(
    restoredLog,
    /cache hit/,
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
  const probes = [
    {
      name: "mdx",
      file: path.join(webRoot, "content/docs/components/button.mdx"),
      task: "@grasscn/web#generate",
      change: (bytes) =>
        Buffer.concat([
          bytes,
          Buffer.from("\nWorkflow cache invalidation sentinel.\n"),
        ]),
      run: [turbo, "run", "generate"],
    },
    {
      name: "registry",
      file: path.join(webRoot, "registry.json"),
      task: "@grasscn/web#registry:build",
      change: (bytes) => {
        const json = JSON.parse(bytes);
        json.items.find((item) => item.name === "button").description =
          "Workflow invalidation sentinel";
        return Buffer.from(JSON.stringify(json, null, 2) + "\n");
      },
      run: [turbo, "run", "registry:build"],
    },
    {
      name: "config",
      file: path.join(webRoot, "next.config.mjs"),
      task: "@grasscn/web#generate",
      change: (bytes) =>
        Buffer.concat([
          bytes,
          Buffer.from("\n// Workflow cache invalidation sentinel.\n"),
        ]),
      run: [turbo, "run", "generate"],
    },
  ];
  report.invalidation = [];
  for (const probe of probes) {
    const original = await readFile(probe.file);
    try {
      await writeFile(probe.file, probe.change(original));
      const changed = await taskHashes(probe.name + "-hashes");
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
      const log = await run(probe.name + "-generation", probe.run);
      assert.match(log, /cache miss/, "Changed inputs must execute generation");
      report.invalidation.push({
        input: probe.name,
        task: probe.task,
        before: hashes[probe.task],
        after: changed[probe.task],
      });
    } finally {
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
  await stampProductionBuild({ source });
  report.build = {
    buildId: final.buildId,
    outputSha256: final.outputSha256,
    generatedSha256: generated,
  };
  report.passed = true;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(
    path.join(directory, "report.json"),
    JSON.stringify(report, null, 2) + "\n"
  );
  console.log(`Next workflow receipt: ${directory}`);
}
