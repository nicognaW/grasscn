import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { expectNotNull } from "@grasscn/tests/assertions";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type cjkButtonReference from "../reference/button-cjk/manifest.json";
import type buttonReference from "../reference/manifest.json";

type MenubarTriggerReferenceCase = (typeof buttonReference)["cases"][number] & {
  x?: (typeof cjkButtonReference)["cases"][number]["x"];
  y?: (typeof cjkButtonReference)["cases"][number]["y"];
};

interface MenubarTriggerReferenceManifest {
  cases: MenubarTriggerReferenceCase[];
}

const compare = function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ height: expected.height, width: expected.width });
  let mismatchedPixels = 0;

  for (let i = 0; i < expected.data.length; i += 4) {
    const different = !actual.data
      .subarray(i, i + 4)
      .equals(expected.data.subarray(i, i + 4));

    mismatchedPixels += Number(different);
    diff.data.set(
      different
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

test("Menubar trigger comparator catches one changed pixel", () => {
  const expected = PNG.sync.read(
    readFileSync(
      pixelPerfectFile("tests/reference/captures/normal-w200-s1.png")
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));

  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const directory of ["tests/reference", "tests/reference/button-cjk"]) {
  // SAFETY: these retained native capture producers own this concrete case schema; the existing read/parse phase and verification assertions remain unchanged.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const manifest = JSON.parse(
    readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
  ) as MenubarTriggerReferenceManifest;

  for (const c of manifest.cases) {
    for (const open of c.state === "hover" ? [false, true] : [false]) {
      test(`Menubar trigger native pixels: ${c.name} open:${open}`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ height: 900, width: 1536 });

        const params = new URLSearchParams({
          component: "menubar",
          label: c.label,
          scale: String(c.scale),
          state: open ? "normal" : c.state,
          triggerPixels: "1",
          width: String(c.width),
          x: String(c.x ?? 16),
          y: String(c.y ?? 16),
        });

        if (open) {
          params.set("open", "1");
        }

        await page.goto(`/?${params}`);
        const trigger = page.locator('[data-slot="menubar-trigger"]').first();
        await expect(trigger).toBeVisible();
        await page.addStyleTag({
          content: '[data-slot="menubar-content"]{visibility:hidden}',
        });
        await page.mouse.move(0, 0);

        if (c.state === "hover" && !open) {
          await trigger.hover();
        }

        if (c.state === "focus") {
          await page.keyboard.press("Tab");
          await expect(trigger).toBeFocused();
        }

        for (const line of await trigger
          .locator("[data-mc-label-ready]")
          .all()) {
          await expect(line).toHaveAttribute("data-mc-label-ready", "true");
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
        const bounds = await trigger.boundingBox();
        expectNotNull(bounds, "Missing required bounding box: bounds");
        expect([bounds.x, bounds.y]).toEqual([
          (c.x ?? 16) * c.scale,
          (c.y ?? 16) * c.scale,
        ]);

        const expectedBytes = readFileSync(
          pixelPerfectFile(`${directory}/captures/${c.name}`)
        );

        expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
          c.sha256
        );

        const actualBytes = await trigger.screenshot();

        const { diff, mismatchedPixels } = compare(
          PNG.sync.read(expectedBytes),
          PNG.sync.read(actualBytes)
        );

        writeFileSync(info.outputPath("actual.png"), actualBytes);
        writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
        writeFileSync(
          info.outputPath("metrics.json"),
          JSON.stringify({ case: c.name, open, mismatchedPixels, tolerance: 0 })
        );
        expect(mismatchedPixels).toBe(0);
      });
    }
  }
}
