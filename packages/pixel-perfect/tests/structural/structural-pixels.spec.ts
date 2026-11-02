import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import type { CapturedReferenceCase } from "@ppt/installed/reference-case";
import { PNG } from "pngjs";

interface StructuralReferenceCase extends CapturedReferenceCase {
  alignment?: string;
  background?: string;
  label?: string;
  wrapWidth?: number;
  x?: number;
  y?: number;
}

interface StructuralReferenceManifest {
  background: string;
  cases: StructuralReferenceCase[];
}

const compare = function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  let mismatchedPixels = 0;
  const diff = new PNG({ height: expected.height, width: expected.width });

  for (let i = 0; i < actual.data.length; i += 4) {
    const different = !actual.data
      .subarray(i, i + 4)
      .equals(expected.data.subarray(i, i + 4));

    mismatchedPixels += Number(different);
    diff.data.set(
      different
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

test("Structural pixel comparator detects one changed pixel", () => {
  const expected = PNG.sync.read(
    readFileSync(
      pixelPerfectFile("tests/reference/captures/normal-w200-s1.png")
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));

  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

test.describe("Structural native constituents", () => {
  test.describe.configure({ mode: "parallel" });

  for (const component of ["button-group", "pagination"]) {
    for (const directory of [
      "tests/reference",
      "tests/reference/button-cjk",
      ...(component === "button-group"
        ? ["tests/reference/label", "tests/reference/separator"]
        : []),
    ]) {
      // SAFETY: The four literal reference routes own this retained capture core and real optional label/layout fields; parsed metadata stays intact.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Consume only the declared structural manifests without changing the fresh read or existing fallbacks.
      const manifest = JSON.parse(
        readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
      ) as StructuralReferenceManifest;

      const part = directory.endsWith("/label")
        ? "text"
        : directory.endsWith("/separator")
          ? "separator"
          : "button";

      for (const c of manifest.cases) {
        for (const orientation of component === "button-group" &&
        part === "button"
          ? ["horizontal", "vertical"]
          : ["horizontal"]) {
          for (const active of component === "pagination" &&
          ["hover", "focus"].includes(c.state)
            ? [false, true]
            : [false]) {
            test(`${component} native ${part}: ${c.name} orientation:${orientation} active:${active}`, async ({
              page,
            }, info) => {
              await page.setViewportSize({ width: 1536, height: 900 });

              const params = new URLSearchParams({
                component,
                native: "1",
                part,
                orientation,
                label: c.label ?? "",
                scale: String(c.scale),
                width: String(c.width),
                height: String(c.height ?? 20),
                state: c.state,
                edge: c.state,
                x: String(c.x ?? 16),
                y: String(c.y ?? 16),
                background: c.background ?? manifest.background ?? "#202020",
                alignment: c.alignment ?? "left",
              });

              if (c.wrapWidth != null) {
                params.set("wrapWidth", String(c.wrapWidth));
              }

              if (active) {
                params.set("active", "1");
              }

              await page.goto(`/?${params}`);
              const subject = page.locator("[data-subject]");
              await expect(subject).toBeVisible();
              await expect(subject).toHaveAttribute(
                "data-slot",
                component === "pagination"
                  ? "pagination-link"
                  : part === "button"
                    ? "button"
                    : `button-group-${part}`
              );
              await page.addStyleTag({
                content:
                  "#root{visibility:hidden}[data-subject]{visibility:visible}",
              });
              await page.mouse.move(0, 0);

              if (!active && part === "button") {
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

              if (part === "text") {
                await expect(subject).toHaveAttribute(
                  "data-mc-label-layout-ready",
                  "true"
                );
              }

              for (const label of await subject
                .locator("[data-mc-label-ready]")
                .all()) {
                await expect(label).toHaveAttribute(
                  "data-mc-label-ready",
                  "true"
                );
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

                return await frameCompletion.promise;
              });

              const expectedBytes = readFileSync(
                pixelPerfectFile(`${directory}/captures/${c.name}`)
              );

              expect(
                createHash("sha256").update(expectedBytes).digest("hex")
              ).toBe(c.sha256);

              const actualBytes = await subject.screenshot();
              const actual = PNG.sync.read(actualBytes);
              const expected = PNG.sync.read(expectedBytes);
              const { mismatchedPixels, diff } = compare(expected, actual);

              writeFileSync(info.outputPath("actual.png"), actualBytes);
              writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
              writeFileSync(
                info.outputPath("metrics.json"),
                JSON.stringify({
                  component,
                  case: c.name,
                  orientation,
                  active,
                  mismatchedPixels,
                  tolerance: 0,
                })
              );
              expect(mismatchedPixels).toBe(0);
            });
          }
        }
      }
    }
  }
});
