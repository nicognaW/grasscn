import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { minecraftSeparatorAssets } from "@grasscn/web/ui/minecraft-separator-assets";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type CapturedData0 from "../reference/separator/asset-provenance.json";
import manifest from "../reference/separator/manifest.json";

const compare = function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ height: expected.height, width: expected.width });
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

test("Separator comparator catches a one-pixel change", async () => {
  const expected = PNG.sync.read(
    await readFile(
      pixelPerfectFile(
        `tests/reference/separator/captures/${manifest.cases[0].name}`
      )
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const asChild of [false, true]) {
  for (const c of manifest.cases) {
    test(`Separator native pixels (${asChild ? "hr" : "div"}): ${c.name}`, async ({
      page,
    }, testInfo) => {
      const query = new URLSearchParams({
        component: "separator",
        width: String(c.width),
        scale: String(c.scale),
        state: c.state,
      });

      if (asChild) {
        query.set("asChild", "1");
      }

      await page.goto(`/?${query}`);
      await page.addStyleTag({
        content: `html,body { background: ${c.background}; } #root > :not([data-subject]) { visibility: hidden; } [data-subject] { position: fixed; left: ${c.x * c.scale}px; top: ${c.y * c.scale}px; }`,
      });
      await page.mouse.move(0, 0);
      const card = page.locator('[data-slot="separator"]');
      await expect(card).toBeVisible();

      const expectedBytes = await readFile(
        pixelPerfectFile(`tests/reference/separator/captures/${c.name}`)
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
  }
}

test("Separator embeds unchanged original title and in-world textures", () => {
  // SAFETY: This read consumes the same pinned tests/reference/separator/asset-provenance.json producer data described by the type-only import; retain the runtime read and parse phase.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const provenance = JSON.parse(
    readFileSync(
      pixelPerfectFile("tests/reference/separator/asset-provenance.json"),
      "utf-8"
    )
  ) as typeof CapturedData0;

  for (const edge of ["header", "footer"] as const) {
    const bytes = Buffer.from(
      minecraftSeparatorAssets[edge].split(",")[1],
      "base64"
    );

    const sha = createHash("sha256").update(bytes).digest("hex");
    expect(sha).toBe(
      provenance.sources[`assets/minecraft/textures/gui/${edge}_separator.png`]
        .sha256
    );
    expect(sha).toBe(
      provenance.sources[
        `assets/minecraft/textures/gui/inworld_${edge}_separator.png`
      ].sha256
    );
    const image = PNG.sync.read(bytes);
    expect([image.width, image.height]).toEqual([32, 2]);
  }
});
