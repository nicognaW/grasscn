import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const repo = path.resolve(".");

const compare = function compare(
  actual: PNG,
  expected: PNG,
  info: any,
  c: any,
  part: string
) {
  let mismatchedPixels = 0;
  const diff = new PNG({ height: actual.height, width: actual.width });

  for (let i = 0; i < actual.data.length; i += 4) {
    const changed = !actual.data
      .subarray(i, i + 4)
      .equals(expected.data.subarray(i, i + 4));

    if (changed) {
      mismatchedPixels += 1;
    }

    diff.data.set(changed ? [255, 0, 255, 255] : [0, 0, 0, 255], i);
  }

  writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
  writeFileSync(
    info.outputPath("metrics.json"),
    JSON.stringify({
      case: c.name,
      height: actual.height,
      mismatchedPixels,
      part,
      width: actual.width,
    })
  );
  expect(mismatchedPixels).toBe(0);
};

const runtimeErrors = new WeakMap<object, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});

test.afterEach(({ page, browser }, info) => {
  writeFileSync(
    info.outputPath("runtime.json"),
    JSON.stringify({
      browser: browser.version(),
      pageErrors: runtimeErrors.get(page) ?? [],
    })
  );
  expect(runtimeErrors.get(page)).toEqual([]);
});

const labelManifest = JSON.parse(
  readFileSync(
    pixelPerfectFile(path.join(repo, "tests/reference/label/manifest.json")),
    "utf-8"
  )
);

test.describe("DataTable original native label constituents", () => {
  test.describe.configure({ mode: "parallel" });

  for (const c of labelManifest.cases) {
    for (const part of ["head", "cell"]) {
      test(`DataTable ${part} native label:${c.name}`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width: 1536, height: 900 });

        const q = new URLSearchParams({
          native: "1",
          part,
          label: c.label,
          width: String(c.width),
          height: String(c.height),
          scale: String(c.scale),
          x: String(c.x),
          y: String(c.y),
          background: c.background,
          alignment: c.alignment ?? "left",
        });

        if (c.wrapWidth != null) {
          q.set("wrapWidth", String(c.wrapWidth));
        }

        await page.goto(`/?component=data-table&${q}`);

        const subject = page.locator(
          part === "head" ? "[data-slot=table-head]" : "[data-slot=table-cell]"
        );

        await expect(
          subject.locator("[data-mc-label-layout-ready]")
        ).toHaveAttribute("data-mc-label-layout-ready", "true");

        for (const text of await subject
          .locator("[data-mc-label-ready]")
          .all()) {
          await expect(text).toHaveAttribute("data-mc-label-ready", "true");
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

        const bytes = readFileSync(
          pixelPerfectFile(
            path.join(repo, "tests/reference/label/captures", c.name)
          )
        );

        expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);

        const actualBytes = await subject.screenshot(),
          actual = PNG.sync.read(actualBytes),
          expected = PNG.sync.read(bytes);

        expect([actual.width, actual.height]).toEqual([
          expected.width,
          expected.height,
        ]);
        writeFileSync(info.outputPath("actual.png"), actualBytes);
        compare(actual, expected, info, c, part);
      });
    }
  }
});
