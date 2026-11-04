// Pixel Perfect Tests against the captured nether star references: the
// original GUI item with its enchantment glint at GUI scale 2 on #202020, at
// each declared glint time. Every decoded RGBA pixel is compared at zero
// tolerance and DPR 1. Times between the captured ones are unverified.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { test, expect } from "@grasscn/tests/test";
import type { Page, TestInfo } from "@playwright/test";
import {
  netherStarCaseSchema,
  netherStarManifestSchema,
} from "@ppt/native/nether-star-case";
import type { NetherStarManifest } from "@ppt/native/nether-star-case";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const corpus = pixelPerfectFile("tests/reference/nether-star");

const JAR_SHA256 =
  "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const manifest = netherStarManifestSchema.parse(
  JSON.parse(readFileSync(path.join(corpus, "manifest.json"), "utf-8"))
);

type NetherStarCapture = NetherStarManifest["cases"][number];

const referenceCases = manifest.cases.filter((entry) => !entry.control);

/** Compares the fixture-rendered nether star with one captured reference. */
const compareWithCapturedReference = async (
  page: Page,
  testInfo: TestInfo,
  root: string,
  capture: NetherStarCapture
) => {
  const referenceBytes = await readFile(
    path.join(root, capture.reference.file)
  );

  expect(sha256(referenceBytes)).toBe(capture.reference.sha256);

  const expected = PNG.sync.read(referenceBytes);

  await page.goto(
    `/nether-star.html?${new URLSearchParams({ glint: String(capture.glintMillis) })}`
  );
  const subject = page.locator("[data-subject][data-rendered='true']");
  await expect(subject).toBeVisible();

  const actualBytes = await subject.screenshot({ animations: "disabled" });
  const actual = PNG.sync.read(actualBytes);
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);

  let mismatchedPixels = 0;
  const diff = new PNG({ height: expected.height, width: expected.width });

  for (let offset = 0; offset < expected.data.length; offset += 4) {
    if (
      !actual.data
        .subarray(offset, offset + 4)
        .equals(expected.data.subarray(offset, offset + 4))
    ) {
      mismatchedPixels += 1;
      diff.data.set([255, 0, 255, 255], offset);
    }
  }

  await writeFile(testInfo.outputPath("actual.png"), actualBytes);
  await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
  await writeFile(
    testInfo.outputPath("metrics.json"),
    JSON.stringify(
      {
        glintMillis: capture.glintMillis,
        mismatchedPixels,
        reference: path.join(root, capture.reference.file),
        tolerance: 0,
        totalPixels: expected.width * expected.height,
      },
      null,
      2
    )
  );

  return mismatchedPixels;
};

test("nether star captured references are bound to their native capture", async () => {
  const caseBytes = await readFile(path.join(corpus, "case.json"));
  expect(sha256(caseBytes)).toBe(manifest.caseDefinitionSha256);

  const definition = netherStarCaseSchema.parse(
    JSON.parse(caseBytes.toString("utf-8"))
  );

  for (const file of [
    ...manifest.harnessSources,
    ...manifest.cases.flatMap((entry) => [entry.frame, entry.reference]),
  ]) {
    // oxlint-disable-next-line no-await-in-loop -- Frozen corpus files in declared order.
    expect(sha256(await readFile(path.join(corpus, file.file)))).toBe(
      file.sha256
    );
  }

  expect(manifest.sourceJar.sha256).toBe(JAR_SHA256);
  expect(referenceCases.map((entry) => entry.glintMillis)).toEqual(
    definition.cases.map((entry) => entry.glintMillis)
  );

  // Two independent native launches decoded every capture identically.
  const [first, second] = manifest.launches;
  expect([first?.name, second?.name]).toEqual(["native-one", "native-two"]);
  expect(first?.captures).toEqual(second?.captures);
  expect(first?.captures.map((entry) => entry.reference)).toEqual(
    manifest.cases.map((entry) => entry.reference.decodedRgbaSha256)
  );

  // Each reference is the item's 32x32 bounds at GUI scale 2.
  for (const entry of manifest.cases) {
    expect(entry.bounds).toEqual([32, 32, 32, 32]);
    expect([entry.reference.width, entry.reference.height]).toEqual([32, 32]);
  }
});

for (const capture of referenceCases) {
  test(`nether star GUI item at glint time ${capture.glintMillis} ms matches its captured reference`, async ({
    page,
  }, testInfo) => {
    const mismatchedPixels = await compareWithCapturedReference(
      page,
      testInfo,
      corpus,
      capture
    );

    expect(
      mismatchedPixels,
      "Every RGBA pixel must match the captured native reference"
    ).toBe(0);
  });
}

test("the nether star comparator fails on a one-pixel change in a temporary copy", async ({
  page,
}, testInfo) => {
  const [capture] = referenceCases;
  expect(capture).toBeDefined();

  if (capture === undefined) {
    return;
  }

  const copy = await mkdtemp(path.join(os.tmpdir(), "grasscn-nether-star-"));

  try {
    await cp(corpus, copy, { recursive: true });
    const file = path.join(copy, capture.reference.file);
    const image = PNG.sync.read(await readFile(file));

    // The centre pixel lies on the star; flip its lowest red bit.
    const pixel = 16 * image.width + 16;
    // oxlint-disable-next-line no-bitwise -- One deliberate one-bit change.
    image.data[pixel * 4] = (image.data[pixel * 4] ?? 0) ^ 1;
    const changed = PNG.sync.write(image);
    await writeFile(file, changed);

    const mismatchedPixels = await compareWithCapturedReference(
      page,
      testInfo,
      copy,
      {
        ...capture,
        reference: { ...capture.reference, sha256: sha256(changed) },
      }
    );

    expect(mismatchedPixels).toBe(1);
  } finally {
    await rm(copy, { force: true, recursive: true });
  }
});
