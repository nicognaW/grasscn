import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

for (const dir of ["native-select", "native-select-extra"]) {
  const manifest = JSON.parse(
    readFileSync(
      pixelPerfectFile(`tests/reference/${dir}/manifest.json`),
      "utf-8"
    )
  );

  test.describe(`${dir} real HTMLSelect closed native appearance`, () => {
    test.describe.configure({ mode: "parallel" });

    for (const c of manifest.cases) {
      test(c.name, async ({ page }, info) => {
        await page.setViewportSize({ height: 900, width: 1536 });
        await page.addInitScript(
          () =>
            (Date.now = () =>
              Number(new URLSearchParams(location.search).get("timeMs") ?? 0))
        );

        const q = new URLSearchParams({
          background: c.background,
          component: "native-select",
          height: String(c.height),
          label: c.label,
          native: "1",
          scale: String(c.scale),
          state: c.state,
          timeMs: String(c.timeMs ?? 0),
          width: String(c.width),
          x: String(c.x),
          y: String(c.y),
        });

        await page.goto(`/?${q}`);
        await expect(page.locator(".mc-select-trigger")).toHaveAttribute(
          "data-mc-select-ready",
          "true"
        );
        await expect(page.locator(".mc-select-trigger-label")).toHaveText(
          c.label
        );

        for (const label of await page
          .locator(".mc-native-select-art [data-mc-label-ready]")
          .all()) {
          await expect(label).toHaveAttribute("data-mc-label-ready", "true");
        }

        await page.mouse.move(0, 0);

        if (c.state === "focus") {
          await page.locator("[data-subject]").focus();
        } else {
          await page.evaluate(() => {
            (document.activeElement as HTMLElement)?.blur();
          });
        }

        if (c.state.endsWith("hover")) {
          await page.locator("[data-subject]").hover({ force: true });
        }

        await page.evaluate(
          async () =>
            {
              const frameCompletion = Promise.withResolvers();

              try {
                requestAnimationFrame(() => {
                  requestAnimationFrame(frameCompletion.resolve);
                });
              } catch (error) {
                frameCompletion.reject(error);
              }

              return frameCompletion.promise;
            }
        );

        const bytes = readFileSync(
          pixelPerfectFile(`tests/reference/${dir}/captures/${c.name}`)
        );

        const actualBytes = await page
          .locator("[data-subject]")
          .screenshot({ animations: "disabled" });

        const a = PNG.sync.read(bytes);
        const b = PNG.sync.read(actualBytes);

        expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);
        expect([b.width, b.height]).toEqual([a.width, a.height]);
        let mismatchedPixels = 0;

        for (let i = 0; i < a.data.length; i += 4) {
          mismatchedPixels += Number(
            !a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4))
          );
        }

        writeFileSync(
          info.outputPath("metrics.json"),
          JSON.stringify({
            alias: "base",
            case: c.name,
            component: "native-select",
            manifest:
              dir === "."
                ? "tests/reference/manifest.json"
                : `tests/reference/${dir}/manifest.json`,
            mismatchedPixels,
            part: "closed",
            scope: "Closed control only; OS popup/listbox not asserted",
            tolerance: 0,
          })
        );
        writeFileSync(info.outputPath("actual.png"), actualBytes);
        expect(mismatchedPixels).toBe(0);
      });
    }
  });
}
