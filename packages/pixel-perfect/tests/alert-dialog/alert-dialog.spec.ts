import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const directory = "tests/reference/alert-dialog-backdrop";

const manifest = JSON.parse(
  readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
);

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

  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const directory of [
  "tests/reference/alert-dialog-backdrop",
  "tests/reference/alert-dialog",
]) {
  test.describe(`Original confirmation screen ${directory}`, () => {
    const manifest = JSON.parse(
      readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
    );

    test.describe.configure({ mode: "parallel" });

    for (const c of manifest.cases) {
      test(`AlertDialog native pixels: ${c.name}`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width: 1536, height: 900 });

        const query = new URLSearchParams({
          component: "alert-dialog",
          native: "1",
          scale: String(c.scale),
          blur: String(c.value),
          label: c.label,
          text: c.text,
          labels: JSON.stringify(c.labels),
        });

        if (c.checked) query.set("patterned", "1");

        if (c.disabledIndex != null)
          query.set("disabledIndex", String(c.disabledIndex));
        await page.goto(`/?${query}`);
        await page.addStyleTag({
          content: `html,body{background:${c.background}} #root{opacity:0}`,
        });
        await expect(page.getByRole("alertdialog")).toHaveAttribute(
          "data-mc-confirmation-ready",
          "true"
        );

        const dialog = page.getByRole("alertdialog"),
          expectedUnicode =
            Number(/[^\x00-\x7f]/.test(c.label)) +
            (/[^\x00-\x7f]/.test(c.text) ? c.text.split("\n").length : 0) +
            c.labels.filter((label: string) => /[^\x00-\x7f]/.test(label))
              .length;

        if (expectedUnicode) {
          await expect(dialog.locator("[data-mc-label-ready]")).toHaveCount(
            expectedUnicode
          );

          for (const line of await dialog
            .locator("[data-mc-label-ready]")
            .all())
            await expect(line).toHaveAttribute("data-mc-label-ready", "true");
        }

        await expect(
          page.locator('[data-slot="alert-dialog-overlay"]')
        ).toHaveAttribute("data-mc-confirmation-backdrop-ready", "true");
        await expect(
          page.locator('[data-slot="alert-dialog-overlay"]')
        ).toHaveAttribute("data-mc-confirmation-gpu-ready", "true");
        await page.mouse.move(0, 0);
        const button = dialog.getByRole("button").nth(c.targetIndex ?? 0);

        if (c.state === "hover") await button.hover();

        if (c.state === "focus") await button.focus();
        await page.evaluate(
          async () =>
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  resolve();
                })
              )
            )
        );

        const bytes = readFileSync(
          pixelPerfectFile(`${directory}/captures/${c.name}`)
        );

        expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);

        const actual = await page.screenshot({ animations: "disabled" }),
          { diff, mismatchedPixels } = compare(
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
