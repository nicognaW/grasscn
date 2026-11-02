import { test, expect } from "@grasscn/tests/test";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/";

for (const scale of [2]) {
  for (const name of ["collapsible"]) {
    test(`${name} editorcontrols respectGUIscale${scale}`, async ({ page }) => {
      await page.goto(`${origin}#${name}`);
      const card = page.locator(`#component-${name}`);

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
  }
}

for (const scale of [2]) {
  test(`Sidebar search staysinside native6pixelpopupframe${scale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 1000, width: 1440 });
    await page.goto(`${origin}#data-table`);
    const world = page.getByRole("button", { exact: true, name: "World" });
    await world.click();
    await expect(page.getByRole("columnheader").first()).toHaveAttribute(
      "aria-sort",
      "ascending"
    );
    await page.getByRole("button", { exact: true, name: "Next" }).click();
    await page
      .getByRole("textbox", { name: "Filter worlds" })
      .fill("\u4F60\u597D");

    const cell = page.getByRole("cell", {
      exact: true,
      name: "\u4f60\u597d\uff0c\u4e16\u754c",
    });

    await expect(cell).toBeVisible();
    await cell.click();
    await expect(page.getByLabel("World selection")).toContainText(
      "1 selected / Page 1 of 1"
    );
    await page
      .getByRole("textbox", { name: "Filter worlds" })
      .fill("not-a-world");
    await expect(page.getByLabel("World selection")).toContainText(
      "Page 0 of 0"
    );
    await page.goto(`${origin}#resizable`);

    const handle = page.getByRole("separator", {
      name: "Resize inventory panels",
    });

    await handle.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(async () => Number(await handle.getAttribute("aria-valuenow")))
      .toBeGreaterThan(50);
    await page
      .getByRole("button", { exact: true, name: "Reset panels" })
      .click();
    await expect(handle).toHaveAttribute("aria-valuenow", "50");
    await page
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
