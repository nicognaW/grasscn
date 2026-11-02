import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rename, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { sourceIdentity } from "@grasscn/tests/next-production";
import { chromium, expect } from "@playwright/test";
import { repoRoot, webRoot } from "@tests/paths";

import { assertConsumerPortAvailable } from "../installed/consumer-boundary.mjs";
import { documentationInventory } from "./documentation-inventory.mjs";

// Ordinary root dev command, fresh generated inputs, expanded public routes.
// Run through the shared 10% browser guard; this is not a Full test matrix.
await assertConsumerPortAvailable(5176);

const source = await sourceIdentity();

const directory = path.join(
  repoRoot,
  "test-results",
  "next-development",
  randomUUID()
);

await mkdir(directory, { recursive: true });

const physicalBackups = await realpath(directory);

assert.ok(
  physicalBackups.startsWith((await realpath(repoRoot)) + path.sep),
  "Development backups must stay physically in this source workspace"
);

/** @type {import("../runtime/verification-types.ts").DevelopmentReport} */
const report = {
  bun: Bun.version,
  command: ["bun", "run", "dev"],
  pages: [],
  passed: false,
  source,
  startedAt: new Date().toISOString(),
};

const preservedInputs = [];

for (const [index, name] of [
  ".source",
  "next-env.d.ts",
  ".next/dev",
].entries()) {
  const target = path.resolve(webRoot, name);

  try {
    const physicalInput = await realpath(target);
    assert.ok(
      physicalInput.startsWith((await realpath(webRoot)) + path.sep)
    );
    await rename(target, path.join(directory, `generated-backup-${index}`));

    if (index < 2) {
      preservedInputs.push({ index, name });
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

const child = spawn(process.execPath, ["run", "dev"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    GOMAXPROCS: "1",
    GOMEMLIMIT: "768MiB",
    NEXT_TELEMETRY_DISABLED: "1",
    RAYON_NUM_THREADS: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

report.process = { pid: child.pid, runtime: process.execPath };

/** @type {import("@playwright/test").Browser | undefined} */
let browser;
let logs = "";

/** @param {Buffer} value - Owned development server output. */
const onStdout = (value) => {
  logs += value.toString("utf-8");
  process.stdout.write(value);
};

/** @param {Buffer} value - Owned development server error output. */
const onStderr = (value) => {
  logs += value.toString("utf-8");
  process.stderr.write(value);
};

child.stdout.on("data", onStdout);

child.stderr.on("data", onStderr);

try {
  const deadline = Date.now() + 180_000;

  while (!logs.includes("Ready in")) {
    assert.ok(child.exitCode === null, `Ordinary dev exited ${child.exitCode}`);
    assert.ok(Date.now() < deadline, "Ordinary dev did not become ready");
    await delay(100);
  }

  browser = await chromium.launch({ channel: "msedge", headless: true });
  report.browser = browser.version();

  const context = await browser.newContext({
    viewport: { height: 900, width: 1280 },
  });

  const page = await context.newPage();
  const errors = [];

  page.on("pageerror", (error) => errors.push(error.message));
  const inventory = documentationInventory();

  const titles = new Map([["/docs", "Components"]]);

  for (const entry of inventory.pages) {
    titles.set(entry.route, entry.title);
  }

  for (const route of [
    "/",
    "/docs",
    "/charts",
    "/charts/line",
    ...inventory.pages.map((entry) => entry.route),
  ]) {
    const response = await page.goto(`http://127.0.0.1:5176${route}`, {
      timeout: 120_000,
      waitUntil: "domcontentloaded",
    });

    assert.ok(response?.ok() === true, `Ordinary dev route ${route}`);
    const title = titles.get(route);

    const heading =
      title !== undefined && title.length > 0
        ? page
            .locator(".minecraft-document")
            .getByRole("heading", { exact: true, level: 1, name: title })
        : page.getByRole("heading", { level: 1 });

    await expect(heading).toBeVisible({ timeout: 30_000 });
    report.pages.push({ route, title: await heading.textContent() });
  }

  await page.goto("http://127.0.0.1:5176/docs/components/button");

  const example = page.getByRole("region", {
    exact: true,
    name: "Button example",
  });

  await example.getByRole("button", { exact: true, name: "Button" }).click();
  await example.getByRole("tab", { exact: true, name: "Code" }).click();
  await expect(example.locator("pre")).toContainText("const ButtonExample =");
  await expect(example.locator("pre")).toContainText(
    "export default ButtonExample"
  );
  await page.screenshot({
    fullPage: true,
    path: path.join(directory, "development-docs-desktop.png"),
  });
  await page.setViewportSize({ height: 844, width: 390 });
  await example.getByRole("tablist").scrollIntoViewIfNeeded();
  await expect(
    example.getByRole("tab", { exact: true, name: "Preview" })
  ).toBeInViewport({ ratio: 1 });
  await expect(
    example.getByRole("tab", { exact: true, name: "Code" })
  ).toBeInViewport({ ratio: 1 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    ),
    true
  );
  await page.screenshot({
    fullPage: true,
    path: path.join(directory, "development-docs-mobile.png"),
  });
  assert.deepEqual(errors, [], "Ordinary dev emitted client errors");
  report.sourceAfter = await sourceIdentity();
  assert.equal(report.sourceAfter.treeSha256, source.treeSha256);
  assert.equal(report.sourceAfter.commit, source.commit);
  report.passed = true;
} finally {
  await browser?.close();

  if (process.platform === "win32") {
    // eslint-disable-next-line promise/avoid-new -- Bridge the owned process or server callback events into an awaited lifecycle step.
    await new Promise((resolve) => {
      const stop = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });

      stop.once("exit", resolve);
      stop.once("error", resolve);
    });
  } else {
    child.kill("SIGTERM");
  }

  // Dev owns fresh inputs during the check; restore the prior production/type
  // inputs afterward while retaining the generated dev versions for inspection.
  for (const { index, name } of preservedInputs) {
    const target = path.resolve(webRoot, name);

    try {
      const physicalInput = await realpath(target);
      assert.ok(
        physicalInput.startsWith(
          (await realpath(webRoot)) + path.sep
        )
      );
      await rename(
        target,
        path.join(directory, `generated-dev-after-${index}`)
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        // eslint-disable-next-line no-unsafe-finally -- Restoration failures must fail verification instead of silently losing prior generated inputs.
        throw error;
      }
    }

    const saved = path.join(directory, `generated-backup-${index}`);
    const physicalSavedInput = await realpath(saved);
    assert.ok(
      physicalSavedInput.startsWith((await realpath(directory)) + path.sep)
    );
    await rename(saved, target);
  }

  report.generatedInputsRestored = true;
  await writeFile(path.join(directory, "stdout.log"), logs);
  report.finishedAt = new Date().toISOString();
  await writeFile(
    path.join(directory, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );
  console.log(`Ordinary Next development receipt: ${directory}`);
}
