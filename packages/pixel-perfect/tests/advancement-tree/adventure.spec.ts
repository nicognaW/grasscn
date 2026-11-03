import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type BoundaryReference1 from "../reference/advancement-tree/manifest.json";

test.use({
  launchOptions: {
    args: [
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
    ],
  },
});

const reference = path.resolve("tests/reference/advancement-tree");

const manifest =
  // SAFETY: this exact retained JSON input is represented by the adjacent type-only producer import; preserve the original fresh read, parse and runtime checks.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-data boundary; no runtime validation or generic JSON caster.
  JSON.parse(
    readFileSync(
      pixelPerfectFile(path.join(reference, "manifest.json")),
      "utf-8"
    )
  ) as typeof BoundaryReference1;

for (const c of manifest.cases) {
  test(`advancement tree native pixels ${c.name}`, async ({ page }, info) => {
    await page.setViewportSize({ height: 900, width: 1536 });
    await page.goto(
      `${process.env.GRASSCN_TREE_INSTALLED_URL ?? "http://127.0.0.1:5174/adventure.html"}?scale=${c.scale}&mask=${c.value}&x=${c.cursor}&y=${c.anchor}`
    );
    await expect(page.locator("[data-subject] img")).toHaveCount(8);
    await expect
      .poll(async () =>
        page
          .locator("[data-subject] img")
          .evaluateAll((images: HTMLImageElement[]) =>
            images.every((image) => image.complete && image.naturalWidth > 0)
          )
      )
      .toBe(true);

    const actual = await page.locator("[data-subject]").screenshot();

    const expected = readFileSync(
      pixelPerfectFile(path.join(reference, "captures", c.name))
    );

    const a = PNG.sync.read(actual);
    const b = PNG.sync.read(expected);

    expect([a.width, a.height]).toEqual([b.width, b.height]);
    let differences = 0;
    const diff = new PNG({ height: a.height, width: a.width });

    for (let i = 0; i < a.data.length; i += 4) {
      const same = a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4));

      if (!same) {
        differences += 1;
      }

      diff.data.set(same ? [0, 0, 0, 0] : [255, 0, 255, 255], i);
    }

    if (differences) {
      writeFileSync(info.outputPath("actual.png"), actual);
      writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
      console.log(
        "mismatch coordinates",
        Array.from({ length: a.width * a.height }, (_, i) => i)
          .filter(
            (i) =>
              !a.data
                .subarray(i * 4, i * 4 + 4)
                .equals(b.data.subarray(i * 4, i * 4 + 4))
          )
          .slice(0, 10)
          .map((i) => [
            i % a.width,
            Math.floor(i / a.width),
            [...a.data.subarray(i * 4, i * 4 + 4)],
            [...b.data.subarray(i * 4, i * 4 + 4)],
          ])
      );
      await info.attach("actual", { body: actual, contentType: "image/png" });
      await info.attach("diff", {
        body: PNG.sync.write(diff),
        contentType: "image/png",
      });
    }

    writeFileSync(
      info.outputPath("pixels.json"),
      JSON.stringify({ mismatchedPixels: differences, name: c.name })
    );
    expect(differences).toBe(0);
  });
}
