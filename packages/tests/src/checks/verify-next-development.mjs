import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rename, realpath, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { sourceIdentity } from "@grasscn/tests/next-production";
import { repoRoot, webRoot, testRoot } from "@tests/paths";

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

const awaitedIdentity1 = await realpath(directory);

assert.ok(
  awaitedIdentity1.startsWith((await realpath(repoRoot)) + path.sep),
  "Development backups must stay physically in this source workspace"
);

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

  // eslint-disable-next-line no-await-in-loop -- Complete each retained checkpoint read or generated-input restoration before advancing to the next dependent stage.
  try {
    const awaitedIdentity2 = await realpath(target);
    assert.ok(
      // eslint-disable-next-line no-await-in-loop -- Validate the current browser route or restore the current generated input before advancing.
      awaitedIdentity2.startsWith((await realpath(webRoot)) + path.sep)
    );
    // eslint-disable-next-line no-await-in-loop -- Validate the current browser route or restore the current generated input before advancing.
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

let browser;
let logs = "";

child.stdout.on("data", (value) => {
  logs += value;
  process.stdout.write(value);
});

child.stderr.on("data", (value) => {
  logs += value;
  process.stderr.write(value);
});

try {
  const deadline = Date.now() + 180_000;

  while (!logs.includes("Ready in")) {
    assert.ok(child.exitCode === null, `Ordinary dev exited ${child.exitCode}`);
    assert.ok(Date.now() < deadline, "Ordinary dev did not become ready");
    // eslint-disable-next-line no-await-in-loop, promise/avoid-new -- Bridge the owned process or server callback events into an awaited lifecycle step.
    await delay(100);
  }

  const require = createRequire(path.join(testRoot, "package.json"));
  const { chromium, expect } = require("@playwright/test");

  browser = await chromium.launch({ channel: "msedge", headless: true });
  report.browser = browser.version();

  const context = await browser.newContext({
    viewport: { height: 900, width: 1280 },
  });

  const page = await context.newPage();
  const errors = [];

  page.on("pageerror", (error) => errors.push(error.message));
  const inventory = documentationInventory();

  const titles = new Map([
    ["/docs", "Components"],
    ...inventory.pages.map((entry) => [entry.route, entry.title]),
  ]);

  for (const route of [
    "/",
    "/docs",
    "/charts",
    "/charts/line",
    ...inventory.pages.map((entry) => entry.route),
  ]) {
    // eslint-disable-next-line no-await-in-loop -- Validate the current browser route or restore the current generated input before advancing.
    const response = await page.goto(`http://127.0.0.1:5176${route}`, {
      timeout: 120_000,
      waitUntil: "domcontentloaded",
    });

    assert.ok(response?.ok(), `Ordinary dev route ${route}`);
    const title = titles.get(route);

    const heading = title
      ? page
          .locator(".minecraft-document")
          .getByRole("heading", { exact: true, level: 1, name: title })
      : page.getByRole("heading", { level: 1 });

    // eslint-disable-next-line no-await-in-loop -- Validate the current browser route or restore the current generated input before advancing.
    await expect(heading).toBeVisible({ timeout: 30_000 });
    // eslint-disable-next-line no-await-in-loop -- Validate the current browser route or restore the current generated input before advancing.
    report.pages.push({ route, title: await heading.textContent() });
  }

  await page.goto("http://127.0.0.1:5176/docs/components/button");

  const example = page.getByRole("region", {
    exact: true,
    name: "Button example",
  });

  await example.getByRole("button", { exact: true, name: "Button" }).click();
  await example.getByRole("tab", { exact: true, name: "Code" }).click();
  await expect(example.locator("pre")).toContainText("function ButtonExample");
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

    // eslint-disable-next-line no-await-in-loop -- Complete each retained checkpoint read or generated-input restoration before advancing to the next dependent stage.
    try {
      const awaitedIdentity3 = await realpath(target);
      assert.ok(
        // eslint-disable-next-line no-await-in-loop -- Validate the current browser route or restore the current generated input before advancing.
        awaitedIdentity3.startsWith(
          // eslint-disable-next-line no-await-in-loop -- Validate the current browser route or restore the current generated input before advancing.
          (await realpath(webRoot)) + path.sep
        )
      );
      // eslint-disable-next-line no-await-in-loop -- Validate the current browser route or restore the current generated input before advancing.
      await rename(
        target,
        path.join(directory, `generated-dev-after-${index}`)
      );
    } catch (error) {
      // eslint-disable-next-line no-unsafe-finally -- Restoration failures must fail verification instead of leaving prior generated inputs silently missing.
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    // eslint-disable-next-line no-await-in-loop -- Complete each retained checkpoint read or generated-input restoration before advancing to the next dependent stage.
    const saved = path.join(directory, `generated-backup-${index}`);
    const awaitedIdentity4 = await realpath(saved);
    assert.ok(
      // eslint-disable-next-line no-await-in-loop -- Validate the current browser route or restore the current generated input before advancing.
      awaitedIdentity4.startsWith((await realpath(directory)) + path.sep)
    );
    // eslint-disable-next-line no-await-in-loop -- Validate the current browser route or restore the current generated input before advancing.
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
