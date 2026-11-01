import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, expect } from "@playwright/test";
import { repoRoot, resolveRepositoryPath } from "@tests/paths";
const origin = process.argv[2] ?? "http://127.0.0.1:5176/",
  out = path.resolve(
    process.argv[3] ?? path.join(repoRoot, ".pixel-perfect-test/preview-audit")
  ),
  catalog = JSON.parse(
    await readFile(
      resolveRepositoryPath("preview/catalog.generated.json"),
      "utf8"
    )
  );
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge" }),
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [],
  rows = [];
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
    const seen = new Set(),
      duplicates = [];
    for (const n of document.querySelectorAll("[id]")) {
      if (seen.has(n.id)) duplicates.push(n.id);
      seen.add(n.id);
    }
    return duplicates;
  });
  expect(duplicates).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(out, "desktop.png") });
  for (const c of catalog.components) {
    await page.goto(`${origin}#${c.name}`);
    const region = page.getByRole("region", { name: c.title, exact: true });
    await expect(region).toBeVisible();
    await expect(
      page.locator("main .component-grid > .component-card")
    ).toHaveCount(1);
    rows.push({ component: c.name, visible: true });
  }
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(origin + "#all");
    await expect(
      page.locator("main .component-grid > .component-card")
    ).toHaveCount(catalog.components.length);
    const width = await page.evaluate(() => ({
      viewport: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    rows.push({ viewport, width });
    await page.evaluate(() => window.scrollTo(0, 0));
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
    JSON.stringify(
      {
        origin,
        browser: browser.version(),
        components: catalog.components.length,
        coveredComponents: catalog.completedCount,
        rows,
        errors,
      },
      null,
      2
    ) + "\n"
  );
  await browser.close();
}
