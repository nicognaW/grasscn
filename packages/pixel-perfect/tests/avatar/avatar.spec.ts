import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type CapturedData0 from "../reference/label/manifest.json";

const dir = "tests/reference/avatar";

const manifest = JSON.parse(
  readFileSync(pixelPerfectFile(`${dir}/manifest.json`), "utf-8")
);

const difference = function difference(a: PNG, b: PNG) {
  expect([a.width, a.height]).toEqual([b.width, b.height]);
  let count = 0;

  for (let i = 0; i < a.data.length; i += 4) {
    count += Number(
      !a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4))
    );
  }

  return count;
};

test("Avatar comparator catches a changed pixel", () => {
  const a = PNG.sync.read(
    readFileSync(pixelPerfectFile(`${dir}/captures/${manifest.cases[0].name}`))
  );

  const b = PNG.sync.read(PNG.sync.write(a));

  b.data[0] ^= 1;
  expect(difference(a, b)).toBe(1);
});

test.describe("Actual original PlayerFaceExtractor", () => {
  test.describe.configure({ mode: "parallel" });

  for (const c of manifest.cases) {
    test(c.name, async ({ page }, info) => {
      await page.setViewportSize({ height: 900, width: 1536 });

      const q = new URLSearchParams({
        background: c.background,
        checked: String(c.checked),
        component: "avatar",
        height: String(c.height),
        label: c.label,
        native: "1",
        scale: String(c.scale),
        selected: String(c.selected),
        width: String(c.width),
        x: String(c.x),
        y: String(c.y),
      });

      await page.goto(`/?${q}`);
      await expect(page.locator("[data-mc-avatar-face]")).toHaveAttribute(
        "data-ready",
        "true"
      );
      await page.evaluate(async () => {
        const frameCompletion = Promise.withResolvers();

        try {
          requestAnimationFrame(() => {
            requestAnimationFrame(frameCompletion.resolve);
          });
        } catch (error) {
          frameCompletion.reject(error);
        }

        return frameCompletion.promise;
      });

      const expected = readFileSync(
        pixelPerfectFile(`${dir}/captures/${c.name}`)
      );

      expect(createHash("sha256").update(expected).digest("hex")).toBe(
        c.sha256
      );

      const actual = await page
        .locator("[data-subject]")
        .screenshot({ animations: "disabled" });

      const mismatchedPixels = difference(
        PNG.sync.read(expected),
        PNG.sync.read(actual)
      );

      writeFileSync(
        info.outputPath("metrics.json"),
        JSON.stringify({
          alias: "base",
          case: c.name,
          component: "avatar",
          manifest: `${dir}/manifest.json`,
          mismatchedPixels,
          part: "face",
          tolerance: 0,
        })
      );
      writeFileSync(info.outputPath("actual.png"), actual);
      expect(mismatchedPixels).toBe(0);
    });
  }
});

// SAFETY: This read consumes the same pinned tests/reference/label/manifest.json producer data described by the type-only import; retain the runtime read and parse phase.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const labels = JSON.parse(
  readFileSync(pixelPerfectFile("tests/reference/label/manifest.json"), "utf-8")
) as typeof CapturedData0;

test.describe("AvatarFallback original Label constituents", () => {
  test.describe.configure({ mode: "parallel" });

  for (const c of labels.cases) {
    test(`avatar fallback ${c.name}`, async ({ page }, info) => {
      await page.setViewportSize({ height: 900, width: 1536 });

      const q = new URLSearchParams({
        align: c.alignment ?? "left",
        background: c.background,
        component: "avatar",
        height: String(c.height),
        label: c.label,
        native: "1",
        part: "label",
        scale: String(c.scale),
        width: String(c.width),
        x: String(c.x),
        y: String(c.y),
      });

      if (c.wrapWidth) {
        q.set("wrapWidth", String(c.wrapWidth));
      }

      await page.goto(`/?${q}`);
      await expect(
        page.locator("[data-mc-label-layout-ready]")
      ).toHaveAttribute("data-mc-label-layout-ready", "true");

      for (const canvas of await page.locator("[data-mc-label-ready]").all()) {
        await expect(canvas).toHaveAttribute("data-mc-label-ready", "true");
      }

      await page.evaluate(async () => {
        const frameCompletion2 = Promise.withResolvers();

        try {
          requestAnimationFrame(() => {
            requestAnimationFrame(frameCompletion2.resolve);
          });
        } catch (error) {
          frameCompletion2.reject(error);
        }

        return frameCompletion2.promise;
      });

      const expected = readFileSync(
        pixelPerfectFile(`tests/reference/label/captures/${c.name}`)
      );

      const actual = await page
        .locator("[data-subject]")
        .screenshot({ animations: "disabled" });

      expect(createHash("sha256").update(expected).digest("hex")).toBe(
        c.sha256
      );

      const mismatchedPixels = difference(
        PNG.sync.read(expected),
        PNG.sync.read(actual)
      );

      writeFileSync(info.outputPath("actual.png"), actual);
      writeFileSync(
        info.outputPath("metrics.json"),
        JSON.stringify({
          alias: "base",
          case: c.name,
          component: "avatar",
          manifest: "tests/reference/label/manifest.json",
          mismatchedPixels,
          part: "label",
          tolerance: 0,
        })
      );
      expect(mismatchedPixels).toBe(0);
    });
  }
});
