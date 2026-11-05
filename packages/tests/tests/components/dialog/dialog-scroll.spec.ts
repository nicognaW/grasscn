import type { Locator, Page } from "@grasscn/tests/test";
import { test, expect } from "@grasscn/tests/test";

const longText = Array.from(
  { length: 60 },
  () => "A helpful description."
).join("\n");

const openDialog = async (
  page: Page,
  scale: number,
  options: Record<string, string> = {}
) => {
  const query = new URLSearchParams({
    component: "dialog",
    open: "1",
    scale: String(scale),
    ...options,
  });

  await page.goto(`/?${query}`);

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-mc-dialog-ready", "true");

  return dialog;
};

const expectOverflow = async (dialog: Locator) => {
  await expect
    .poll(
      async () =>
        await dialog.evaluate(
          (element) => element.scrollHeight - element.clientHeight
        )
    )
    .toBeGreaterThan(100);
};

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

          const { left, top, right, bottom } = element.getBoundingClientRect();

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
  const target = await dialog.evaluate((element, position) => {
    const next = Math.round(
      (element.scrollHeight - element.clientHeight) * position
    );

    element.scrollTop = next;

    return next;
  }, fraction);

  await expect
    .poll(async () => await dialog.evaluate((element) => element.scrollTop))
    .toBeCloseTo(target, 0);
  await expectBackgroundCoverage(dialog);
};

const scrollThrough = async (dialog: Locator) => {
  await scrollDialog(dialog, 0);
  await scrollDialog(dialog, 0.5);
  await scrollDialog(dialog, 1);
};

// Distance from the popup's outer edges to its first child, in CSS pixels.
const contentInset = async (dialog: Locator) =>
  await dialog.evaluate((element) => {
    element.scrollTop = 0;
    const outer = element.getBoundingClientRect();
    const header = element.querySelector('[data-slot="dialog-header"]');

    if (!header) {
      throw new Error("Dialog header must be present");
    }

    const inner = header.getBoundingClientRect();

    return { left: inner.left - outer.left, top: inner.top - outer.top };
  });

for (const scale of [1, 2, 3]) {
  test(`Dialog background covers scrolling content at scale ${scale}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ height: 400, width: 800 });

    const dialog = await openDialog(page, scale, { text: longText });
    await expectOverflow(dialog);
    await scrollThrough(dialog);
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
    await scrollThrough(dialog);

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

  test(`Dialog content keeps the 18-pixel frame inset at scale ${scale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 400, width: 800 });

    const dialog = await openDialog(page, scale);
    expect(await contentInset(dialog)).toEqual({
      left: 18 * scale,
      top: 18 * scale,
    });

    // Custom padding replaces only the space inside the 6-pixel clipping frame.
    await dialog.evaluate((element) => {
      element.style.padding = "23px 29px 31px 17px";
    });
    await expect
      .poll(async () => await contentInset(dialog))
      .toEqual({ left: 6 * scale + 17, top: 6 * scale + 23 });

    // Dialog items stay centred between the custom inner edges.
    const footer = dialog.locator('[data-slot="dialog-footer"]');
    await expect
      .poll(
        async () =>
          await footer.evaluate((element) => {
            const popup = element.closest<HTMLElement>('[role="dialog"]');

            if (!popup) {
              throw new Error("Dialog popup must be present");
            }

            const outer = popup.getBoundingClientRect();
            const inner = element.getBoundingClientRect();
            const frame = popup.clientLeft;

            return Math.abs(
              inner.left -
                (outer.left + frame + 17) -
                (outer.right - frame - 29 - inner.right)
            );
          })
      )
      .toBeLessThanOrEqual(2 * scale);
  });

  test(`Dialog background follows a transformed popup at scale ${scale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 400, width: 800 });

    const dialog = await openDialog(page, scale, { text: longText });
    await expectOverflow(dialog);
    await dialog.evaluate((element) => {
      element.style.transform = "translateZ(0)";
    });
    await scrollThrough(dialog);

    await page.evaluate(() => {
      document.body.style.filter = "contrast(1)";
    });
    await scrollThrough(dialog);
  });
}

test("Dialog ref is the scrolling element and receives scroll events", async ({
  page,
}) => {
  await page.setViewportSize({ height: 400, width: 800 });

  const dialog = await openDialog(page, 2, { text: longText });
  await expectOverflow(dialog);
  await expect(dialog).toHaveCSS("overflow-y", "auto");

  const top = await dialog.evaluate((element) => {
    element.scrollTop = 120;

    return element.scrollTop;
  });

  expect(top).toBeGreaterThan(0);
  await expect(page.getByLabel("Dialog ref scroll top")).toHaveText(
    String(top)
  );
});

// MinecraftSurface renders its nine-slice pieces in row order; 1 and 7 are the
// top and bottom edges.
const framePiece = { bottom: 7, top: 1 } as const;

for (const scale of [1, 2, 3]) {
  for (const edge of ["top", "bottom"] as const) {
    test(`Dialog clips form controls inside the ${edge} frame at scale ${scale}`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 400, width: 800 });

      const dialog = await openDialog(page, scale, { scrollForm: "1" });

      const button = dialog.getByRole("button", {
        exact: true,
        name: "Inspect entry 8",
      });

      await expect(button).toBeVisible();

      const hits = await button.evaluate(
        (element, { side, pieces }) => {
          const popup = element.closest<HTMLElement>('[role="dialog"]');

          const frame = popup?.querySelector(
            ".mc-dialog-background .mc-surface"
          );

          const topBorder = frame?.children.item(pieces.top);
          const bottomBorder = frame?.children.item(pieces.bottom);

          if (!popup || !topBorder || !bottomBorder) {
            throw new Error("Dialog popup and frame border must be present");
          }

          const border = side === "top" ? topBorder : bottomBorder;

          const boundary = () => {
            const rectangle = border.getBoundingClientRect();

            return side === "top" ? rectangle.bottom : rectangle.top;
          };

          const before = element.getBoundingClientRect();
          popup.scrollTop += before.top + before.height / 2 - boundary();

          const rectangle = border.getBoundingClientRect();
          const control = element.getBoundingClientRect();
          const x = control.left + control.width / 2;
          const borderY = rectangle.top + rectangle.height / 2;
          const insideY = boundary() + (side === "top" ? 1 : -1);

          return {
            borderHit: element.contains(document.elementFromPoint(x, borderY)),
            borderY,
            buttonBottom: control.bottom,
            buttonTop: control.top,
            insideBottom: bottomBorder.getBoundingClientRect().top,
            insideHit: element.contains(document.elementFromPoint(x, insideY)),
            insideTop: topBorder.getBoundingClientRect().bottom,
          };
        },
        { pieces: framePiece, side: edge }
      );

      await expectBackgroundCoverage(dialog);

      await button.evaluate((element) => {
        const observer = new IntersectionObserver(([entry]) => {
          observer.disconnect();
          element.dataset.intersectionTop = String(entry.intersectionRect.top);
          element.dataset.intersectionBottom = String(
            entry.intersectionRect.bottom
          );
        });

        observer.observe(element);
      });
      await expect(button).toHaveAttribute("data-intersection-bottom", /./u);

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
