import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type CapturedData0 from "../reference/card/manifest.json";
import type labelReference from "../reference/label/manifest.json";

type OverlaySource =
  | (typeof CapturedData0)["cases"][number]
  | (typeof labelReference)["cases"][number];

type OverlayCase = Pick<
  OverlaySource,
  "name" | "background" | "height" | "scale" | "width" | "x" | "y" | "sha256"
> & {
  alignment?: string;
  label?: string;
  text?: string;
  wrapWidth?: number;
};

interface OverlayReference {
  cases: OverlayCase[];
}

const compare = function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  let mismatchedPixels = 0;
  const diff = new PNG({ height: expected.height, width: expected.width });

  for (let i = 0; i < expected.data.length; i += 4) {
    const mismatch = !expected.data
      .subarray(i, i + 4)
      .equals(actual.data.subarray(i, i + 4));

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

for (const component of ["sheet", "drawer"]) {
  test(`${component} pixel comparator rejects a changed pixel`, () => {
    // SAFETY: This read consumes the same pinned tests/reference/card/manifest.json producer data described by the type-only import; retain the runtime read and parse phase.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const manifest = JSON.parse(
      readFileSync(
        pixelPerfectFile("tests/reference/card/manifest.json"),
        "utf-8"
      )
    ) as typeof CapturedData0;

    const expected = PNG.sync.read(
      readFileSync(
        pixelPerfectFile(
          `tests/reference/card/captures/${manifest.cases[0].name}`
        )
      )
    );

    const actual = PNG.sync.read(PNG.sync.write(expected));

    // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
    actual.data[0] ^= 1;
    expect(compare(expected, actual).mismatchedPixels).toBe(1);
  });

  for (const directory of ["card", "label"]) {
    const folder = `tests/reference/${directory}`;

    // SAFETY: Only card/label native constituents reach this read; their Java Case and captured manifests own this consumed protocol, with optional fields preserving the existing null checks.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-JSON producer boundary; runtime read and parse stay unchanged.
    const manifest = JSON.parse(
      readFileSync(pixelPerfectFile(`${folder}/manifest.json`), "utf-8")
    ) as OverlayReference;

    test.describe(`${component} native constituents ${directory}`, () => {
      test.describe.configure({ mode: "parallel" });

      for (const c of manifest.cases) {
        test(`${component} native appearance: ${c.name}`, async ({
          page,
        }, info) => {
          await page.setViewportSize({ height: 900, width: 1536 });

          const verifyOverlayConstituent = async (part: string) => {
            const q = new URLSearchParams({
              align: c.alignment ?? "left",
              background: c.background,
              component,
              height: String(c.height),
              native: "1",
              part,
              scale: String(c.scale),
              width: String(c.width),
              x: String(c.x),
              y: String(c.y),
            });

            const caseLabel = c.label;

            if (caseLabel !== null && caseLabel !== undefined) {
              q.set("label", caseLabel);
            }

            const caseText = c.text;

            if (caseText !== null && caseText !== undefined) {
              q.set("text", caseText);
            }

            const caseWrapWidth = c.wrapWidth;

            if (caseWrapWidth !== null && caseWrapWidth !== undefined) {
              q.set("wrapWidth", String(caseWrapWidth));
            }

            await page.goto(`/?${q}`);
            const subject = page.locator("[data-subject]");
            await expect(subject).toBeVisible();
            await expect(subject).toHaveAttribute(
              "data-slot",
              `${component}-${part === "surface" ? "content" : part}`
            );
            await page.addStyleTag({
              content: `#root{visibility:hidden}[data-subject]{visibility:visible}[data-slot="${component}-overlay"]{visibility:hidden!important}[data-slot="${component}-content"]{visibility:hidden}[data-subject]{visibility:visible}`,
            });
            await page.mouse.move(0, 0);

            if (directory === "label") {
              await expect(subject).toHaveAttribute(
                "data-mc-label-layout-ready",
                "true"
              );

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
              pixelPerfectFile(`${folder}/captures/${c.name}`)
            );

            expect(
              createHash("sha256").update(expectedBytes).digest("hex")
            ).toBe(c.sha256);

            const actualBytes = await subject.screenshot({
              animations: "disabled",
            });

            const actual = PNG.sync.read(actualBytes);
            const expected = PNG.sync.read(expectedBytes);
            const { mismatchedPixels, diff } = compare(expected, actual);

            writeFileSync(info.outputPath(`${part}-actual.png`), actualBytes);
            writeFileSync(
              info.outputPath(`${part}-diff.png`),
              PNG.sync.write(diff)
            );
            writeFileSync(
              info.outputPath(`${part}-metrics.json`),
              JSON.stringify({
                case: c.name,
                component,
                mismatchedPixels,
                part,
                tolerance: 0,
                totalPixels: actual.width * actual.height,
              })
            );
            expect(mismatchedPixels).toBe(0);
          };

          for (const part of directory === "label"
            ? ["title", "description"]
            : ["surface"]) {
            // oxlint-disable-next-line eslint/no-await-in-loop -- This ordered constituent probe reuses one Page; finish its current mutation/capture before the next part.
            await verifyOverlayConstituent(part);
          }
        });
      }
    });
  }
}
