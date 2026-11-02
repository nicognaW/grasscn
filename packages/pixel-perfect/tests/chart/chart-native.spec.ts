import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const repo = path.resolve(".");
const audits = new WeakMap<object, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  audits.set(page, errors);
  page.on("pageerror", (e) => errors.push(e.message));
});

test.afterEach(({ page, browser }, info) => {
  const errors = audits.get(page) ?? [];
  writeFileSync(
    info.outputPath("runtime.json"),
    JSON.stringify({ browser: browser.version(), pageErrors: errors })
  );
  expect(errors).toEqual([]);
});

test.describe.configure({ mode: "parallel" });

for (const kind of ["fps", "pie"]) {
  const dir = path.join(repo, `tests/reference/chart-${kind}`);

  const manifest = JSON.parse(
    readFileSync(pixelPerfectFile(path.join(dir, "manifest.json")), "utf-8")
  );

  for (const c of manifest.cases) {
    test(`Native ${kind}:${c.name}`, async ({ page }, info) => {
      await page.setViewportSize({ height: 900, width: 1536 });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(
        `/?component=chart&case=${encodeURIComponent(JSON.stringify(c))}`
      );
      const subject = page.locator("[data-subject]");

      if (kind === "pie") {
        await expect(
          subject.locator("[data-slot=chart-profiler-frame]")
        ).toHaveAttribute("data-mc-ready", "true");
      }

      await page.evaluate(
        async () =>
          {
            const frameCompletion = Promise.withResolvers<void>();

            try {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  frameCompletion.resolve();
                });
              });
            } catch (error) {
              frameCompletion.reject(error);
            }

            return frameCompletion.promise;
          }
      );

      const bytes = readFileSync(
        pixelPerfectFile(path.join(dir, "captures", c.name))
      );

      expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);

      const actualBytes = await subject.screenshot();
      const actual = PNG.sync.read(actualBytes);
      const expected = PNG.sync.read(bytes);

      expect([actual.width, actual.height]).toEqual([
        expected.width,
        expected.height,
      ]);
      let count = 0;
      const diff = new PNG({ height: actual.height, width: actual.width });

      for (let i = 0; i < actual.data.length; i += 4) {
        const changed = !actual.data
          .subarray(i, i + 4)
          .equals(expected.data.subarray(i, i + 4));

        if (changed) {
          count += 1;
        }

        diff.data.set(changed ? [255, 0, 255, 255] : [0, 0, 0, 255], i);
      }

      writeFileSync(info.outputPath("actual.png"), actualBytes);
      writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
      writeFileSync(
        info.outputPath("metrics.json"),
        JSON.stringify({ case: c.name, kind, mismatchedPixels: count })
      );
      expect(errors).toEqual([]);
      expect(count).toBe(0);
    });
  }
}
