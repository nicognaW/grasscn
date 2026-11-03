import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { compare } from "@ppt/harness/families/text-components-test-utils";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type CapturedData0 from "../reference/empty/manifest.json";
import type labelReference from "../reference/label/manifest.json";

type EmptySource =
  | (typeof CapturedData0)["cases"][number]
  | (typeof labelReference)["cases"][number];

type EmptyCase = Pick<
  EmptySource,
  | "name"
  | "background"
  | "height"
  | "scale"
  | "width"
  | "x"
  | "y"
  | "sha256"
  | "label"
> & {
  alignment?: string;
  wrapWidth?: number;
};

interface EmptyReference {
  cases: EmptyCase[];
}

test.describe.configure({ mode: "parallel" });

test("Empty comparator catches one changed pixel", () => {
  // SAFETY: This read consumes the same pinned tests/reference/empty/manifest.json producer data described by the type-only import; retain the runtime read and parse phase.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const manifest = JSON.parse(
    readFileSync(
      pixelPerfectFile("tests/reference/empty/manifest.json"),
      "utf-8"
    )
  ) as typeof CapturedData0;

  const expected = PNG.sync.read(
    readFileSync(
      pixelPerfectFile(
        `tests/reference/empty/captures/${manifest.cases[0].name}`
      )
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));

  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const [part, directory] of [
  ["default", "tests/reference/empty"],
  ["title", "tests/reference/label"],
  ["description", "tests/reference/label"],
]) {
  // SAFETY: The literal tuple selects only empty/label manifests; this local consumed protocol preserves existing optional alignment and wrapWidth lookups.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-JSON producer boundary; runtime read and parse stay unchanged.
  const manifest = JSON.parse(
    readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
  ) as EmptyReference;

  for (const c of manifest.cases) {
    test(`Empty ${part} native pixels: ${c.name}`, async ({ page }, info) => {
      await page.setViewportSize({ height: 900, width: 1536 });

      const params = new URLSearchParams({
        align: c.alignment ?? "left",
        background: c.background,
        component: "empty",
        height: String(c.height),
        native: "1",
        part,
        scale: String(c.scale),
        text: c.label ?? "",
        width: String(c.width),
        x: String(c.x),
        y: String(c.y),
      });

      const caseWrapWidth = c.wrapWidth;

      if (caseWrapWidth !== null && caseWrapWidth !== undefined) {
        params.set("wrapWidth", String(caseWrapWidth));
      }

      await page.goto(`/?${params}`);
      const subject = page.locator("[data-subject]");
      await expect(subject).toHaveAttribute(
        "data-slot",
        part === "default" ? "empty" : `empty-${part}`
      );
      await expect(subject).toBeVisible();
      await expect(
        part === "default"
          ? subject.locator("[data-mc-label-layout-ready]")
          : subject
      ).toHaveAttribute("data-mc-label-layout-ready", "true");

      for (const line of await subject.locator("[data-mc-label-ready]").all()) {
        await expect(line).toHaveAttribute("data-mc-label-ready", "true");
      }

      await page.evaluate(async () => {
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

        await frameCompletion.promise;
      });

      const expectedBytes = readFileSync(
        pixelPerfectFile(`${directory}/captures/${c.name}`)
      );

      expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
        c.sha256
      );

      const actualBytes = await subject.screenshot();

      const { mismatchedPixels, diff } = compare(
        PNG.sync.read(expectedBytes),
        PNG.sync.read(actualBytes)
      );

      writeFileSync(info.outputPath("actual.png"), actualBytes);
      writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
      writeFileSync(
        info.outputPath("metrics.json"),
        JSON.stringify({ case: c.name, mismatchedPixels, part, tolerance: 0 })
      );
      expect(mismatchedPixels).toBe(0);
    });
  }
}
