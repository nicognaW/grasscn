import { readFileSync } from "node:fs";

import { test, expect } from "@grasscn/tests/test";
import { referenceFile } from "@tests/paths";

type TradingScrollEvent =
  | { amount: number; kind: "wheel"; result: number; start: number }
  | { kind: "press"; result: number; start: number }
  | { kind: "drag"; result: number; start: number; y: number };

type TradingScrollProbes = Record<
  "0" | "1" | "7" | "8" | "9" | "14" | "25" | "80",
  TradingScrollEvent[]
>;

const fixture =
  process.env.GRASSCN_EXPANSION_URL ?? "http://127.0.0.1:5174/adventure.html";

// SAFETY: This owned General fixture records the retained producer's wheel/press/drag shapes
// for exactly eight offer counts; wheel has amount, drag has y, and press has neither.
const probes = JSON.parse(
  readFileSync(
    referenceFile(`trading/scrollbar/trading-scroll-events.json`),
    "utf-8"
  )
) as TradingScrollProbes;

for (const [count, events] of Object.entries(probes)) {
  test(`native trading scroll gestures with ${count} offers`, async ({
    page,
  }) => {
    await page.goto(
      `${fixture}?scale=2&case=${encodeURIComponent(JSON.stringify({ cursor: 0, element: "trading", offerCount: Number(count) }))}`
    );

    const input = page.getByRole("spinbutton", { name: "Scroll offset" });
    const rail = page.getByRole("scrollbar", { name: "Trade offers scroll" });
    const root = page.locator('[data-slot="trading"]');
    const bounds = await rail.boundingBox();

    let held = false;

    for (const event of events) {
      if (event.kind !== "drag") {
        if (held) {
          await page.mouse.up();
          held = false;
        }

        await input.fill(String(event.start));
        await expect(rail).toHaveAttribute(
          "aria-valuenow",
          String(event.start)
        );
      }

      if (event.kind === "wheel") {
        await root.dispatchEvent("wheel", {
          deltaY: -event.amount * 100,
          deltaMode: 0,
        });
      }

      if (event.kind === "press") {
        await page.mouse.move(bounds.x + 6, bounds.y + (100 - 18) * 2);
        await page.mouse.down();
        held = true;
      }

      if (event.kind === "drag") {
        await page.mouse.move(bounds.x + 6, bounds.y + (event.y - 18) * 2);
      }

      await expect(
        input,
        `${event.kind}: ${JSON.stringify(event)}`
      ).toHaveValue(String(event.result));
    }

    if (held) {
      await page.mouse.up();
    }
  });
}

test("burst wheel events preserve consecutive native offsets", async ({
  page,
}) => {
  const native = probes["9"];
  expect(
    native.find((e) => e.kind === "wheel" && e.start === 0 && e.amount === -1)
      ?.result
  ).toBe(1);
  expect(
    native.find((e) => e.kind === "wheel" && e.start === 1 && e.amount === -1)
      ?.result
  ).toBe(2);

  for (const uncontrolled of [false, true]) {
    await page.goto(
      `${fixture}?scale=2&case=${encodeURIComponent(JSON.stringify({ cursor: 0, element: "trading", offerCount: 9, uncontrolled }))}`
    );
    await expect(
      page.locator('[data-slot="document-text"]').first()
    ).toHaveAttribute("data-ready", "true");
    await page.locator('[data-slot="trading"]').evaluate((element) => {
      element.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY: 100,
        })
      );
      element.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY: 100,
        })
      );
    });
    await expect(
      page.getByRole("spinbutton", { name: "Scroll offset" })
    ).toHaveValue("2");
    await expect(
      page.getByRole("scrollbar", { name: "Trade offers scroll" })
    ).toHaveAttribute("aria-valuenow", "2");
  }
});

for (const uncontrolled of [false, true]) {
  test(`wheel normalization and boundaries (${uncontrolled ? "uncontrolled" : "controlled"})`, async ({
    page,
  }) => {
    await page.goto(
      `${fixture}?scale=2&case=${encodeURIComponent(JSON.stringify({ cursor: 0, element: "trading", offerCount: 25, uncontrolled }))}`
    );

    const root = page.locator('[data-slot="trading"]');
    const rail = page.getByRole("scrollbar", { name: "Trade offers scroll" });

    for (const [deltaY, deltaMode, result] of [
      [100, 0, 1],
      [1, 1, 2],
      [1, 2, 9],
      [-0.5, 1, 8],
      [1000, 2, 18],
      [-1000, 2, 0],
    ] as const) {
      await root.dispatchEvent("wheel", { deltaMode, deltaY });
      await expect(rail).toHaveAttribute("aria-valuenow", String(result));
    }

    await root.evaluate((element) => {
      for (let i = 0; i < 5; i += 1) {
        element.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY: 100,
            bubbles: true,
            cancelable: true,
          })
        );
      }
    });
    await expect(rail).toHaveAttribute("aria-valuenow", "5");
    await rail.focus();
    await rail.press("End");
    await expect(rail).toHaveAttribute("aria-valuenow", "18");
    await rail.press("Home");
    await expect(rail).toHaveAttribute("aria-valuenow", "0");
  });
}
