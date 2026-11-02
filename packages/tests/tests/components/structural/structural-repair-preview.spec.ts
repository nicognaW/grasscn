import { test, expect } from "@grasscn/tests/test";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

for (const scale of [2])
  for (const name of ["collapsible"])
    test(`${name} editorcontrols respectGUIscale${scale}`, async ({ page }) => {
      await page.goto(`${origin}docs/components/${name}`);
      const card = page.locator(".documentation-playground");
      for (const control of await card
        .locator(
          ".demo-options input,.demo-options textarea,.demo-options button"
        )
        .all()) {
        expect(
          await control.evaluate((n) =>
            Number(getComputedStyle(n).getPropertyValue("--mc-scale"))
          )
        ).toBe(scale);
      }
    });

for (const scale of [2]) {
  test(`Retained Data Table and Resizable playground controls preserve behavior at scale${scale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${origin}docs/components/data-table`);

    const table = page.getByRole("region", {
      exact: true,
      name: "Interactive data-table playground",
    });

    const world = table.getByRole("button", { exact: true, name: "World" });
    await expect(table.getByRole("columnheader").first()).toHaveAttribute(
      "aria-sort",
      "none"
    );
    await world.click();
    await expect(table.getByRole("columnheader").first()).toHaveAttribute(
      "aria-sort",
      "ascending"
    );
    await world.click();
    await expect(table.getByRole("columnheader").first()).toHaveAttribute(
      "aria-sort",
      "descending"
    );
    await world.click();
    await expect(table.getByRole("columnheader").first()).toHaveAttribute(
      "aria-sort",
      "none"
    );
    await world.click();
    await table.getByRole("button", { exact: true, name: "Next" }).click();
    await table
      .getByRole("textbox", { name: "Filter worlds" })
      .fill("\u4f60\u597d");

    const cell = table.getByRole("cell", {
      exact: true,
      name: "\u4F60\u597D\uFF0C\u4E16\u754C",
    });

    await expect(cell).toBeVisible();
    await cell.click();
    await expect(table.getByLabel("World selection")).toContainText(
      "1 selected / Page 1 of 1"
    );
    await table
      .getByRole("textbox", { name: "Filter worlds" })
      .fill("not-a-world");
    await expect(table.getByLabel("World selection")).toContainText(
      "Page 0 of 0"
    );
    await page.goto(`${origin}docs/components/resizable`);

    const resizable = page.getByRole("region", {
      exact: true,
      name: "Interactive resizable playground",
    });

    const handle = resizable.getByRole("separator", {
      name: "Resize inventory panels",
    });

    await handle.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(async () => Number(await handle.getAttribute("aria-valuenow")))
      .toBeGreaterThan(50);
    await resizable
      .getByRole("button", { exact: true, name: "Reset panels" })
      .click();
    await expect(handle).toHaveAttribute("aria-valuenow", "50");
    await resizable
      .getByRole("button", { exact: true, name: "Change direction" })
      .click();
    await handle.focus();
    await page.keyboard.press("ArrowDown");
    await expect
      .poll(async () => Number(await handle.getAttribute("aria-valuenow")))
      .toBeGreaterThan(50);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  });
}
