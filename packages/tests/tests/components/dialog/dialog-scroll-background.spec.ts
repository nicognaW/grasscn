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
          const { left, top, right, bottom } = bounds;

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

for (const scale of [1, 2, 3]) {
  for (const edge of ["top", "bottom"] as const) {
    test(`Dialog clips form controls inside the ${edge} frame at scale ${scale}`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 400, width: 800 });

      const query = new URLSearchParams({
        component: "dialog",
        open: "1",
        scale: String(scale),
        scrollForm: "1",
      });

      await page.goto(`/?${query}`);

      const dialog = page.getByRole("dialog");

      const button = dialog.getByRole("button", {
        exact: true,
        name: "Inspect entry 8",
      });

      await expect(dialog).toHaveAttribute("data-mc-dialog-ready", "true");
      await expect(button).toBeVisible();
      await button.evaluate((element, side) => {
        const popup = element.closest<HTMLElement>('[role="dialog"]');
        const frame = popup?.querySelector(".mc-dialog-background .mc-surface");
        const border = frame?.children.item(side === "top" ? 1 : 7);

        if (!popup || !border) {
          throw new Error("Dialog popup and frame border must be present");
        }

        const rectangle = border.getBoundingClientRect();
        const boundary = side === "top" ? rectangle.bottom : rectangle.top;
        const control = element.getBoundingClientRect();
        popup.scrollTop += control.top + control.height / 2 - boundary;
      }, edge);
      await expectBackgroundCoverage(dialog);

      const hits = await button.evaluate((element, side) => {
        const popup = element.closest('[role="dialog"]');
        const frame = popup?.querySelector(".mc-dialog-background .mc-surface");
        const topBorder = frame?.children.item(1);
        const bottomBorder = frame?.children.item(7);

        if (!popup || !topBorder || !bottomBorder) {
          throw new Error("Dialog popup and frame border must be present");
        }

        const border = side === "top" ? topBorder : bottomBorder;
        const rectangle = border.getBoundingClientRect();
        const boundary = side === "top" ? rectangle.bottom : rectangle.top;
        const control = element.getBoundingClientRect();
        const x = control.left + control.width / 2;
        const borderY = rectangle.top + rectangle.height / 2;
        const insideY = boundary + (side === "top" ? 1 : -1);

        return {
          borderHit: element.contains(document.elementFromPoint(x, borderY)),
          borderY,
          buttonBottom: control.bottom,
          buttonTop: control.top,
          insideBottom: bottomBorder.getBoundingClientRect().top,
          insideHit: element.contains(document.elementFromPoint(x, insideY)),
          insideTop: topBorder.getBoundingClientRect().bottom,
        };
      }, edge);

      await button.evaluate((element) => {
        const observer = new IntersectionObserver(([entry]) => {
          element.dataset.intersectionTop = String(entry.intersectionRect.top);
          element.dataset.intersectionBottom = String(
            entry.intersectionRect.bottom
          );
          observer.disconnect();
        });

        observer.observe(element);
      });
      await expect
        .poll(async () => await button.getAttribute("data-intersection-top"))
        .not.toBeNull();

      const intersection = await button.evaluate((element) => ({
        bottom: Number(element.dataset.intersectionBottom),
        top: Number(element.dataset.intersectionTop),
      }));

      expect(hits.buttonTop).toBeLessThan(hits.borderY);
      expect(hits.buttonBottom).toBeGreaterThan(hits.borderY);
      expect(hits.insideHit).toBe(true);
      expect(hits.borderHit, JSON.stringify(hits)).toBe(false);
      expect(intersection.top).toBeGreaterThanOrEqual(hits.insideTop);
      expect(intersection.bottom).toBeLessThanOrEqual(hits.insideBottom);
    });
  }
}
