import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type CapturedData0 from "../reference/calendar-day/manifest.json";

const different = function different(a: PNG, b: PNG) {
  expect([a.width, a.height]).toEqual([b.width, b.height]);
  let count = 0;

  for (let i = 0; i < a.data.length; i += 4) {
    count += Number(
      !a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4))
    );
  }

  return count;
};

for (const component of ["calendar", "date-picker"]) {
  test(`${component} comparator rejects a one-pixel mutation`, () => {
    // SAFETY: This read consumes the same pinned tests/reference/calendar-day/manifest.json producer data described by the type-only import; retain the runtime read and parse phase.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const m = JSON.parse(
      readFileSync(
        pixelPerfectFile("tests/reference/calendar-day/manifest.json"),
        "utf-8"
      )
    ) as typeof CapturedData0;

    const a = PNG.sync.read(
      readFileSync(
        pixelPerfectFile(
          `tests/reference/calendar-day/captures/${m.cases[0].name}`
        )
      )
    );

    const b = PNG.sync.read(PNG.sync.write(a));

    b.data[0] ^= 1;
    expect(different(a, b)).toBe(1);
  });

  for (const [part, dir] of [
    ["cell", "calendar-day"],
    ["surface", "card"],
    ["label", "label"],
    ["arrow", "pagination-arrow"],
    ...(component === "date-picker"
      ? [
          ["trigger-ascii", "."],
          ["trigger-cjk", "button-cjk"],
        ]
      : []),
  ]) {
    const manifest = JSON.parse(
      readFileSync(
        pixelPerfectFile(`tests/reference/${dir}/manifest.json`),
        "utf-8"
      )
    );

    test.describe(`${component} actual native ${part} constituents`, () => {
      test.describe.configure({ mode: "parallel" });

      for (const c of manifest.cases) {
        for (const alias of part === "cell" && c.state === "hover"
          ? [
              "base",
              "selected",
              "today",
              "range-start",
              "range-middle",
              "range-end",
            ]
          : ["base"]) {
          test(`${component} ${part} ${c.name} ${alias}`, async ({
            page,
          }, info) => {
            await page.setViewportSize({ width: 1536, height: 900 });

            const q = new URLSearchParams({
              component,
              native: "1",
              part,
              scale: String(c.scale),
              width: String(c.width),
              height: String(c.height),
              x: String(c.x ?? 16),
              y: String(c.y ?? 16),
              label: c.label ?? "",
              background: c.background ?? manifest.background ?? "#202020",
              align: c.alignment ?? "left",
              checked: String(c.checked ?? false),
              state: alias === "base" ? c.state : "normal",
              selected: String(alias === "selected"),
              today: String(alias === "today"),
              range: alias.startsWith("range-") ? alias.slice(6) : "",
            });

            if (c.text != null) {
              q.set("text", c.text);
            }

            if (c.wrapWidth) {
              q.set("wrapWidth", String(c.wrapWidth));
            }

            await page.goto("/?" + q);
            await expect(page.locator("[data-subject]")).toBeVisible();

            if (part === "label") {
              await expect(page.locator("[data-subject]")).toHaveAttribute(
                "data-mc-label-layout-ready",
                "true"
              );

              for (const canvas of await page
                .locator("[data-subject] [data-mc-label-ready]")
                .all()) {
                await expect(canvas).toHaveAttribute(
                  "data-mc-label-ready",
                  "true"
                );
              }
            }

            if (part === "trigger-cjk") {
              for (const text of await page
                .locator("[data-subject] [data-mc-label-ready]")
                .all()) {
                await expect(text).toHaveAttribute(
                  "data-mc-label-ready",
                  "true"
                );
              }
            }

            await page.mouse.move(0, 0);

            if (
              alias === "base" &&
              (c.state === "hover" || c.state === "disabled-hover")
            ) {
              await page.locator("[data-subject]").hover({ force: true });
            }

            if (alias === "base" && c.state === "focus") {
              await page.locator("[data-subject]").focus();
            }

            await page.evaluate(
              async () =>
                // oxlint-disable-next-line promise/avoid-new -- Preserve this page-realm two-frame barrier and its existing settlement value.
                await new Promise((r) => {
                  requestAnimationFrame(() => {
                    requestAnimationFrame(r);
                  });
                })
            );

            const bytes = readFileSync(
              pixelPerfectFile(`tests/reference/${dir}/captures/${c.name}`)
            );

            expect(createHash("sha256").update(bytes).digest("hex")).toBe(
              c.sha256
            );

            const actual = await page
              .locator("[data-subject]")
              .screenshot({ animations: "disabled" });

            const mismatchedPixels = different(
              PNG.sync.read(bytes),
              PNG.sync.read(actual)
            );

            writeFileSync(
              info.outputPath("metrics.json"),
              JSON.stringify({
                component,
                manifest:
                  dir === "."
                    ? "tests/reference/manifest.json"
                    : `tests/reference/${dir}/manifest.json`,
                part,
                case: c.name,
                alias,
                mismatchedPixels,
                tolerance: 0,
              })
            );
            writeFileSync(info.outputPath("actual.png"), actual);
            expect(mismatchedPixels).toBe(0);
          });
        }
      }
    });
  }
}
