import { readFileSync } from "node:fs";

import { test, expect } from "@grasscn/tests/test";
import { documentationInventory } from "@tests/checks/documentation-inventory.mjs";
import { registryFile } from "@tests/paths";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

const index = documentationInventory().pages;

const internal = /work in progress|\bWIP\b|LOCAL PREVIEW|still being verified/i;

test("search index covers every published item and its named exports", async ({
  request,
}) => {
  for (const name of documentationInventory().items) {
    expect(index.some((page) => page.name === name)).toBe(true);
  }

  await Promise.all(
    [
      ["CardHeader", "card"],
      ["FieldLabel", "field"],
      ["ChartProfilerFrame", "chart"],
    ].map(async ([query, name]) => {
      const response = await request.get(`${origin}api/search?query=${query}`);
      expect(response.ok()).toBe(true);
      expect(JSON.stringify(await response.json())).toContain(
        `/docs/components/${name}`
      );
    })
  );
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
    expect(await page.locator("body").textContent()).not.toMatch(internal);
  }

  expect(errors).toEqual([]);
});

test("search shows distinct component pages and resolves nested component exports", async ({
  page,
}) => {
  await page.goto(origin);
  const search = page.getByRole("combobox", {
    exact: true,
    name: "Search documentation",
  });

  await search.click();
  await search.fill("field");
  await expect(page.getByRole("option").first()).toHaveAccessibleName("Field");
  await expect(
    page.getByRole("option", { exact: true, name: "Field" })
  ).toBeVisible();
  await search.fill("CardHeader");
  await page.getByRole("option", { exact: true, name: "Card" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Card"
  );
  await expect(page).toHaveURL(`${origin}docs/components/card`);
  await search.fill("你好");
  await expect(page.getByRole("option")).toHaveCount(0);
});

test("component pages expose live preview, source, installation and composition", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/button`);

  const example = page.getByRole("region", {
    exact: true,
    name: "Button example",
  });

  await example.getByRole("button", { exact: true, name: "Button" }).click();
  await example.getByRole("tab", { exact: true, name: "Code" }).click();
  await expect(example.locator("pre")).toContainText("const ButtonExample =");
  await expect(example.locator("pre")).toContainText(
    "export default ButtonExample"
  );
  await expect(example.locator("pre")).not.toContainText("function Button({");

  const implementation = page.getByRole("region", {
    exact: true,
    name: "Button implementation source",
  });

  await expect(implementation).toContainText("Component implementation");
  await expect(implementation).toContainText("components/ui/button.tsx");
  await expect(
    page.getByRole("heading", { exact: true, name: "Installation" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { exact: true, name: "Composition" })
  ).toBeVisible();
  const playground = page.locator(".documentation-playground");
  await playground
    .getByRole("button", { exact: true, name: "Button" })
    .first()
    .click();
  await expect(playground.getByLabel("Button activations")).toHaveText(
    "Pressed 1 time"
  );
});

for (const width of [320, 390, 768, 1440]) {
  test(`shared site navigation is usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}docs/components/input`);

    const browse = page.getByRole("button", {
      exact: true,
      name: "Browse documentation",
    });

    if (await browse.isVisible()) {
      await browse.click();
    }

    await page
      .getByRole("navigation", { exact: true, name: "Documentation" })
      .getByRole("link", { exact: true, name: "Form" })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      "Form"
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { exact: true, name: "Charts" })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      "Charts"
    );
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
  await page.goto(`${origin}docs/components/button`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Button"
  );
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Button"
  );
  await expect(page).toHaveTitle(/Button.*grasscn/);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { exact: true, name: "Charts" })
    .click();
  await expect(page).toHaveURL(`${origin}charts`);
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Button"
  );
  await page.goto(`${origin}components/button?ref=bookmark#component-import`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Button"
  );
  await page.goto(`${origin}charts/line`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Line charts"
  );
});

for (const width of [320, 390]) {
  test(`compact demos keep actions reachable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width });

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
          .getByRole("button", { exact: true, name: "Load" })
          .click();
        await expect(
          page
            .locator(".documentation-playground")
            .getByLabel("Button group action")
        ).toHaveText("World loaded");
      } else if (name === "table") {
        await page
          .locator(".documentation-playground")
          .getByRole("button", { exact: true, name: "Join" })
          .first()
          .click();
        await expect(
          page.locator(".documentation-playground").getByLabel("Selected world")
        ).toHaveText("Grasslands");
      } else {
        await page
          .locator(".documentation-playground")
          .getByRole("link", { exact: true, name: "2" })
          .click();
        await expect(
          page
            .locator(".documentation-playground")
            .getByLabel("Pagination current page")
        ).toHaveText("Page 2 / 3");
      }
    }
  });
}

test("shared controls retain native rendering and the sticky header is opaque", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/button`);

  const views = page.getByRole("region", {
    exact: true,
    name: "Button example",
  });

  for (const label of ["Preview", "Code"]) {
    await expect(
      views.getByRole("tab", { name: label, exact: true })
    ).toHaveAttribute("data-slot", "tabs-trigger");
  }

  const componentLink = page
    .getByRole("navigation", { exact: true, name: "Documentation" })
    .getByRole("link", { exact: true, name: "Button" });

  await expect(componentLink).toHaveAttribute("aria-current", "page");
  await expect(componentLink).not.toHaveClass(/\bmc-button\b/u);
  await expect(componentLink.locator(".mc-bitmap")).toBeVisible();
  expect(
    await page
      .getByRole("banner")
      .evaluate((el) => getComputedStyle(el).backgroundColor)
  ).toBe("rgb(32, 32, 32)");
  await page.goto(`${origin}charts`);
  await expect(
    page.getByRole("navigation", { name: "Chart types" }).getByRole("link")
  ).toHaveCount(12);
  await expect(
    page
      .getByRole("region", { exact: true, name: "API response time" })
      .getByRole("tab", { exact: true, name: "Code" })
  ).toHaveAttribute("data-slot", "tabs-trigger");
});

test("website code uses the shared Shiki highlighter without changing source text", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/button`);

  const implementation = page.getByRole("region", {
    exact: true,
    name: "Button implementation source",
  });

  await implementation
    .getByRole("button", { exact: true, name: "Expand" })
    .click();
  await expect(implementation.locator(".mc-code-token").first()).toBeVisible();
  const displayedCode = await implementation.locator("code").textContent();
  expect(displayedCode?.replaceAll("\r\n", "\n")).toBe(
    readFileSync(registryFile("ui/button.tsx"), "utf-8").replaceAll(
      "\r\n",
      "\n"
    )
  );

  const colors = await implementation
    .locator(".mc-code-token")
    .evaluateAll((tokens) => [
      ...new Set(tokens.map((token) => getComputedStyle(token).color)),
    ]);

  expect(colors).toContain("rgb(255, 85, 255)");
  expect(colors).toContain("rgb(85, 255, 85)");
});
