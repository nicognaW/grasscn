import { test, expect } from "@grasscn/tests/test";
import { nativeTextGap } from "@tests/harness/native-text-gap";

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
    await tooltip.locator("..").evaluate(async (wrapper) => {
      await Promise.all(
        wrapper
          .getAnimations()
          .filter(
            (animation) =>
              animation instanceof CSSTransition &&
              animation.transitionProperty === "transform"
          )
          .map(async (animation) => {
            await animation.finished;
          })
      );
    });
    const tooltipScale = Math.max(2, scale);
    expect(
      await tooltip.evaluate((element) =>
        Number(getComputedStyle(element).getPropertyValue("--mc-scale"))
      )
    ).toBe(tooltipScale);

    const gap = await tooltip.evaluate(nativeTextGap, {
      label: "Mobile",
      value: "12",
    });

    expect(gap).toBeGreaterThanOrEqual(4 * tooltipScale);
  });
}
