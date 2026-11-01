import { readFileSync } from "node:fs";

import { test, expect } from "@grasscn/tests/test";
import { webFile } from "@tests/paths";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/";

const index = JSON.parse(
  readFileSync(webFile("search.generated.json"), "utf-8")
) as { name: string; title: string; exports: string[] }[];

const internal =
  /work in progress|\bWIP\b|26\.2|native cases|62\s*\/\s*62|19722|LOCAL PREVIEW|still being verified/i;

test("search index covers every published item and its named exports", () => {
  const registry = JSON.parse(readFileSync(webFile("registry.json"), "utf-8"));
  expect(index.map((i) => i.name).sort()).toEqual(
    registry.items.map((i: { name: string }) => i.name).sort()
  );
  expect(index.find((i) => i.name === "card")?.exports).toContain("CardHeader");
  expect(index.find((i) => i.name === "form")?.exports).toContain("FieldLabel");
  expect(index.find((i) => i.name === "chart")?.exports).toContain(
    "ChartProfilerFrame"
  );
  expect(index.map((i) => i.name)).not.toContain("toast");
});

test("all production sections share navigation and omit internal status content", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  for (const path of [
    "",
    "components",
    "components/button",
    "charts",
    "charts/line",
  ]) {
    await page.goto(`${origin}${path}`);
    await expect(
      page.getByRole("navigation", { name: "Main navigation" })
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
    expect(await page.locator("body").textContent()).not.toMatch(internal);
  }

  expect(errors).toEqual([]);
});

test("search shows all items, more than six matches, and nested component imports", async ({
  page,
}) => {
  await page.goto(`${origin}#home`);

  const search = page.getByRole("combobox", {
    exact: true,
    name: "Search components",
  });

  await search.click();
  await expect(
    page.getByRole("listbox", { name: "Search results" }).getByRole("option")
  ).toHaveCount(index.length);
  await search.fill("field");
  expect(
    await page
      .getByRole("listbox", { name: "Search results" })
      .getByRole("option")
      .count()
  ).toBeGreaterThan(6);
  await expect(
    page.getByRole("option", { exact: true, name: "FieldLabel" })
  ).toBeVisible();
  await search.fill("CardHeader");
  await search.press("Enter");
  await expect(page.locator("h1")).toHaveText("Card");
  await expect(page.locator("#component-import")).toContainText(
    "import { CardHeader }"
  );
  await search.fill("你好");
  await expect(
    page.getByRole("listbox", { name: "Search results" }).getByRole("option")
  ).toHaveCount(0);
});

test("component pages expose live preview, source, installation and composition", async ({
  page,
}) => {
  await page.goto(`${origin}components/button`);
  await page
    .getByRole("region", { exact: true, name: "Button" })
    .getByRole("button", { exact: true, name: "Button" })
    .first()
    .click();
  await expect(page.getByLabel("Button activations")).toHaveText(
    "Pressed 1 time"
  );
  await page
    .getByRole("group", { name: "Example view" })
    .getByRole("button", { exact: true, name: "Source" })
    .click();

  const expectedSource = readFileSync(
    webFile("registry/ui/button.tsx"),
    "utf-8"
  ).replaceAll("\r\n", "\n");

  await expect
    .poll(async () => {
      const displayed = await page
        .locator("#component-preview code")
        .textContent();

      return displayed?.replaceAll("\r\n", "\n");
    })
    .toBe(expectedSource);
  await expect(page.locator("#component-installation")).toContainText(
    "/r/button.json"
  );
  await expect(page.locator("#component-composition")).toContainText("Button");
});

for (const width of [320, 390, 768, 1440]) {
  test(`shared site navigation is usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ height: 900, width });
    await page.goto(`${origin}components/input`);
    await expect(
      page.getByRole("complementary", { name: "Components navigation" })
    ).toBeVisible();
    await expect(
      page
        .getByRole("complementary", { name: "Components navigation" })
        .locator("[aria-expanded]")
    ).toHaveCount(0);
    await page
      .getByRole("navigation", { exact: true, name: "Components" })
      .getByRole("link", { exact: true, name: "Form" })
      .click();
    await expect(page.locator("h1")).toHaveText("Form");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { exact: true, name: "Charts" })
      .click();
    await expect(page.locator("h1")).toHaveText("Charts");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  });
}

test("canonical routes reload and legacy links still resolve", async ({
  page,
}) => {
  await page.goto(`${origin}components/button`);
  await expect(page.locator("h1")).toHaveText("Button");
  await page.reload();
  await expect(page.locator("h1")).toHaveText("Button");
  await expect(page).toHaveTitle(/Button.*grasscn/);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { exact: true, name: "Charts" })
    .click();
  await expect(page).toHaveURL(`${origin}charts`);
  await page.goBack();
  await expect(page.locator("h1")).toHaveText("Button");
  await page.goto(`${origin}#button`);
  await expect(page.locator("h1")).toHaveText("Button");
  await page.goto(`${origin}#/charts/line`);
  await expect(page.locator("h1")).toHaveText("Line charts");
});

