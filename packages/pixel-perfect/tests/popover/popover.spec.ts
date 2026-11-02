import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const compare = function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  let mismatchedPixels = 0;
  const diff = new PNG({ height: expected.height, width: expected.width });

  for (let at = 0; at < expected.data.length; at += 4) {
    const mismatch = !expected.data
      .subarray(at, at + 4)
      .equals(actual.data.subarray(at, at + 4));

    mismatchedPixels += Number(mismatch);
    diff.data.set(
      mismatch
        ? [255, 0, 255, 255]
        : [
            Math.floor(expected.data[at] / 4),
            Math.floor(expected.data[at + 1] / 4),
            Math.floor(expected.data[at + 2] / 4),
            255,
          ],
      at
    );
  }

  return { diff, mismatchedPixels };
};

test("Popover comparator catches one changed pixel", () => {
  const expected = PNG.sync.read(
    readFileSync(
      pixelPerfectFile("tests/reference/card/captures/card-c0-s1.png")
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));

  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const directory of [
  "tests/reference/card",
  ...(process.env.POPOVER_SURFACE_ONLY ? [] : ["tests/reference/popover"]),
]) {
  test.describe(`Popover original surface ${directory}`, () => {
    test.describe.configure({ mode: "parallel" });

    const manifest = JSON.parse(
      readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
    );

    for (const c of manifest.cases) {
      test(`Popover native pixels: ${c.name}`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 1536, height: 900 });

        const query = new URLSearchParams({
          component: "popover",
          native: "1",
          scale: String(c.scale),
          width: String(c.width),
          height: String(c.height),
          x: String(c.x),
          y: String(c.y),
        });

        if (c.text != null) {
          query.set("text", c.text);
          query.set("label", c.label);
        }

        await page.goto(`/?${query}`);
        await page.addStyleTag({
          content: `html,body{background:${c.background}} #root{opacity:0}`,
        });
        await page.mouse.move(0, 0);
        const subject = page.locator('[data-slot="popover-content"]');
        await expect(subject).toHaveAttribute("data-mc-popover-ready", "true");
        await expect(
          subject.locator('[data-mc-popover-text-ready="false"]')
        ).toHaveCount(0);

        for (const line of await subject
          .locator("[data-mc-popover-unicode-ready]")
          .all()) {
          await expect(line).toHaveAttribute(
            "data-mc-popover-unicode-ready",
            "true"
          );
        }

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
        const bounds = (await subject.boundingBox())!;
        expect(bounds.x).toBe(c.x * c.scale);
        expect(bounds.y).toBe(c.y * c.scale);

        const bytes = readFileSync(
          pixelPerfectFile(`${directory}/captures/${c.name}`)
        );

        expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);

        const actual = await subject.screenshot({ animations: "disabled" });

        const { mismatchedPixels, diff } = compare(
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
            totalPixels: c.width * c.height * c.scale * c.scale,
            tolerance: 0,
          })
        );
        expect(mismatchedPixels).toBe(0);
      });
    }
  });
}
