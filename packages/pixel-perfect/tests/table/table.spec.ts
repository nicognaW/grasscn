import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import type { TestInfo } from "@playwright/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type { CapturedReferenceCase } from "@ppt/installed/reference-case";

/** Shared consumed shape of the retained Separator and Table-background captures. */
interface TablePositionedCase extends CapturedReferenceCase {
  background: string;
  x: number;
  y: number;
}

interface TableLabelCase extends TablePositionedCase {
  label: string;
  alignment: string;
  wrapWidth?: number;
}

interface TableLabelManifest {
  cases: TableLabelCase[];
}

interface TablePositionedManifest {
  cases: TablePositionedCase[];
}

const repo = path.resolve(".");

const compare = function compare(
  actual: PNG,
  expected: PNG,
  info: TestInfo,
  c: { name: string },
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

// SAFETY: The fixed retained Label manifest supplies the consumed label, alignment, geometry and identity fields; wrapWidth is a real optional number.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained capture boundary; existing runtime read/parse phase is preserved.
const labelManifest = JSON.parse(
  readFileSync(
    pixelPerfectFile(path.join(repo, "tests/reference/label/manifest.json")),
    "utf-8"
  )
) as TableLabelManifest;

test.describe("Table original native label constituents", () => {
  test.describe.configure({ mode: "parallel" });

  for (const c of labelManifest.cases) {
    for (const part of ["head", "cell", "caption"]) {
      test(`Table ${part} native label:${c.name}`, async ({ page }, info) => {
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

        await page.goto(`/?component=table&${q}`);
        const subject = page.locator("[data-subject]");
        await expect(
          subject.locator("[data-mc-label-layout-ready]")
        ).toHaveAttribute("data-mc-label-layout-ready", "true");

        for (const text of await subject
          .locator("[data-mc-label-ready]")
          .all()) {
          await expect(text).toHaveAttribute("data-mc-label-ready", "true");
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

          return await frameCompletion.promise;
        });

        const bytes = readFileSync(
          pixelPerfectFile(
            path.join(repo, "tests/reference/label/captures", c.name)
          )
        );

        expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);

        const actualBytes = await subject.screenshot();
        const actual = PNG.sync.read(actualBytes);
        const expected = PNG.sync.read(bytes);

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

// SAFETY: The fixed retained Separator manifest supplies every consumed identity, state, background and coordinate field.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained capture boundary; existing runtime read/parse phase is preserved.
const separatorManifest = JSON.parse(
  readFileSync(
    pixelPerfectFile(
      path.join(repo, "tests/reference/separator/manifest.json")
    ),
    "utf-8"
  )
) as TablePositionedManifest;

test.describe("Table native header/footer separator artwork", () => {
  test.describe.configure({ mode: "parallel" });

  for (const c of separatorManifest.cases) {
    test(`Table ${c.state} separator:${c.name}`, async ({ page }, info) => {
      await page.setViewportSize({ height: 900, width: 1536 });

      const q = new URLSearchParams({
        background: c.background,
        height: String(c.height),
        native: "1",
        part: c.state,
        scale: String(c.scale),
        width: String(c.width),
        x: String(c.x),
        y: String(c.y),
      });

      await page.goto(`/?component=table&${q}`);
      const subject = page.locator("[data-subject]");
      await expect(subject).toBeVisible();

      const actualBytes = await subject.screenshot();
      const actual = PNG.sync.read(actualBytes);

      const bytes = readFileSync(
        pixelPerfectFile(
          path.join(repo, "tests/reference/separator/captures", c.name)
        )
      );

      const expected = PNG.sync.read(bytes);

      expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);
      expect([actual.width, actual.height]).toEqual([
        expected.width,
        expected.height,
      ]);
      writeFileSync(info.outputPath("actual.png"), actualBytes);
      compare(actual, expected, info, c, c.state);
    });
  }
});

// SAFETY: The fixed retained six Table-background ROI captures supply the consumed identity, state, background and coordinate fields; no current generator lineage is assumed.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained capture boundary; existing runtime read/parse phase is preserved.
const listBackground = JSON.parse(
  readFileSync(
    pixelPerfectFile(
      path.join(repo, "tests/reference/table-background/manifest.json")
    ),
    "utf-8"
  )
) as TablePositionedManifest;

for (const c of listBackground.cases) {
  test(`Table exact native list background:${c.name}`, async ({
    page,
  }, info) => {
    const q = new URLSearchParams({
      background: c.background,
      backgroundOnly: "1",
      height: String(c.height),
      native: "1",
      part: "cell",
      scale: String(c.scale),
      width: String(c.width),
      x: String(c.x),
      y: String(c.y),
    });

    await page.goto(`/?component=table&${q}`);

    const actualBytes = await page.locator("[data-subject]").screenshot();
    const actual = PNG.sync.read(actualBytes);

    const bytes = readFileSync(
      pixelPerfectFile(
        path.join(repo, `tests/reference/table-background/captures/${c.name}`)
      )
    );

    const expected = PNG.sync.read(bytes);

    expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);
    expect([actual.width, actual.height]).toEqual([
      expected.width,
      expected.height,
    ]);
    writeFileSync(info.outputPath("actual.png"), actualBytes);
    compare(actual, expected, info, c, "background");
  });
}
