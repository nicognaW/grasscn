import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import type { CapturedReferenceCase } from "@ppt/installed/reference-case";
import { pixelPerfectFile } from "@ppt/paths";
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

      let partSelection: "text" | "separator" | "button";

      if (directory.endsWith("/label")) {
        partSelection = "text";
      } else if (directory.endsWith("/separator")) {
        partSelection = "separator";
      } else {
        partSelection = "button";
      }

      const part = partSelection;

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
              await page.setViewportSize({ height: 900, width: 1536 });

              const params = new URLSearchParams({
                alignment: c.alignment ?? "left",
                background: c.background ?? manifest.background ?? "#202020",
                component,
                edge: c.state,
                height: String(c.height ?? 20),
                label: c.label ?? "",
                native: "1",
                orientation,
                part,
                scale: String(c.scale),
                state: c.state,
                width: String(c.width),
                x: String(c.x ?? 16),
                y: String(c.y ?? 16),
              });

              if (c.wrapWidth !== undefined) {
                params.set("wrapWidth", String(c.wrapWidth));
              }

              if (active) {
                params.set("active", "1");
              }

              await page.goto(`/?${params}`);
              const subject = page.locator("[data-subject]");
              await expect(subject).toBeVisible();
              let slotSelection: string;

              if (component === "pagination") {
                slotSelection = "pagination-link";
              } else if (part === "button") {
                slotSelection = "button";
              } else {
                slotSelection = `button-group-${part}`;
              }

              await expect(subject).toHaveAttribute("data-slot", slotSelection);
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

              {
                const readyElements = await subject
                  .locator("[data-mc-label-ready]")
                  .all();

                const readinessResults = await Promise.allSettled(
                  readyElements.map(async (label) => {
                    await expect(label).toHaveAttribute(
                      "data-mc-label-ready",
                      "true"
                    );
                  })
                );

                const rejectedReadiness = readinessResults.find(
                  (result) => result.status === "rejected"
                );

                if (rejectedReadiness) {
                  throw rejectedReadiness.reason;
                }
              }

              await page.evaluate(async () => {
                const frameCompletion: PromiseWithResolvers<void> =
                  Promise.withResolvers();

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
                  active,
                  case: c.name,
                  component,
                  mismatchedPixels,
                  orientation,
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
