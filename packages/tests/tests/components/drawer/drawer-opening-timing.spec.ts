import { test, expect } from "@grasscn/tests/test";
import { PNG } from "pngjs";

const preview = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/";

for (const scale of [2] as const) {
  test(`Drawer backdrop covers first frame while panel moves GUI${scale}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ height: 900, width: 1536 });
    await page.goto(`${preview.replace(/\/$/u, "")}/#drawer`);

    const trigger = page
      .getByRole("region", {
        exact: true,
        name: "Interactive drawer playground",
      })
      .getByRole("button", { exact: true, name: "Open drawer" });

    await expect
      .poll(
        async () =>
          await trigger.evaluate((n) =>
            getComputedStyle(n).getPropertyValue("--mc-scale").trim()
          )
      )
      .toBe(String(scale));
    await trigger.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const s = document.createElement("div");
      s.id = "backdrop-sentinel";
      Object.assign(s.style, {
        background: "#808080",
        height: "24px",
        left: "20px",
        position: "fixed",
        top: "20px",
        width: "24px",
        zIndex: "40",
      });
      document.body.append(s);
    });

    const first = await trigger.evaluate(async (button: HTMLButtonElement) => {
      const mutationCompletion = Promise.withResolvers<{
        ready: string | null;
        opacity: string;
      }>();

      try {
        const observer = new MutationObserver(() => {
          const overlay = document.querySelector<HTMLElement>(
            "[data-slot=drawer-overlay]"
          );

          const content = document.querySelector("[data-slot=drawer-content]");

          if (!overlay || !content) {
            return;
          }

          observer.disconnect();

          for (const n of [overlay, content]) {
            for (const a of n.getAnimations()) {
              a.pause();
              a.currentTime = 0;
            }
          }

          mutationCompletion.resolve({
            opacity: getComputedStyle(overlay).opacity,
            ready: overlay.getAttribute("data-mc-backdrop-ready"),
          });
        });

        observer.observe(document.body, { childList: true, subtree: true });
        button.click();
      } catch (error) {
        mutationCompletion.reject(error);
      }

      return await mutationCompletion.promise;
    });

    // No waiting for backdrop-ready or animation end: inspect the first mounted frame.
    expect(first.opacity).toBe("1");

    const values: number[][] = [];
    const states: unknown[] = [];

    for (const ms of [0, 16, 32, 50, 100, 200, 500]) {
      // oxlint-disable-next-line no-await-in-loop -- Sets one shared drawer animation frame, reads its geometry, and attaches that exact screenshot before advancing the frame.
      const state = await page.evaluate((frame) => {
        const overlay = document.querySelector<HTMLElement>(
          "[data-slot=drawer-overlay]"
        )!;

        const content = document.querySelector<HTMLElement>(
          "[data-slot=drawer-content]"
        )!;

        for (const n of [overlay, content]) {
          for (const a of n.getAnimations()) {
            a.pause();
            a.currentTime = frame;
          }
        }

        const rect = overlay.getBoundingClientRect();

        return {
          ms: frame,
          opacity: getComputedStyle(overlay).opacity,
          panelTransform: getComputedStyle(content).transform,
          ready: overlay.dataset.mcBackdropReady ?? null,
          rect: {
            bottom: rect.bottom,
            height: rect.height,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            width: rect.width,
            x: rect.x,
            y: rect.y,
          },
          transform: getComputedStyle(overlay).transform,
        };
      }, ms);

      states.push(state);
      // oxlint-disable-next-line no-await-in-loop -- Sets one shared drawer animation frame, reads its geometry, and attaches that exact screenshot before advancing the frame.
      const bytes = await page.screenshot();
      // oxlint-disable-next-line no-await-in-loop -- Sets one shared drawer animation frame, reads its geometry, and attaches that exact screenshot before advancing the frame.
      await info.attach(`frame-${ms}.png`, {
        body: bytes,
        contentType: "image/png",
      });

      const png = PNG.sync.read(bytes);
      const offset = (25 * png.width + 25) * 4;

      values.push([...png.data.subarray(offset, offset + 4)]);
      expect(state.opacity).toBe("1");
      expect(state.transform).toBe("none");
      expect([
        state.rect.x,
        state.rect.y,
        state.rect.width,
        state.rect.height,
      ]).toEqual([0, 0, 1536, 900]);
    }

    await info.attach("timing.json", {
      body: JSON.stringify({ first, states, values }),
      contentType: "application/json",
    });
    expect(values[0][0]).toBeLessThan(80);

    for (const value of values) {
      expect(value).toEqual(values.at(-1));
    }

    expect((states[0] as any).panelTransform).not.toBe(
      (states.at(-1) as any).panelTransform
    );
  });
}

test("Drawer stays visible during its closing transition, then restores focus", async ({
  page,
}) => {
  await page.goto(`${preview.replace(/\/$/u, "")}/components/drawer`);

  const trigger = page
    .getByRole("region", { exact: true, name: "Interactive drawer playground" })
    .getByRole("button", { exact: true, name: "Open drawer" });

  await trigger.click();
  const panel = page.locator("[data-slot=drawer-content]");
  await expect(panel).toBeVisible();
  await expect
    .poll(
      async () =>
        await panel.evaluate((n) =>
          n.getAnimations().every((a) => a.playState === "finished")
        )
    )
    .toBe(true);

  const closing = await page.evaluate(async () => {
    const mutationCompletion2 = Promise.withResolvers<{
      ending: boolean;
      display: string;
    }>();

    try {
      const drawerPanel = document.querySelector<HTMLElement>(
        "[data-slot=drawer-content]"
      )!;

      const observer = new MutationObserver(() => {
        if (!Object.hasOwn(drawerPanel.dataset, "endingStyle")) {
          return;
        }

        observer.disconnect();
        const { display } = getComputedStyle(drawerPanel);

        for (const animation of drawerPanel.getAnimations()) {
          animation.pause();
          animation.currentTime = 100;
        }

        mutationCompletion2.resolve({ display, ending: true });
      });

      observer.observe(drawerPanel, { attributes: true });
      document
        .querySelector<HTMLButtonElement>("[data-slot=drawer-close]")!
        .click();
    } catch (error) {
      mutationCompletion2.reject(error);
    }

    return await mutationCompletion2.promise;
  });

  expect(closing.ending).toBe(true);
  expect(closing.display).not.toBe("none");
  await panel.evaluate((n) => {
    for (const animation of n.getAnimations()) {
      animation.finish();
    }
  });
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
