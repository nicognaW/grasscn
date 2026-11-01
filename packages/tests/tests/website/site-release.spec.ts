import { readFileSync } from "node:fs";

import { test, expect } from "@grasscn/tests/test";
import { documentationInventory } from "@tests/checks/documentation-inventory.mjs";
import { resolveRepositoryPath, testRoot } from "@tests/paths";
const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/, "/");
const index = documentationInventory().pages;

const internal = /work in progress|\bWIP\b|LOCAL PREVIEW|still being verified/i;
test("search index covers every published item and its named exports", async ({
  request,
}) => {
  for (const name of documentationInventory().items)
    expect(index.some((page) => page.name === name)).toBe(true);
  for (const [query, name] of [
    ["CardHeader", "card"],
    ["FieldLabel", "field"],
    ["ChartProfilerFrame", "chart"],
  ]) {
    const response = await request.get(origin + "api/search?query=" + query);
    expect(response.ok()).toBe(true);
    expect(JSON.stringify(await response.json())).toContain(
      "/docs/components/" + name
    );
  }
});
test("all production sections share navigation and omit internal status content", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "",
    "docs",
    "docs/components/button",
    "charts",
    "charts/line",
  ]) {
    await page.goto(`${origin}${path}`);
    await expect(
      page.getByRole("navigation", { name: "Main navigation" })
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
    expect(await page.locator("body").innerText()).not.toMatch(internal);
  }
  expect(errors).toEqual([]);
});
test("search shows all items, more than six matches, and nested component imports", async ({
  page,
}) => {
  await page.goto(origin);
  const search = page.getByRole("combobox", {
    name: "Search documentation",
    exact: true,
  });
  await search.click();
  await search.fill("field");
  await expect.poll(() => page.getByRole("option").count()).toBeGreaterThan(6);
  await expect(
    page.getByRole("option", { name: "FieldLabel", exact: true })
  ).toBeVisible();
  await search.fill("CardHeader");
  await page.getByRole("option", { name: "CardHeader", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Card");
  await expect(page).toHaveURL(origin + "docs/components/card#usage");
  await search.fill("你好");
  await expect(page.getByRole("option")).toHaveCount(0);
});
test("component pages expose live preview, source, installation and composition", async ({
  page,
}) => {
  await page.goto(origin + "docs/components/button");
  const example = page.getByRole("region", {
    name: "Button example",
    exact: true,
  });
  await example.getByRole("button", { name: "Button", exact: true }).click();
  await example.getByRole("tab", { name: "Code", exact: true }).click();
  await expect(example.locator("pre")).toContainText("function ButtonExample");
  await expect(example.locator("pre")).not.toContainText("function Button({");
  const implementation = page.getByRole("region", {
    name: "Button implementation source",
    exact: true,
  });
  await expect(implementation).toContainText("Component implementation");
  await expect(implementation).toContainText("components/ui/button.tsx");
  await expect(
    page.getByRole("heading", { name: "Installation", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Composition", exact: true })
  ).toBeVisible();
  const playground = page.locator(".documentation-playground");
  await playground
    .getByRole("button", { name: "Button", exact: true })
    .first()
    .click();
  await expect(playground.getByLabel("Button activations")).toHaveText(
    "Pressed 1 time"
  );
});
for (const width of [320, 390, 768, 1440])
  test(`shared site navigation is usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + "docs/components/input");
    const browse = page.getByRole("button", {
      name: "Browse documentation",
      exact: true,
    });
    if (await browse.isVisible()) await browse.click();
    await page
      .getByRole("navigation", { name: "Documentation", exact: true })
      .getByRole("link", { name: "Form", exact: true })
      .click();
    await expect(page.locator("h1")).toHaveText("Form");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Charts", exact: true })
      .click();
    await expect(page.locator("h1")).toHaveText("Charts");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  });

test("canonical routes reload and legacy links still resolve", async ({
  page,
}) => {
  await page.goto(origin + "docs/components/button");
  await expect(page.locator("h1")).toHaveText("Button");
  await page.reload();
  await expect(page.locator("h1")).toHaveText("Button");
  await expect(page).toHaveTitle(/Button.*grasscn/);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Charts", exact: true })
    .click();
  await expect(page).toHaveURL(origin + "charts");
  await page.goBack();
  await expect(page.locator("h1")).toHaveText("Button");
  await page.goto(origin + "components/button?ref=bookmark#component-import");
  await expect(page.locator("h1")).toHaveText("Button");
  await page.goto(origin + "charts/line");
  await expect(page.locator("h1")).toHaveText("Line charts");
});

for (const width of [320, 390])
  test(`compact demos keep actions reachable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const name of ["button-group", "table", "pagination"]) {
      await page.goto(origin + "docs/components/" + name);
      await expect(
        page.locator(".documentation-playground .demo-stage")
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true);
      if (name === "button-group") {
        await page
          .locator(".documentation-playground")
          .getByRole("button", { name: "Load", exact: true })
          .click();
        await expect(
          page
            .locator(".documentation-playground")
            .getByLabel("Button group action")
        ).toHaveText("World loaded");
      } else if (name === "table") {
        await page
          .locator(".documentation-playground")
          .getByRole("button", { name: "Join", exact: true })
          .first()
          .click();
        await expect(
          page.locator(".documentation-playground").getByLabel("Selected world")
        ).toHaveText("Grasslands");
      } else {
        await page
          .locator(".documentation-playground")
          .getByRole("link", { name: "2", exact: true })
          .click();
        await expect(
          page
            .locator(".documentation-playground")
            .getByLabel("Pagination current page")
        ).toHaveText("Page 2 / 3");
      }
    }
  });
test("shared controls retain native rendering and the sticky header is opaque", async ({
  page,
}) => {
  await page.goto(origin + "docs/components/button");
  const views = page.getByRole("region", {
    name: "Button example",
    exact: true,
  });
  for (const label of ["Preview", "Code"])
    await expect(
      views.getByRole("tab", { name: label, exact: true })
    ).toHaveAttribute("data-slot", "tabs-trigger");
  await expect(
    page
      .getByRole("navigation", { name: "Documentation", exact: true })
      .getByRole("link", { name: "Button", exact: true })
  ).toHaveAttribute("data-slot", "button");
  expect(
    await page
      .getByRole("banner")
      .evaluate((el) => getComputedStyle(el).backgroundColor)
  ).toBe("rgb(32, 32, 32)");
  await page.goto(origin + "charts");
  await expect(
    page.getByRole("navigation", { name: "Chart types" }).getByRole("link")
  ).toHaveCount(12);
  await expect(
    page
      .getByRole("region", { name: "API response time", exact: true })
      .getByRole("tab", { name: "Code", exact: true })
  ).toHaveAttribute("data-slot", "tabs-trigger");
});

test("website code uses the shared Shiki highlighter without changing source text", async ({
  page,
}) => {
  await page.goto(origin + "docs/components/button");
  const implementation = page.getByRole("region", {
    name: "Button implementation source",
    exact: true,
  });
  await implementation
    .getByRole("button", { name: "Expand", exact: true })
    .click();
  await expect(implementation.locator(".mc-code-token").first()).toBeVisible();
  expect(
    (await implementation.locator("code").textContent())?.replace(/\r\n/g, "\n")
  ).toBe(
    readFileSync(
      resolveRepositoryPath("registry/ui/button.tsx", testRoot),
      "utf8"
    ).replace(/\r\n/g, "\n")
  );
  const colors = await implementation
    .locator(".mc-code-token")
    .evaluateAll((tokens) => [
      ...new Set(tokens.map((token) => getComputedStyle(token).color)),
    ]);
  expect(colors).toContain("rgb(255, 85, 255)");
  expect(colors).toContain("rgb(85, 255, 85)");
});
