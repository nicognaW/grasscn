import { test, expect } from "@grasscn/tests/test";

for (const reason of ["disabled", "missing"])
  test(`Tabs automatic ${reason} fallback stays silent`, async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).voices = 0;
      HTMLMediaElement.prototype.play = function () {
        (window as any).voices++;
        return Promise.resolve();
      };
    });
    await page.goto(`/?component=tabs-fallback&reason=${reason}`);
    await expect(
      page.getByRole("tab", { name: "Second", exact: true })
    ).toHaveAttribute("aria-selected", "true");
    await page
      .getByRole("button", { name: "Change tabs", exact: true })
      .click();
    await expect(
      page.getByRole("tab", { name: "First", exact: true })
    ).toHaveAttribute("aria-selected", "true");
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    );
    expect(await page.evaluate(() => (window as any).voices)).toBe(0);
  });
