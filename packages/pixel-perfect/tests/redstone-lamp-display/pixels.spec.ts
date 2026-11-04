// Pixel Perfect Tests against projected references (ADR 0005): only the
// pixels covered by geometry in the native frame are compared, at zero
// tolerance and DPR 1. The transparent backdrop is a declared web adaptation.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { test, expect } from "@grasscn/tests/test";
import type { Page, TestInfo } from "@playwright/test";
import { compareMasked } from "@ppt/harness/projected-reference";
import { projectedManifestSchema } from "@ppt/native/projected-case";
import type { ProjectedManifest } from "@ppt/native/projected-case";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const corpus = pixelPerfectFile("tests/reference/redstone-lamp-display");

const JAR_SHA256 =
  "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const readManifest = (root: string) =>
  projectedManifestSchema.parse(
    JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf-8"))
  );

const manifest = readManifest(corpus);

type ProjectedCase = ProjectedManifest["cases"][number];

/** Compares the fixture-rendered display with one projected reference of a corpus. */
const compareWithProjectedReference = async (
  page: Page,
  testInfo: TestInfo,
  root: string,
  reference: ProjectedCase
) => {
  const referenceBytes = await readFile(
    path.join(root, reference.reference.file)
  );

  const maskBytes = await readFile(path.join(root, reference.mask.file));

  expect(sha256(referenceBytes)).toBe(reference.reference.sha256);
  expect(sha256(maskBytes)).toBe(reference.mask.sha256);

  const expected = PNG.sync.read(referenceBytes);
  const mask = PNG.sync.read(maskBytes);

  const covered = Uint8Array.from(
    { length: mask.width * mask.height },
    (_, pixel) => (mask.data[pixel * 4 + 3] === 255 ? 1 : 0)
  );

  expect(covered.reduce((sum, value) => sum + value, 0)).toBe(
    reference.coveredPixels
  );

  await page.goto(
    `/redstone-lamp-display.html?${new URLSearchParams({
      value: reference.value,
    })}`
  );
  const subject = page.locator("[data-subject][data-rendered='true']");
  await expect(subject).toBeVisible();
  await expect
    .poll(
      async () =>
        await subject.evaluate(
          (element) =>
            element instanceof HTMLImageElement &&
            element.complete &&
            element.naturalWidth > 0
        )
    )
    .toBe(true);

  const actualBytes = await subject.screenshot({ animations: "disabled" });
  const actual = PNG.sync.read(actualBytes);
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);

  const result = compareMasked(actual.data, expected.data, covered);
  const diff = new PNG({ height: expected.height, width: expected.width });
  diff.data.set(result.diff);

  await writeFile(testInfo.outputPath("actual.png"), actualBytes);
  await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
  await writeFile(
    testInfo.outputPath("metrics.json"),
    JSON.stringify(
      {
        maskedPixels: result.maskedPixels,
        mismatchedPixels: result.mismatchedPixels,
        reference: path.join(root, reference.reference.file),
        tolerance: 0,
        totalPixels: result.totalPixels,
      },
      null,
      2
    )
  );

  return result;
};

test("redstone lamp display projected references are bound to their native capture", async () => {
  expect(sha256(await readFile(path.join(corpus, "case.json")))).toBe(
    manifest.caseDefinitionSha256
  );

  for (const harness of manifest.harnessSources) {
    // oxlint-disable-next-line no-await-in-loop -- Frozen harness files in declared order.
    expect(sha256(await readFile(path.join(corpus, harness.file)))).toBe(
      harness.sha256
    );
  }

  expect(manifest.sourceJar.sha256).toBe(JAR_SHA256);
  expect(manifest.launches.map((launch) => launch.name)).toEqual([
    "native-one",
    "native-two",
  ]);
});

for (const reference of manifest.cases) {
  test(`redstone lamp display ${reference.value} matches its projected reference within the geometry mask`, async ({
    page,
  }, testInfo) => {
    const result = await compareWithProjectedReference(
      page,
      testInfo,
      corpus,
      reference
    );

    expect(
      result.mismatchedPixels,
      "Every masked RGBA pixel must match the projected native reference"
    ).toBe(0);
  });
}

test("the projected reference comparator fails on a one-pixel change in a temporary copy", async ({
  page,
}, testInfo) => {
  const [reference] = manifest.cases;
  expect(reference).toBeDefined();

  if (reference === undefined) {
    return;
  }

  const copy = await mkdtemp(path.join(os.tmpdir(), "grasscn-projected-"));

  try {
    await cp(corpus, copy, { recursive: true });
    const file = path.join(copy, reference.reference.file);
    const image = PNG.sync.read(await readFile(file));

    // The first covered pixel of the native mask; flip its lowest red bit.
    const mask = PNG.sync.read(
      await readFile(path.join(copy, reference.mask.file))
    );

    const pixel = Array.from({ length: mask.width * mask.height }).findIndex(
      (_, index) => mask.data[index * 4 + 3] === 255
    );

    // oxlint-disable-next-line no-bitwise -- One deliberate one-bit change.
    image.data[pixel * 4] = (image.data[pixel * 4] ?? 0) ^ 1;
    const changed = PNG.sync.write(image);
    await writeFile(file, changed);

    const result = await compareWithProjectedReference(page, testInfo, copy, {
      ...reference,
      reference: { ...reference.reference, sha256: sha256(changed) },
    });

    expect(result.mismatchedPixels).toBe(1);
  } finally {
    await rm(copy, { force: true, recursive: true });
  }
});
