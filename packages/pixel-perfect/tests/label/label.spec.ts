import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { labelUnihexAtlas } from "@grasscn/web/ui/minecraft-label-atlas";
import { pixelPerfectRoot, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const manifest = JSON.parse(
  readFileSync(pixelPerfectFile("tests/reference/label/manifest.json"), "utf8")
) as {
  cases: {
    name: string;
    width: number;
    height: number;
    scale: number;
    background: string;
    label: string;
    wrapWidth?: number;
    alignment?: string;
    x: number;
    y: number;
    state: string;
    sha256: string;
  }[];
};

function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ width: expected.width, height: expected.height });
  let mismatchedPixels = 0;
  for (let i = 0; i < expected.data.length; i += 4) {
    const mismatch = !actual.data
      .subarray(i, i + 4)
      .equals(expected.data.subarray(i, i + 4));
    mismatchedPixels += Number(mismatch);
    diff.data.set(
      mismatch
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
  return { diff, mismatchedPixels };
}

test("Label comparator catches a one-pixel change", async () => {
  const expected = PNG.sync.read(
    await readFile(
      pixelPerfectFile(
        `tests/reference/label/captures/${manifest.cases[0].name}`
      )
    )
  );
  const actual = PNG.sync.read(PNG.sync.write(expected));
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

test("Label uses the UVs observed in its native font-atlas context", () => {
  const observed = JSON.parse(
    readFileSync(
      pixelPerfectFile("tests/reference/label/glyph-atlas.json"),
      "utf8"
    )
  );
  expect(Object.keys(labelUnihexAtlas).sort()).toEqual(
    Object.keys(observed).sort()
  );
  for (const [code, uv] of Object.entries(labelUnihexAtlas)) {
    expect(uv).toEqual(
      Object.fromEntries(
        ["u0", "u1", "v0", "v1"].map((key) => [key, observed[code][key]])
      )
    );
  }
});

for (const c of manifest.cases)
  test(`Label native pixels: ${c.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1536, height: 900 });
    const query = new URLSearchParams({
      component: "label",
      width: String(c.width),
      height: String(c.height),
      scale: String(c.scale),
      label: c.label,
      state: c.state,
      alignment: c.alignment ?? "left",
    });
    if (c.wrapWidth != null) query.set("wrapWidth", String(c.wrapWidth));
    await page.goto(`/?${query}`);
    await page.addStyleTag({
      content: `html,body { background: ${c.background}; } #root > :not([data-subject]) { visibility: hidden; } [data-subject] { position: fixed; left: ${c.x * c.scale}px; top: ${c.y * c.scale}px; }`,
    });
    await page.mouse.move(0, 0);
    const card = page.locator('[data-slot="label"]');
    await expect(card).toHaveAttribute("data-mc-label-layout-ready", "true");
    for (const line of await card.locator("[data-mc-label-ready]").all())
      await expect(line).toHaveAttribute("data-mc-label-ready", "true");
    const expectedBytes = await readFile(
      pixelPerfectFile(`tests/reference/label/captures/${c.name}`)
    );
    expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
      c.sha256
    );
    const actualBytes = await card.screenshot({ animations: "disabled" });
    const { diff, mismatchedPixels } = compare(
      PNG.sync.read(expectedBytes),
      PNG.sync.read(actualBytes)
    );
    await writeFile(testInfo.outputPath("actual.png"), actualBytes);
    await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
    await writeFile(
      testInfo.outputPath("metrics.json"),
      JSON.stringify(
        {
          case: c.name,
          mismatchedPixels,
          totalPixels: c.width * c.height * c.scale * c.scale,
          tolerance: 0,
        },
        null,
        2
      )
    );
    expect(mismatchedPixels).toBe(0);
  });
