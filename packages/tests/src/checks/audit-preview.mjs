import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, expect } from "@playwright/test";
import { repoRoot, webFile } from "@tests/paths";

const origin = process.argv[2] ?? "http://127.0.0.1:5176/";

const out = path.resolve(
  process.argv[3] ?? path.join(repoRoot, ".pixel-perfect-test/preview-audit")
);

const catalog = JSON.parse(
  await readFile(webFile("catalog.generated.json"), "utf-8")
);

await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { height: 1000, width: 1440 } });
const errors = [];
const rows = [];

page.on("pageerror", (e) => errors.push(e.message));

try {
  await page.goto(origin);
  await expect(
    page.getByRole("heading", { name: /Familiar controls/ })
  ).toBeVisible();
  await expect(
    page.locator("main .component-grid > .component-card")
  ).toHaveCount(catalog.components.length);

  const duplicates = await page.evaluate(() => {
    const seen = new Set();
    const duplicates = [];

    for (const n of document.querySelectorAll("[id]")) {
      if (seen.has(n.id)) {
        duplicates.push(n.id);
      }

      seen.add(n.id);
    }

    return duplicates;
  });

  expect(duplicates).toEqual([]);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: path.join(out, "desktop.png") });

  for (const c of catalog.components) {
    await page.goto(`${origin}#${c.name}`);
    const region = page.getByRole("region", { exact: true, name: c.title });
    await expect(region).toBeVisible();
    await expect(
      page.locator("main .component-grid > .component-card")
    ).toHaveCount(1);
    rows.push({ component: c.name, visible: true });
  }

  for (const viewport of [
    { height: 1000, width: 1440 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${origin}#all`);
    await expect(
      page.locator("main .component-grid > .component-card")
    ).toHaveCount(catalog.components.length);

    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));

    rows.push({ viewport, width });
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: path.join(
        out,
        viewport.width === 390 ? "mobile.png" : "desktop-final.png"
      ),
    });
  }

  expect(errors).toEqual([]);
  console.log(
    `Preview audit: ${catalog.components.length} demos render; no runtime errors`
  );
} finally {
  await writeFile(
    path.join(out, "report.json"),
    `${JSON.stringify(
      {
        browser: browser.version(),
        components: catalog.components.length,
        coveredComponents: catalog.completedCount,
        errors,
        origin,
        rows,
      },
      null,
      2
    )}\n`
  );
  await browser.close();
}
