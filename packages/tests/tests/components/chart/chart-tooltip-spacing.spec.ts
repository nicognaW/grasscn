import { test, expect } from "@grasscn/tests/test";

for (const scale of [1, 2, 3]) {
  test(`default chart tooltip separates native labels and values at host GUI ${scale}`, async ({
    page,
  }) => {
    const params = new URLSearchParams({
      active: "1",
      case: JSON.stringify({ scale }),
      component: "chart",
    });

    await page.goto(`/?${params}`);
    const tooltip = page.locator(".mc-chart-tooltip");
    await expect(tooltip).toBeVisible();
    const tooltipScale = Math.max(2, scale);
    expect(
      await tooltip.evaluate((element) =>
        Number(getComputedStyle(element).getPropertyValue("--mc-scale"))
      )
    ).toBe(tooltipScale);

    const gap = await tooltip.evaluate((element) => {
      const labels = [...element.querySelectorAll(".mc-bitmap")];

      const name = labels
        .find((label) => label.textContent === "Mobile")
        ?.querySelector(".mc-text-pixels");

      const value = labels
        .find((label) => label.textContent === "12")
        ?.querySelector(".mc-text-pixels");

      if (!name || !value) {
        throw new Error("The default native tooltip row must be painted");
      }

      return (
        value.getBoundingClientRect().x - name.getBoundingClientRect().right
      );
    });

    expect(gap).toBeGreaterThanOrEqual(4 * tooltipScale);
  });
}
