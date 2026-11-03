import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import type { CapturedReferenceCase } from "@ppt/installed/reference-case";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

/** Consumed fields shared by the retained ASCII/CJK Buttons and Label routes. */
interface CollapsibleComparisonCase extends CapturedReferenceCase {
  label: string;
  x?: number;
  y?: number;
  background?: string;
  alignment?: string;
  wrapWidth?: number;
}

interface CollapsibleComparisonManifest {
  cases: CollapsibleComparisonCase[];
}

const compareRgba = function compareRgba(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  let mismatchedPixels = 0;
  const diff = new PNG({ height: expected.height, width: expected.width });

  for (let i = 0; i < expected.data.length; i += 4) {
    const mismatch = !actual.data
      .subarray(i, i + 4)
      .equals(expected.data.subarray(i, i + 4));

    mismatchedPixels += Number(mismatch);
    diff.data.set(
      mismatch
        ? [255, 0, 255, 255]
        : [
            Math.floor(expected.data[i] / 4),
            Math.floor(expected.data[i + 1] / 4),
            Math.floor(expected.data[i + 2] / 4),
            255,
          ],
      i
    );
  }

  return { diff, mismatchedPixels };
};

test("Collapsible comparator detects one changed pixel", () => {
  const expected = PNG.sync.read(
    readFileSync(
      pixelPerfectFile("tests/reference/captures/normal-w200-s1.png")
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));

  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  actual.data[0] ^= 1;
  expect(compareRgba(expected, actual).mismatchedPixels).toBe(1);
});

for (const directory of [
  "tests/reference",
  "tests/reference/button-cjk",
  "tests/reference/label",
]) {
  // SAFETY: The closed retained ASCII Button, CJK Button and Label routes all supply required label/core fields; coordinates, alignment, background and wrapWidth are real variant optionals.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained producer boundary; preserve the existing fresh runtime read/parse phase.
  const manifest = JSON.parse(
    readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
  ) as CollapsibleComparisonManifest;

  const body = directory.endsWith("/label");

  test.describe(`Collapsible native matrix ${directory}`, () => {
    test.describe.configure({ mode: "parallel" });

    for (const c of manifest.cases) {
      for (const expanded of body ? [true] : [false, true]) {
        test(`Collapsible pixels: ${c.name} expanded:${expanded}`, async ({
          page,
        }, info) => {
          await page.setViewportSize({ width: 1536, height: 900 });

          const params = new URLSearchParams({
            component: "collapsible",
            native: "1",
            part: body ? "body" : "header",
            label: c.label ?? "Button",
            text: body ? c.label : "",
            width: String(c.width),
            height: String(c.height ?? 20),
            scale: String(c.scale),
            state: c.state,
            x: String(c.x ?? 16),
            y: String(c.y ?? 16),
            align: c.alignment ?? "left",
          });

          if (c.wrapWidth !== undefined) {
            params.set("wrapWidth", String(c.wrapWidth));
          }

          if (expanded) {
            params.set("expanded", "1");
          }

          await page.goto(`/?${params}`);
          const subject = page.locator("[data-subject]");
          await expect(page.locator('[data-slot="collapsible"]')).toHaveCount(
            1
          );
          await expect(subject).toBeVisible();
          await page.addStyleTag({
            content: `html,body{background:${c.background ?? "#202020"}}#root{visibility:hidden}[data-subject]{visibility:visible}`,
          });
          await page.mouse.move(0, 0);

          if (body) {
            await expect(
              subject.locator("[data-mc-label-layout-ready]")
            ).toHaveAttribute("data-mc-label-layout-ready", "true");
          } else {
            if (c.state === "hover") {
              await subject.hover();
            }

            if (c.state === "focus") {
              await subject.focus();
              await page.keyboard.press("Tab");
              await page.keyboard.press("Shift+Tab");
              await expect(subject).toBeFocused();
            }
          }

          for (const label of await subject
            .locator("[data-mc-label-ready]")
            .all()) {
            await expect(label).toHaveAttribute("data-mc-label-ready", "true");
          }

          await page.evaluate(async () => {
            const frameCompletion = Promise.withResolvers<void>();

            try {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  frameCompletion.resolve();
                });
              });
            } catch (error) {
              frameCompletion.reject(error);
            }

            await frameCompletion.promise;
          });
          const bounds = (await subject.boundingBox())!;
          expect([bounds.x, bounds.y]).toEqual([
            (c.x ?? 16) * c.scale,
            (c.y ?? 16) * c.scale,
          ]);

          const expectedBytes = readFileSync(
            pixelPerfectFile(`${directory}/captures/${c.name}`)
          );

          expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
            c.sha256
          );

          const actualBytes = await subject.screenshot();
          const actual = PNG.sync.read(actualBytes);
          const expected = PNG.sync.read(expectedBytes);

          const { mismatchedPixels, diff } = compareRgba(expected, actual);
          writeFileSync(info.outputPath("actual.png"), actualBytes);
          writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
          writeFileSync(
            info.outputPath("metrics.json"),
            JSON.stringify({
              case: c.name,
              expanded,
              mismatchedPixels,
              tolerance: 0,
            })
          );
          expect(mismatchedPixels).toBe(0);
        });
      }
    }
  });
}
