import { readFile } from "node:fs/promises";

import { test, expect } from "@grasscn/tests/test";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

test("homepage application examples keep their default public interactions", async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin);
  await expect(
    page.getByRole("heading", { exact: true, name: "grasscn" })
  ).toBeVisible();
  await page.getByRole("button", { exact: true, name: "Click me" }).click();
  await expect(page.getByLabel("Example button clicks")).toHaveText("1 clicks");
  await page
    .getByRole("button", { exact: true, name: "Create project" })
    .click();
  await expect(page.getByLabel("Project result")).toHaveText(
    "Created: Website redesign"
  );
  await page
    .getByLabel("Team message", { exact: true })
    .fill("Ready to build.");
  await page.getByRole("button", { exact: true, name: "Send" }).click();
  await expect(page.getByRole("log")).toContainText("Ready to build.");
  await page.getByRole("button", { exact: true, name: "Add $250" }).click();
  await expect(page.getByLabel("Savings percentage")).toHaveText("70% saved");

  const install = page.getByRole("region", {
    exact: true,
    name: "Place your first component.",
  });

  await install
    .getByRole("combobox", { exact: true, name: "Component to install" })
    .click();
  await page.getByRole("option", { exact: true, name: "chart" }).click();
  await install.getByRole("tab", { exact: true, name: "Bun" }).click();
  await install.getByRole("button", { exact: true, name: "Copy" }).click();
  await expect(install.getByRole("status")).toHaveText("Copied");
  expect(
    await page.evaluate(async () => await navigator.clipboard.readText())
  ).toBe(`bunx --bun shadcn@latest add ${new URL(origin).origin}/r/chart.json`);
  expect(errors).toEqual([]);
  await page.evaluate(() => {
    scrollTo(0, 0);
  });
  await page.screenshot({
    path: info.outputPath("homepage-desktop-viewport-actual.png"),
  });
  await page.screenshot({
    fullPage: true,
    path: info.outputPath("homepage-desktop-actual.png"),
  });

  const team = page.getByRole("region", {
    exact: true,
    name: "Better, together.",
  });

  await team.scrollIntoViewIfNeeded();
  await expect(
    team.locator('[data-mc-avatar-face][data-ready="true"]')
  ).toHaveCount(3);
  await page.mouse.move(0, 0);
  await team.screenshot({
    path: info.outputPath("homepage-team-desktop-actual.png"),
  });
  await page.setViewportSize({ height: 844, width: 390 });
  await page.evaluate(() => {
    scrollTo(0, 0);
  });
  await page.screenshot({
    path: info.outputPath("homepage-mobile-viewport-actual.png"),
  });
  await page.screenshot({
    fullPage: true,
    path: info.outputPath("homepage-mobile-actual.png"),
  });
  await team.scrollIntoViewIfNeeded();
  await team.screenshot({
    path: info.outputPath("homepage-team-mobile-actual.png"),
  });
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
});

test("chart showcase exposes the complete executable example and chart destinations", async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${origin}/charts`);
  await expect(
    page.getByRole("heading", { exact: true, name: "Charts" })
  ).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: info.outputPath("charts-overview-desktop-actual.png"),
  });
  await page.setViewportSize({ height: 844, width: 390 });
  await page.screenshot({
    fullPage: true,
    path: info.outputPath("charts-overview-mobile-actual.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await page.setViewportSize({ height: 900, width: 1280 });

  const metric = page.getByRole("region", {
    exact: true,
    name: "API response time",
  });

  await metric.getByRole("tab", { exact: true, name: "Code" }).click();
  await metric.getByRole("button", { exact: true, name: "Copy" }).click();
  await expect(metric.getByRole("status")).toHaveText("Copied");

  const copied = await page.evaluate(
    async () => await navigator.clipboard.readText()
  );

  const maintainedSource = await readFile(
    new URL(
      "../../../../apps/web/examples/charts/metric-example.tsx",
      import.meta.url
    ),
    "utf-8"
  );

  // Windows clipboard transfer normalizes line endings; compare every other source character exactly.
  expect(copied.replaceAll("\r\n", "\n")).toBe(
    maintainedSource.replaceAll("\r\n", "\n")
  );
  expect(copied).toContain("length: 240");
  expect(copied).toContain("@/components/chart-fps");
  await page.setViewportSize({ height: 844, width: 390 });
  await page.screenshot({
    fullPage: true,
    path: info.outputPath("chart-code-mobile-actual.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await page.setViewportSize({ height: 900, width: 1280 });
  await page
    .getByRole("navigation", { name: "Chart types" })
    .getByRole("link", { exact: true, name: "Bar" })
    .click();
  await expect(
    page.getByRole("heading", { exact: true, name: "Bar charts" })
  ).toBeVisible();
  await page
    .getByRole("region", { exact: true, name: "Website visitors" })
    .getByText("View chart data", { exact: true })
    .click();
  await expect(
    page.getByRole("cell", { exact: true, name: "Jan" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { exact: true, name: "Chart documentation" })
  ).toHaveAttribute("href", "/docs/components/chart");
  await page.screenshot({
    fullPage: true,
    path: info.outputPath("charts-desktop-actual.png"),
  });
  await page.setViewportSize({ height: 844, width: 390 });
  await page.screenshot({
    fullPage: true,
    path: info.outputPath("charts-mobile-actual.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
});
