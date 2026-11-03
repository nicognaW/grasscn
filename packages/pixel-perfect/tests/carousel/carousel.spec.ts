import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import type { TestInfo } from "@playwright/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type BoundaryReference1 from "../reference/pagination-arrow/manifest.json";

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

const manifest =
  // SAFETY: this exact retained JSON input is represented by the adjacent type-only producer import; preserve the original fresh read, parse and runtime checks.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-data boundary; no runtime validation or generic JSON caster.
  JSON.parse(
    readFileSync(
      pixelPerfectFile(
        path.join(repo, "tests/reference/pagination-arrow/manifest.json")
      ),
      "utf-8"
    )
  ) as typeof BoundaryReference1;

for (const c of manifest.cases) {
  test(`Carousel original native recipe arrow:${c.name}`, async ({
    page,
  }, info) => {
    const q = new URLSearchParams({
      background: c.background,
      direction: c.checked ? "forward" : "backward",
      native: "1",
      scale: String(c.scale),
      state: c.state,
      x: String(c.x),
      y: String(c.y),
    });

    await page.goto(`/?component=carousel&${q}`);
    const subject = page.locator("[data-subject]");

    if (c.state.includes("hover")) {
      await subject.hover();
    } else if (c.state === "focus") {
      await subject.focus();
    }

    const bytes = readFileSync(
      pixelPerfectFile(
        path.join(repo, "tests/reference/pagination-arrow/captures", c.name)
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
    compare(actual, expected, info, c, "arrow");
  });
}
