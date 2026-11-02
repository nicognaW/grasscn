import { test, expect } from "@grasscn/tests/test";

for (const reason of ["disabled", "missing"]) {
  test(`Tabs automatic ${reason} fallback stays silent`, async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).voices = 0;
      HTMLMediaElement.prototype.play = function play() {
        (window as any).voices += 1;

        return Promise.resolve();
      };
    });
    await page.goto(`/?component=tabs-fallback&reason=${reason}`);
    await expect(
      page.getByRole("tab", { exact: true, name: "Second" })
    ).toHaveAttribute("aria-selected", "true");
    await page
      .getByRole("button", { exact: true, name: "Change tabs" })
      .click();
    await expect(
      page.getByRole("tab", { exact: true, name: "First" })
    ).toHaveAttribute("aria-selected", "true");
    await page.evaluate(
      async () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        })
    );
    expect(await page.evaluate(() => (window as any).voices)).toBe(0);
  });
}
