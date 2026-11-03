import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type labelReference from "../reference/label/manifest.json";
import type separatorReference from "../reference/separator/manifest.json";

type MarkerSource =
  | (typeof labelReference)["cases"][number]
  | (typeof separatorReference)["cases"][number];

type MarkerCase = Pick<
  MarkerSource,
  | "name"
  | "background"
  | "height"
  | "scale"
  | "state"
  | "width"
  | "x"
  | "y"
  | "sha256"
> & {
  alignment?: string;
  label?: string;
  wrapWidth?: number;
  timeMs?: number;
};

interface MarkerReference {
  cases: MarkerCase[];
}

for (const dir of ["label", "separator"]) {
  // SAFETY: Only retained label/separator cases reach this read; the owned consumed protocol preserves their optional label/alignment/wrapWidth and original timeMs fallback.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-JSON producer boundary; runtime read and parse stay unchanged.
  const manifest = JSON.parse(
    readFileSync(
      pixelPerfectFile(`tests/reference/${dir}/manifest.json`),
      "utf-8"
    )
  ) as MarkerReference;

  test.describe(`Marker ${dir} native constituents`, () => {
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
          align: c.alignment ?? "left",
          background: c.background,
          component: "marker",
          height: String(c.height),
          label: c.label ?? "",
          native: "1",
          part: dir === "label" ? "text" : "line",
          scale: String(c.scale),
          state: c.state,
          timeMs: String(c.timeMs ?? 0),
          width: String(c.width),
          x: String(c.x),
          y: String(c.y),
          ...((c.wrapWidth ?? 0) ? { wrapWidth: String(c.wrapWidth) } : {}),
        });

        await page.goto(`/?${q}`);

        if (dir === "label") {
          await expect(
            page.locator("[data-mc-label-layout-ready]")
          ).toHaveAttribute("data-mc-label-layout-ready", "true");

          for (const label of await page
            .locator("[data-mc-label-ready]")
            .all()) {
            await expect(label).toHaveAttribute("data-mc-label-ready", "true");
          }
        }

        await page.mouse.move(0, 0);

        await (c.state === "focus" ?
          page.locator("[data-subject]").focus()
        :
          page.evaluate(() => {
            (document.activeElement as HTMLElement)?.blur();
          })
        );

        if (c.state.endsWith("hover")) {
          await page.locator("[data-subject]").hover({ force: true });
        }

        await page.evaluate(async () => {
          const frameCompletion = Promise.withResolvers();

          try {
            requestAnimationFrame(() => {
              requestAnimationFrame(frameCompletion.resolve);
            });
          } catch (error) {
            frameCompletion.reject(error);
          }

          return await frameCompletion.promise;
        });

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
            component: "marker",
            manifest:
              dir === "."
                ? "tests/reference/manifest.json"
                : `tests/reference/${dir}/manifest.json`,
            mismatchedPixels,
            part: dir === "label" ? "text" : "line",
            scope:
              "Original Label/Separator constituent cases; marker arrangement is composition",
            tolerance: 0,
          })
        );
        writeFileSync(info.outputPath("actual.png"), actualBytes);
        expect(mismatchedPixels).toBe(0);
      });
    }
  });
}
