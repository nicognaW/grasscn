import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rename, realpath, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { sourceIdentity } from "@grasscn/tests/next-production";
import { repoRoot, webRoot, testRoot } from "@tests/paths";

import { assertConsumerPortAvailable } from "../installed/consumer-boundary.mjs";
import { documentationInventory } from "./documentation-inventory.mjs";

// Ordinary root dev command, fresh generated inputs, expanded public routes.
// Run through the shared 10% browser guard; this is not a Full test matrix.
await assertConsumerPortAvailable(5176);
const source = await sourceIdentity(),
  directory = path.join(
    repoRoot,
    "test-results",
    "next-development",
    randomUUID()
  );
await mkdir(directory, { recursive: true });
assert.ok(
  (await realpath(directory)).startsWith((await realpath(repoRoot)) + path.sep),
  "Development backups must stay physically in this source workspace"
);
const report = {
  source,
  startedAt: new Date().toISOString(),
  bun: Bun.version,
  command: ["bun", "run", "dev"],
  pages: [],
  passed: false,
};
const preservedInputs = [];
for (const [index, name] of [
  ".source",
  "next-env.d.ts",
  ".next/dev",
].entries()) {
  const target = path.resolve(webRoot, name);
  try {
    assert.ok(
      (await realpath(target)).startsWith((await realpath(webRoot)) + path.sep)
    );
    await rename(target, path.join(directory, "generated-backup-" + index));
    if (index < 2) preservedInputs.push({ index, name });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const child = spawn(process.execPath, ["run", "dev"], {
  cwd: repoRoot,
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
    GOMEMLIMIT: "768MiB",
    GOMAXPROCS: "1",
    RAYON_NUM_THREADS: "1",
  },
});
report.process = { pid: child.pid, runtime: process.execPath };
let logs = "",
  browser;
child.stdout.on("data", (value) => {
  logs += value;
  process.stdout.write(value);
});
child.stderr.on("data", (value) => {
  logs += value;
  process.stderr.write(value);
});
try {
  const deadline = Date.now() + 180000;
  while (!/Ready in/.test(logs)) {
    assert.ok(child.exitCode === null, `Ordinary dev exited ${child.exitCode}`);
    assert.ok(Date.now() < deadline, "Ordinary dev did not become ready");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const require = createRequire(path.join(testRoot, "package.json")),
    { chromium, expect } = require("@playwright/test");
  browser = await chromium.launch({ channel: "msedge", headless: true });
  report.browser = browser.version();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of [
    "/",
    "/docs",
    "/charts",
    "/charts/line",
    ...documentationInventory().pages.map((entry) => entry.route),
  ]) {
    const response = await page.goto("http://127.0.0.1:5176" + route, {
      timeout: 120000,
      waitUntil: "domcontentloaded",
    });
    assert.ok(response?.ok(), `Ordinary dev route ${route}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 30000 });
    report.pages.push({ route, title: await page.locator("h1").innerText() });
  }
  await page.goto("http://127.0.0.1:5176/docs/components/button");
  const example = page.getByRole("region", {
    name: "Button example",
    exact: true,
  });
  await example.getByRole("button", { name: "Button", exact: true }).click();
  await example.getByRole("tab", { name: "Code", exact: true }).click();
  await expect(example.locator("pre")).toContainText("function ButtonExample");
  await page.screenshot({
    path: path.join(directory, "development-docs-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await example.getByRole("tablist").scrollIntoViewIfNeeded();
  await expect(
    example.getByRole("tab", { name: "Preview", exact: true })
  ).toBeInViewport({ ratio: 1 });
  await expect(
    example.getByRole("tab", { name: "Code", exact: true })
  ).toBeInViewport({ ratio: 1 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    ),
    true
  );
  await page.screenshot({
    path: path.join(directory, "development-docs-mobile.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, [], "Ordinary dev emitted client errors");
  report.sourceAfter = await sourceIdentity();
  assert.equal(report.sourceAfter.treeSha256, source.treeSha256);
  assert.equal(report.sourceAfter.commit, source.commit);
  report.passed = true;
} finally {
  await browser?.close();
  if (process.platform === "win32")
    await new Promise((resolve) => {
      const stop = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      stop.once("exit", resolve);
      stop.once("error", resolve);
    });
  else child.kill("SIGTERM");
  // Dev owns fresh inputs during the check; restore the prior production/type
  // inputs afterward while retaining the generated dev versions for inspection.
  for (const { index, name } of preservedInputs) {
    const target = path.resolve(webRoot, name);
    try {
      assert.ok(
        (await realpath(target)).startsWith(
          (await realpath(webRoot)) + path.sep
        )
      );
      await rename(
        target,
        path.join(directory, "generated-dev-after-" + index)
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const saved = path.join(directory, "generated-backup-" + index);
    assert.ok(
      (await realpath(saved)).startsWith((await realpath(directory)) + path.sep)
    );
    await rename(saved, target);
  }
  report.generatedInputsRestored = true;
  await writeFile(path.join(directory, "stdout.log"), logs);
  report.finishedAt = new Date().toISOString();
  await writeFile(
    path.join(directory, "report.json"),
    JSON.stringify(report, null, 2) + "\n"
  );
  console.log(`Ordinary Next development receipt: ${directory}`);
}
