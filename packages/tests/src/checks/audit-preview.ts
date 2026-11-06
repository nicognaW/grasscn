import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, expect } from "@playwright/test";
import { repoRoot } from "@tests/paths";

import { documentationInventory } from "./documentation-inventory";

const origin = (process.argv[2] ?? "http://127.0.0.1:5176").replace(/\/$/u, "");

const out = path.resolve(
  process.argv[3] ?? path.join(repoRoot, "test-results/preview-audit")
);

const inventory = documentationInventory();

await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage();
const errors: string[] = [];

const rows: (
  | {
      route: string;
      scrollWidth: number;
      viewport: { height: number; width: number };
    }
  | {
      playground: ReturnType<
        typeof documentationInventory
      >["pages"][number]["playground"];
      route: string;
      visible: boolean;
    }
)[] = [];

page.on("pageerror", (error) => errors.push(error.message));

try {
  for (const viewport of [
    { height: 1000, width: 1440 },
    { height: 844, width: 390 },
  ]) {
    // oxlint-disable-next-line no-await-in-loop -- Viewport and navigation loops share one page; measured content/screenshots belong to each current viewport/route before advancing.
    await page.setViewportSize(viewport);

    for (const route of [
      "/",
      "/charts",
      "/docs/components/button",
      "/docs/components/form",
    ]) {
      // oxlint-disable-next-line no-await-in-loop -- Viewport and navigation loops share one page; measured content/screenshots belong to each current viewport/route before advancing.
      await page.goto(origin + route);
      // oxlint-disable-next-line no-await-in-loop -- Viewport and navigation loops share one page; measured content/screenshots belong to each current viewport/route before advancing.
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // oxlint-disable-next-line no-await-in-loop -- Viewport and navigation loops share one page; measured content/screenshots belong to each current viewport/route before advancing.
      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth
      );

      expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
      // oxlint-disable-next-line no-await-in-loop -- Viewport and navigation loops share one page; measured content/screenshots belong to each current viewport/route before advancing.
      await page.screenshot({
        fullPage: true,
        path: path.join(
          out,
          `${viewport.width}-${route.replaceAll("/", "-") || "home"}.png`
        ),
      });
      rows.push({ route, scrollWidth, viewport });
    }
  }

  for (const entry of inventory.pages) {
    // oxlint-disable-next-line no-await-in-loop -- Viewport and navigation loops share one page; measured content/screenshots belong to each current viewport/route before advancing.
    await page.goto(origin + entry.route);
    // oxlint-disable-next-line no-await-in-loop -- Viewport and navigation loops share one page; measured content/screenshots belong to each current viewport/route before advancing.
    await expect(
      page
        .locator(".minecraft-document")
        .getByRole("heading", { exact: true, level: 1, name: entry.title })
    ).toHaveText(entry.title);

    if (entry.playground) {
      // oxlint-disable-next-line no-await-in-loop -- Viewport and navigation loops share one page; measured content/screenshots belong to each current viewport/route before advancing.
      await expect(page.locator(".documentation-playground")).toBeVisible();
    }

    // oxlint-disable-next-line no-await-in-loop -- Viewport and navigation loops share one page; measured content/screenshots belong to each current viewport/route before advancing.
    const duplicates = await page.locator("[id]").evaluateAll((nodes) => {
      const seen = new Set<string>();

      return nodes.flatMap((node) => {
        if (seen.has(node.id)) {
          return [node.id];
        }

        seen.add(node.id);

        return [];
      });
    });

    expect(duplicates).toEqual([]);
    rows.push({
      playground: entry.playground,
      route: entry.route,
      visible: true,
    });
  }

  expect(errors).toEqual([]);
} finally {
  await writeFile(
    path.join(out, "report.json"),
    `${JSON.stringify(
      { browser: browser.version(), errors, inventory, origin, rows },
      null,
      2
    )}\n`
  );
  await browser.close();
}
