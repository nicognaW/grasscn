import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import type { ToggleReferenceCase } from "@ppt/installed/reference-case";
import { pixelPerfectFile, webFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type ToggleAssetData from "../reference/toggle/asset-provenance.json";

type ToggleAssetPins = Pick<typeof ToggleAssetData, "assets">;

interface ToggleCaptureManifest {
  cases: ToggleReferenceCase[];
}

const directory = "tests/reference/toggle";

// SAFETY: The fixed retained toggle manifest supplies every consumed shared capture field, numeric x/y, string background and boolean checked required by ToggleReferenceCase.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained producer boundary; preserve this original runtime read/parse phase.
const manifest = JSON.parse(
  readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
) as ToggleCaptureManifest;

const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

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

test("Toggle comparator rejects one altered pixel", () => {
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

test("Toggle embeds the original four opaque recipe-filter PNGs", () => {
  // SAFETY: The retained Toggle asset-provenance artifact has the four actual recipe-filter asset keys, each with a string sha256; its type-only import describes this exact assets projection.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained producer boundary; preserve this original runtime read/parse phase.
  const pins = JSON.parse(
    readFileSync(
      pixelPerfectFile(`${directory}/asset-provenance.json`),
      "utf-8"
    )
  ) as ToggleAssetPins;

  const css = readFileSync(
    webFile("registry/ui/minecraft-toggle-assets.css"),
    "utf-8"
  );

  const images = [
    ...css.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/gu),
  ].map((m) => Buffer.from(m[1], "base64"));

  expect(images).toHaveLength(4);
  expect(images.map(sha).sort()).toEqual(
    Object.values(pins.assets)
      .map((pin) => pin.sha256)
      .sort()
  );

  for (const bytes of images) {
    const p = PNG.sync.read(bytes);
    expect([p.width, p.height]).toEqual([26, 16]);

    for (let i = 3; i < p.data.length; i += 4) {
      expect(p.data[i]).toBe(255);
    }
  }
});

test.describe("Toggle native recipe-filter matrix", () => {
  test.describe.configure({ mode: "parallel" });

  for (const c of manifest.cases) {
    test(`Toggle native pixels: ${c.name}`, async ({ page }, info) => {
      await page.setViewportSize({ height: 900, width: 1536 });

      const params = new URLSearchParams({
        background: c.background,
        checked: String(c.checked),
        component: "toggle",
        scale: String(c.scale),
        state: c.state,
        x: String(c.x),
        y: String(c.y),
      });

      await page.goto(`/?${params}`);
      const subject = page.locator("[data-subject]");
      await expect(subject).toHaveAttribute("data-slot", "toggle");
      await page.mouse.move(0, 0);

      if (c.state.endsWith("hover")) {
        await subject.hover();
      }

      if (c.state === "focus") {
        await subject.focus();
        await page.keyboard.press("Tab");
        await page.keyboard.press("Shift+Tab");
        await expect(subject).toBeFocused();
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
      const bounds = (await subject.boundingBox())!;
      expect([bounds.x, bounds.y]).toEqual([c.x * c.scale, c.y * c.scale]);

      const expectedBytes = readFileSync(
        pixelPerfectFile(`${directory}/captures/${c.name}`)
      );

      expect(sha(expectedBytes)).toBe(c.sha256);

      const actualBytes = await subject.screenshot();

      const { mismatchedPixels, diff } = compare(
        PNG.sync.read(expectedBytes),
        PNG.sync.read(actualBytes)
      );

      writeFileSync(info.outputPath("actual.png"), actualBytes);
      writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
      writeFileSync(
        info.outputPath("metrics.json"),
        JSON.stringify({ case: c.name, mismatchedPixels, tolerance: 0 })
      );
      expect(mismatchedPixels).toBe(0);
    });
  }
});
