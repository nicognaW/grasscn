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
    page.getByRole("heading", { name: "grasscn", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Click me", exact: true }).click();
  await expect(page.getByLabel("Example button clicks")).toHaveText("1 clicks");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(page.getByLabel("Project result")).toHaveText(
    "Created: Website redesign"
  );
  await page
    .getByLabel("Team message", { exact: true })
    .fill("Ready to build.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("log")).toContainText("Ready to build.");
  await page.getByRole("button", { name: "Add $250", exact: true }).click();
  await expect(page.getByLabel("Savings percentage")).toHaveText("70% saved");
  const install = page.getByRole("region", {
    name: "Place your first component.",
    exact: true,
  });
  await install
    .getByRole("combobox", { name: "Component to install", exact: true })
    .click();
  await page.getByRole("option", { name: "chart", exact: true }).click();
  await install.getByRole("tab", { name: "Bun", exact: true }).click();
  await install.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(install.getByRole("status")).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `bunx --bun shadcn@latest add ${new URL(origin).origin}/r/chart.json`
  );
  expect(errors).toEqual([]);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("homepage-desktop-viewport-actual.png"),
  });
  await page.screenshot({
    path: info.outputPath("homepage-desktop-actual.png"),
    fullPage: true,
  });
  const team = page.getByRole("region", {
    name: "Better, together.",
    exact: true,
  });
  await team.scrollIntoViewIfNeeded();
  await expect(
    team.locator('[data-mc-avatar-face][data-ready="true"]')
  ).toHaveCount(3);
  await page.mouse.move(0, 0);
  await team.screenshot({
    path: info.outputPath("homepage-team-desktop-actual.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("homepage-mobile-viewport-actual.png"),
  });
  await page.screenshot({
    path: info.outputPath("homepage-mobile-actual.png"),
    fullPage: true,
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
    page.getByRole("heading", { name: "Charts", exact: true })
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("charts-overview-desktop-actual.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("charts-overview-mobile-actual.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  const metric = page.getByRole("region", {
    name: "API response time",
    exact: true,
  });
  await metric.getByRole("tab", { name: "Code", exact: true }).click();
  await metric.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(metric.getByRole("status")).toHaveText("Copied");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const maintainedSource = await readFile(
    new URL(
      "../../../../apps/web/examples/charts/metric-example.tsx",
      import.meta.url
    ),
    "utf8"
  );
  // Windows clipboard transfer normalizes line endings; compare every other source character exactly.
  expect(copied.replaceAll("\r\n", "\n")).toBe(
    maintainedSource.replaceAll("\r\n", "\n")
  );
  expect(copied).toContain("length: 240");
  expect(copied).toContain("@/components/chart-fps");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("chart-code-mobile-actual.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page
    .getByRole("navigation", { name: "Chart types" })
    .getByRole("link", { name: "Bar", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bar charts", exact: true })
  ).toBeVisible();
  await page
    .getByRole("region", { name: "Website visitors", exact: true })
    .getByText("View chart data", { exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Jan", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Chart documentation", exact: true })
  ).toHaveAttribute("href", "/docs/components/chart");
  await page.screenshot({
    path: info.outputPath("charts-desktop-actual.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("charts-mobile-actual.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
});
