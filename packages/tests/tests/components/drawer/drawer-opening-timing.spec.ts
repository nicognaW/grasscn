import { test, expect } from "@grasscn/tests/test";
import { PNG } from "pngjs";

const preview = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/";

for (const scale of [2] as const) {
  test(`Drawer backdrop covers first frame while panel moves GUI${scale}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ height: 900, width: 1536 });
    await page.goto(`${preview.replace(/\/$/u, "")}/#drawer`);
    await expect
      .poll(async () =>
        page
          .getByRole("button", { exact: true, name: "Open drawer" })
          .evaluate((n) =>
            getComputedStyle(n).getPropertyValue("--mc-scale").trim()
          )
      )
      .toBe(String(scale));
    await page
      .getByRole("button", { exact: true, name: "Open drawer" })
      .scrollIntoViewIfNeeded();
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

    const first = await page.evaluate(
      async () =>
        // oxlint-disable-next-line promise/avoid-new -- Observe the opening DOM mutation before paint; no Promise API preserves this sampling point.
        new Promise<{ ready: string | null; opacity: string }>((resolve) => {
          const observer = new MutationObserver(() => {
            const overlay = document.querySelector<HTMLElement>(
              "[data-slot=drawer-overlay]"
            );

            const content = document.querySelector(
              "[data-slot=drawer-content]"
            );

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

            resolve({
              opacity: getComputedStyle(overlay).opacity,
              ready: overlay.getAttribute("data-mc-backdrop-ready"),
            });
          });

          observer.observe(document.body, { childList: true, subtree: true });
          document
            .querySelector<HTMLButtonElement>("[data-slot=drawer-trigger]")!
            .click();
        })
    );

    // No waiting for backdrop-ready or animation end: inspect the first mounted frame.
    expect(first.opacity).toBe("1");

    const values: number[][] = [];
    const states: unknown[] = [];

    for (const ms of [0, 16, 32, 50, 100, 200, 500]) {
      const state = await page.evaluate((ms) => {
        const overlay = document.querySelector<HTMLElement>(
          "[data-slot=drawer-overlay]"
        )!;

        const content = document.querySelector<HTMLElement>(
          "[data-slot=drawer-content]"
        )!;

        for (const n of [overlay, content]) {
          for (const a of n.getAnimations()) {
            a.pause();
            a.currentTime = ms;
          }
        }

        return {
          ms,
          opacity: getComputedStyle(overlay).opacity,
          panelTransform: getComputedStyle(content).transform,
          ready: overlay.getAttribute("data-mc-backdrop-ready"),
          rect: overlay.getBoundingClientRect().toJSON(),
          transform: getComputedStyle(overlay).transform,
        };
      }, ms);

      states.push(state);
      const bytes = await page.screenshot();
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

  const trigger = page.getByRole("button", {
    exact: true,
    name: "Open drawer",
  });

  await trigger.click();
  const panel = page.locator("[data-slot=drawer-content]");
  await expect(panel).toBeVisible();
  await expect
    .poll(async () =>
      panel.evaluate((n) =>
        n.getAnimations().every((a) => a.playState === "finished")
      )
    )
    .toBe(true);

  const closing = await page.evaluate(
    async () =>
      // oxlint-disable-next-line promise/avoid-new -- Observe the closing attribute mutation before hiding and retain its animation/style snapshot.
      new Promise<{ ending: boolean; display: string }>((resolve) => {
        const panel = document.querySelector<HTMLElement>(
          "[data-slot=drawer-content]"
        )!;

        const observer = new MutationObserver(() => {
          if (!Object.hasOwn(panel.dataset, "endingStyle")) {
            return;
          }

          observer.disconnect();
          const { display } = getComputedStyle(panel);

          for (const animation of panel.getAnimations()) {
            animation.pause();
            animation.currentTime = 100;
          }

          resolve({ display, ending: true });
        });

        observer.observe(panel, { attributes: true });
        document
          .querySelector<HTMLButtonElement>("[data-slot=drawer-close]")!
          .click();
      })
  );

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
