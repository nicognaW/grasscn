import type { Locator } from "@grasscn/tests/test";
import { test, expect } from "@grasscn/tests/test";

const expectBackgroundCoverage = async (dialog: Locator) => {
  await expect
    .poll(
      async () =>
        await dialog.evaluate((element) => {
          const background = element.querySelector(".mc-dialog-background");
          const surface = background?.querySelector(".mc-surface");

          if (!background || !surface) {
            throw new Error("Dialog background and surface must be present");
          }

          const bounds = element.getBoundingClientRect();
          const left = bounds.left + element.clientLeft;
          const top = bounds.top + element.clientTop;
          const right = left + element.clientWidth;
          const bottom = top + element.clientHeight;

          return Math.max(
            ...[background, surface].flatMap((node) => {
              const rectangle = node.getBoundingClientRect();

              return [
                Math.abs(rectangle.left - left),
                Math.abs(rectangle.top - top),
                Math.abs(right - rectangle.right),
                Math.abs(bottom - rectangle.bottom),
              ];
            })
          );
        })
    )
    .toBeLessThanOrEqual(1);
};

const scrollDialog = async (dialog: Locator, fraction: number) => {
  await dialog.evaluate((element, position) => {
    element.scrollTop = Math.round(
      (element.scrollHeight - element.clientHeight) * position
    );
  }, fraction);
  await expect
    .poll(
      async () =>
        await dialog.evaluate(
          (element, position) =>
            Math.abs(
              element.scrollTop -
                Math.round(
                  (element.scrollHeight - element.clientHeight) * position
                )
            ),
          fraction
        )
    )
    .toBeLessThanOrEqual(1);
  await expectBackgroundCoverage(dialog);
};

for (const scale of [1, 2, 3]) {
  test(`Dialog background covers scrolling content at scale ${scale}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ height: 400, width: 800 });

    const query = new URLSearchParams({
      component: "dialog",
      open: "1",
      scale: String(scale),
      text: Array.from({ length: 60 }, () => "A helpful description.").join(
        "\n"
      ),
    });

    await page.goto(`/?${query}`);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-mc-dialog-ready", "true");
    await expect
      .poll(
        async () =>
          await dialog.evaluate(
            (element) => element.scrollHeight - element.clientHeight
          )
      )
      .toBeGreaterThan(100);

    await scrollDialog(dialog, 0);
    await scrollDialog(dialog, 0.5);
    await scrollDialog(dialog, 1);

    await scrollDialog(dialog, 0);

    const done = dialog.getByRole("button", { exact: true, name: "Done" });
    await done.focus();
    await expect(done).toBeFocused();
    await expect
      .poll(async () => await dialog.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await expectBackgroundCoverage(dialog);
    await expect(done).toBeInViewport();

    await dialog.evaluate((element) => {
      element.style.padding = "23px 29px 31px 17px";
      element.style.gap = "13px";
    });
    await expect(dialog).toHaveCSS("padding-top", "23px");
    await expect(dialog).toHaveCSS("gap", "13px");
    await scrollDialog(dialog, 0);
    await scrollDialog(dialog, 0.5);
    await scrollDialog(dialog, 1);

    await page.setViewportSize({ height: 300, width: 390 });
    await expectBackgroundCoverage(dialog);
    await scrollDialog(dialog, 1);
    await expect(done).toBeInViewport();

    await page.setViewportSize({ height: 520, width: 1000 });
    await expectBackgroundCoverage(dialog);
    await scrollDialog(dialog, 1);
    await expect(done).toBeInViewport();

    await done.click();
    await expect(dialog).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
