import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { test, expect } from "@grasscn/tests/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const manifest = JSON.parse(
  readFileSync(pixelPerfectFile("tests/reference/manifest.json"), "utf-8")
) as {
  cases: {
    name: string;
    scale: number;
    width: number;
    label: string;
    state: string;
    sha256: string;
  }[];
};

for (const reference of manifest.cases) {
  test(`vanilla pixels: ${reference.name}`, async ({ page }, testInfo) => {
    const expectedBytes = await readFile(
      pixelPerfectFile(path.join("tests/reference/captures", reference.name))
    );

    expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
      reference.sha256
    );
    await page.goto(
      `/?${new URLSearchParams({
        label: reference.label,
        scale: String(reference.scale),
        state: reference.state,
        width: String(reference.width),
      })}`
    );
    const button = page.locator("[data-subject]");
    await expect(button).toBeVisible();
    await page.mouse.move(0, 0);

    if (reference.state === "hover") {
      await button.hover();
    }

    if (reference.state === "focus") {
      await page.keyboard.press("Tab");
      await expect(button).toBeFocused();
    }

    const actualBytes = await button.screenshot({ animations: "disabled" });
    const actual = PNG.sync.read(actualBytes);
    const expected = PNG.sync.read(expectedBytes);
    expect([actual.width, actual.height]).toEqual([
      expected.width,
      expected.height,
    ]);
    const diff = new PNG({ height: expected.height, width: expected.width });
    let mismatchedPixels = 0;

    for (let i = 0; i < expected.data.length; i += 4) {
      const differs = !actual.data
        .subarray(i, i + 4)
        .equals(expected.data.subarray(i, i + 4));

      if (differs) {
        mismatchedPixels += 1;
      }

      diff.data.set(
        differs
          ? [255, 0, 255, 255]
          : [
              expected.data[i] >> 2,
              expected.data[i + 1] >> 2,
              expected.data[i + 2] >> 2,
              255,
            ],
        i
      );
    }

    await writeFile(testInfo.outputPath("actual.png"), actualBytes);
    await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
    await writeFile(
      testInfo.outputPath("metrics.json"),
      JSON.stringify(
        {
          mismatchedPixels,
          reference: reference.name,
          tolerance: 0,
          totalPixels: expected.width * expected.height,
        },
        null,
        2
      )
    );

    if (mismatchedPixels) {
      await testInfo.attach("actual", {
        body: actualBytes,
        contentType: "image/png",
      });
      await testInfo.attach("diff", {
        body: PNG.sync.write(diff),
        contentType: "image/png",
      });
    }

    expect(
      mismatchedPixels,
      "Every RGBA pixel must match the independently captured vanilla button"
    ).toBe(0);
  });
}
