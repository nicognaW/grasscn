import { writeFileSync } from "node:fs";

import { test, expect } from "@grasscn/tests/test";

const runtimeErrors = new WeakMap<object, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});

test.afterEach(async ({ page, browser }, info) => {
  writeFileSync(
    info.outputPath("runtime.json"),
    JSON.stringify({
      pageErrors: runtimeErrors.get(page) ?? [],
      browser: browser.version(),
    })
  );
  expect(runtimeErrors.get(page)).toEqual([]);
});

test("Data table recipe paginates rows and preserves rich cells and caller-owned TanStack state", async ({
  page,
}) => {
  await page.goto("/?component=data-table");
  await expect(page.getByRole("table", { name: "Worlds" })).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Alpha", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Birch", exact: true })
  ).toHaveCount(0);
  await expect(page.getByTestId("rich-cell").first()).toHaveText("4");
  await page.locator("#next").click();
  await expect(page.locator("#page")).toHaveText("2");
  await expect(
    page.getByRole("cell", { name: "Birch", exact: true })
  ).toBeVisible();
  await page.locator("#previous").click();
  await expect(page.locator("#page")).toHaveText("1");
  await page.locator("#ref").click();
  await expect(page.locator("#events")).toHaveText("4");
});

test("DataTable sorting, filtering CJK, visibility, page size and selection remain reactive", async ({
  page,
}) => {
  await page.goto("/?component=data-table");
  await page.locator("#sort").click();
  await expect(
    page.locator("[data-slot=table-body] [data-slot=table-cell]").first()
  ).toHaveAccessibleName("Alpha");
  await expect(
    page.getByRole("cell", { name: "Birch", exact: true })
  ).toBeVisible();
  await page.locator("#sort").click();
  await expect(
    page.locator("[data-slot=table-body] [data-slot=table-cell]").first()
  ).toHaveAccessibleName("你好，世界");
  await page.locator("#page-size").click();
  await expect(page.getByRole("cell")).toHaveCount(8);
  await page.locator("#visibility").click();
  await expect(
    page.getByRole("columnheader", { name: "Players", exact: true })
  ).toHaveCount(0);
  const input = page.getByRole("textbox", { name: "Filter worlds" });
  await expect(input).toHaveAttribute("spellcheck", "false");
  await input.fill("你好");
  await expect(
    page.getByRole("cell", { name: "你好，世界", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("cell")).toHaveCount(1);
  await page.getByRole("cell", { name: "你好，世界", exact: true }).click();
  await expect(page.locator("#selection")).toHaveText("1");
  await expect(
    page.getByRole("row").filter({
      has: page.getByRole("cell", { name: "你好，世界", exact: true }),
    })
  ).toHaveAttribute("aria-selected", "true");
  await input.fill("nonexistent");
  await expect(
    page.getByRole("cell", { name: "No results.", exact: true })
  ).toBeVisible();
  await input.fill("");
  await expect(page.getByRole("cell")).toHaveCount(4);
});
