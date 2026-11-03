import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type confirmationReference from "../reference/alert-dialog/manifest.json";

type ConfirmationReferenceManifest = Pick<
  typeof confirmationReference,
  "cases"
>;

const directory = "tests/reference/alert-dialog-backdrop";

// SAFETY: these retained native capture producers own this concrete case schema; the existing read/parse phase and verification assertions remain unchanged.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const manifest = JSON.parse(
  readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
) as ConfirmationReferenceManifest;

const compare = function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);

  const left = new Uint32Array(
    expected.data.buffer,
    expected.data.byteOffset,
    expected.data.length / 4
  );

  const right = new Uint32Array(
    actual.data.buffer,
    actual.data.byteOffset,
    actual.data.length / 4
  );

  const diff = new PNG({ height: expected.height, width: expected.width });
  let mismatchedPixels = 0;

  for (let i = 0; i < left.length; i += 1) {
    const different = left[i] !== right[i];
    mismatchedPixels += Number(different);
    const at = i * 4;
    diff.data[at] = different ? 255 : Math.floor(expected.data[at] / 4);
    diff.data[at + 1] = different ? 0 : Math.floor(expected.data[at + 1] / 4);
    diff.data[at + 2] = different ? 255 : Math.floor(expected.data[at + 2] / 4);
    diff.data[at + 3] = 255;
  }

  return { diff, mismatchedPixels };
};

test("AlertDialog comparator catches one changed pixel", () => {
  const expected = PNG.sync.read(
    readFileSync(
      pixelPerfectFile(`${directory}/captures/${manifest.cases[0].name}`)
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));

  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const constituentDirectory of [
  "tests/reference/alert-dialog-backdrop",
  "tests/reference/alert-dialog",
]) {
  test.describe(`Original confirmation screen ${constituentDirectory}`, () => {
    // SAFETY: these retained native capture producers own this concrete case schema; the existing read/parse phase and verification assertions remain unchanged.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const constituentManifest = JSON.parse(
      readFileSync(
        pixelPerfectFile(`${constituentDirectory}/manifest.json`),
        "utf-8"
      )
    ) as ConfirmationReferenceManifest;

    test.describe.configure({ mode: "parallel" });

    for (const c of constituentManifest.cases) {
      test(`AlertDialog native pixels: ${c.name}`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ height: 900, width: 1536 });

        const query = new URLSearchParams({
          component: "alert-dialog",
          native: "1",
          scale: String(c.scale),
          blur: String(c.value),
          label: c.label,
          text: c.text,
          labels: JSON.stringify(c.labels),
        });

        if (c.checked === true) {
          query.set("patterned", "1");
        }

        if (c.disabledIndex !== undefined) {
          query.set("disabledIndex", String(c.disabledIndex));
        }

        await page.goto(`/?${query}`);
        await page.addStyleTag({
          content: `html,body{background:${c.background}} #root{opacity:0}`,
        });
        await expect(page.getByRole("alertdialog")).toHaveAttribute(
          "data-mc-confirmation-ready",
          "true"
        );

        const dialog = page.getByRole("alertdialog");

        const expectedUnicode =
          Number(/\P{ASCII}/u.test(c.label)) +
          (/\P{ASCII}/u.test(c.text) ? c.text.split("\n").length : 0) +
          c.labels.filter((label: string) => /\P{ASCII}/u.test(label)).length;

        if (expectedUnicode) {
          await expect(dialog.locator("[data-mc-label-ready]")).toHaveCount(
            expectedUnicode
          );

          for (const line of await dialog
            .locator("[data-mc-label-ready]")
            .all()) {
            await expect(line).toHaveAttribute("data-mc-label-ready", "true");
          }
        }

        await expect(
          page.locator('[data-slot="alert-dialog-overlay"]')
        ).toHaveAttribute("data-mc-confirmation-backdrop-ready", "true");
        await expect(
          page.locator('[data-slot="alert-dialog-overlay"]')
        ).toHaveAttribute("data-mc-confirmation-gpu-ready", "true");
        await page.mouse.move(0, 0);
        const button = dialog.getByRole("button").nth(c.targetIndex ?? 0);

        if (c.state === "hover") {
          await button.hover();
        }

        if (c.state === "focus") {
          await button.focus();
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

        const bytes = readFileSync(
          pixelPerfectFile(`${constituentDirectory}/captures/${c.name}`)
        );

        expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);

        const actual = await page.screenshot({ animations: "disabled" });

        const { diff, mismatchedPixels } = compare(
          PNG.sync.read(bytes),
          PNG.sync.read(actual)
        );

        writeFileSync(testInfo.outputPath("actual.png"), actual);
        writeFileSync(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
        writeFileSync(
          testInfo.outputPath("metrics.json"),
          JSON.stringify({
            case: c.name,
            mismatchedPixels,
            totalPixels: 1536 * 900,
            tolerance: 0,
          })
        );
        expect(mismatchedPixels).toBe(0);
      });
    }
  });
}