for (const width of [320, 390]) {
  test(`compact demos keep actions reachable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width });

    for (const name of ["button-group", "table", "pagination"]) {
      await page.goto(`${origin}components/${name}`);
      await expect(page.locator(".demo-stage")).toBeVisible();
      expect(
        await page
          .locator(".demo-stage")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
      ).toBe(true);

      if (name === "button-group") {
        await page.getByRole("button", { exact: true, name: "Load" }).click();
        await expect(page.getByLabel("Button group action")).toHaveText(
          "World loaded"
        );
      } else if (name === "table") {
        await page
          .getByRole("button", { exact: true, name: "Join" })
          .first()
          .click();
        await expect(page.getByLabel("Selected world")).toHaveText(
          "Grasslands"
        );
      } else {
        await page.getByRole("link", { exact: true, name: "2" }).click();
        await expect(page.getByLabel("Pagination current page")).toHaveText(
          "Page 2 / 3"
        );
      }
    }
  });
}

test("shared controls retain native rendering and the sticky header is opaque", async ({
  page,
}) => {
  await page.goto(`${origin}components/button`);
  const views = page.getByRole("group", { name: "Example view" });

  for (const label of ["Preview", "Source"]) {
    await expect(
      views.getByRole("button", { exact: true, name: label })
    ).toHaveAttribute("data-slot", "button");
  }

  await expect(
    page
      .getByRole("navigation", { exact: true, name: "Components" })
      .getByRole("link", { exact: true, name: "Button" })
  ).toHaveAttribute("data-slot", "button");
  expect(
    await page
      .getByRole("banner")
      .evaluate((el) => getComputedStyle(el).backgroundColor)
  ).toBe("rgb(32, 32, 32)");
  await page.goto(`${origin}charts`);
  await expect(
    page.locator('.chart-type-links a[data-slot="button"]')
  ).toHaveCount(11);
  await expect(
    page.getByRole("button", {
      exact: true,
      name: "View API response time code",
    })
  ).toHaveAttribute("data-slot", "button");
});

test("website code uses the shared Shiki highlighter without changing source text", async ({
  page,
}) => {
  await page.goto(`${origin}components/button`);
  await expect(
    page.locator("#component-import .mc-code-token").first()
  ).toBeVisible();
  await expect(page.locator("#component-import code")).toHaveText(
    'import { Button } from "@/components/ui/button"'
  );
  await expect(page.locator("#component-installation code")).toHaveAttribute(
    "data-language",
    "bash"
  );
  await page
    .getByRole("group", { name: "Example view" })
    .getByRole("button", { exact: true, name: "Source" })
    .click();
  await expect(
    page.locator("#component-preview .mc-code-token").first()
  ).toBeVisible();
  const displayed = await page.locator("#component-preview code").textContent();
  expect(displayed?.replaceAll("\r\n", "\n")).toBe(
    readFileSync(webFile("registry/ui/button.tsx"), "utf-8").replaceAll(
      "\r\n",
      "\n"
    )
  );

  const colors = await page
    .locator("#component-preview .mc-code-token")
    .evaluateAll((tokens) => [
      ...new Set(tokens.map((token) => getComputedStyle(token).color)),
    ]);

  expect(colors).toContain("rgb(255, 85, 255)");
  expect(colors).toContain("rgb(85, 255, 85)");
  await page.goto(`${origin}charts/metric`);
  await page
    .getByRole("button", { exact: true, name: "View API response time code" })
    .click();
  await expect(
    page.locator(".chart-example .mc-code-token").first()
  ).toBeVisible();
  await expect(page.locator(".chart-example pre").first()).toHaveAttribute(
    "tabindex",
    "0"
  );
  await page.goto(`${origin}#install`);
  await expect(
    page.locator(".grass-command .mc-code-token").first()
  ).toBeVisible();
});
