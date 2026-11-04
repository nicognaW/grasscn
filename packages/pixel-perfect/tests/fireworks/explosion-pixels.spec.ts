// Pixel Perfect Tests against the projected firework references (ADR 0005):
// every tick-aligned explosion frame (partialTick 0) at the fixed particle
// seed. Only the pixels the particles covered in the native frame are
// compared, at zero tolerance and DPR 1; the backdrop is a declared web
// adaptation.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { test, expect } from "@grasscn/tests/test";
import type { Page, TestInfo } from "@playwright/test";
import { compareMasked } from "@ppt/harness/projected-reference";
import { projectedFireworkManifestSchema } from "@ppt/native/projected-firework-case";
import type { ProjectedFireworkManifest } from "@ppt/native/projected-firework-case";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const corpus = pixelPerfectFile("tests/reference/fireworks");

const JAR_SHA256 =
  "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const manifest = projectedFireworkManifestSchema.parse(
  JSON.parse(readFileSync(path.join(corpus, "manifest.json"), "utf-8"))
);

type FireworkFrame = ProjectedFireworkManifest["frames"][number];

const crop = (
  image: PNG,
  bounds: { height: number; width: number; x: number; y: number }
) => {
  const data = new Uint8Array(bounds.width * bounds.height * 4);

  for (let row = 0; row < bounds.height; row += 1) {
    const start = ((bounds.y + row) * image.width + bounds.x) * 4;
    data.set(
      image.data.subarray(start, start + bounds.width * 4),
      row * bounds.width * 4
    );
  }

  return data;
};

/** Compares the fixture-rendered explosion frame with one projected reference. */
const compareWithProjectedReference = async (
  page: Page,
  testInfo: TestInfo,
  root: string,
  frame: FireworkFrame
) => {
  const referenceBytes = await readFile(path.join(root, frame.reference.file));
  const maskBytes = await readFile(path.join(root, frame.mask.file));

  expect(sha256(referenceBytes)).toBe(frame.reference.sha256);
  expect(sha256(maskBytes)).toBe(frame.mask.sha256);

  const expected = PNG.sync.read(referenceBytes);
  const mask = PNG.sync.read(maskBytes);

  expect([expected.width, expected.height]).toEqual([
    frame.bounds.width,
    frame.bounds.height,
  ]);

  const covered = Uint8Array.from(
    { length: mask.width * mask.height },
    (_, pixel) => (mask.data[pixel * 4 + 3] === 255 ? 1 : 0)
  );

  expect(covered.reduce((sum, value) => sum + value, 0)).toBe(
    frame.coveredPixels
  );

  await page.goto(
    `/firework-explosion.html?${new URLSearchParams({ tick: String(frame.tick) })}`
  );
  const subject = page.locator("[data-subject][data-rendered='true']");
  await expect(subject).toBeVisible();

  const actualBytes = await subject.screenshot({ animations: "disabled" });
  const scene = PNG.sync.read(actualBytes);
  expect([scene.width, scene.height]).toEqual([
    manifest.backdropFrame.width,
    manifest.backdropFrame.height,
  ]);

  const actual = crop(scene, frame.bounds);
  const result = compareMasked(actual, expected.data, covered);
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
        reference: path.join(root, frame.reference.file),
        tick: frame.tick,
        tolerance: 0,
        totalPixels: result.totalPixels,
      },
      null,
      2
    )
  );

  return result;
};

test("firework explosion projected references are bound to their native capture", async () => {
  expect(sha256(await readFile(path.join(corpus, "case.json")))).toBe(
    manifest.caseDefinitionSha256
  );

  for (const file of [
    ...manifest.harnessSources,
    manifest.randomSequences,
    manifest.backdropFrame,
  ]) {
    // oxlint-disable-next-line no-await-in-loop -- Frozen corpus files in declared order.
    expect(sha256(await readFile(path.join(corpus, file.file)))).toBe(
      file.sha256
    );
  }

  expect(manifest.sourceJar.sha256).toBe(JAR_SHA256);
  expect(manifest.launches.map((launch) => launch.name)).toEqual([
    "native-one",
    "native-two",
  ]);

  // Every tick from the first visible frame to the end is either compared
  // or recorded as showing no particle pixel.
  const ticks = [
    ...manifest.frames.map((frame) => frame.tick),
    ...manifest.emptyTicks,
  ].toSorted((a, b) => a - b);

  expect(ticks).toEqual(
    Array.from({ length: manifest.tickRange.last }, (_, index) => index + 1)
  );
});

for (const frame of manifest.frames) {
  test(`firework explosion tick ${frame.tick} matches its projected reference within the particle mask`, async ({
    page,
  }, testInfo) => {
    const result = await compareWithProjectedReference(
      page,
      testInfo,
      corpus,
      frame
    );

    expect(
      result.mismatchedPixels,
      "Every masked RGBA pixel must match the projected native reference"
    ).toBe(0);
  });
}

test("the projected firework comparator fails on a one-pixel change in a temporary copy", async ({
  page,
}, testInfo) => {
  const [frame] = manifest.frames;
  expect(frame).toBeDefined();

  if (frame === undefined) {
    return;
  }

  const copy = await mkdtemp(path.join(os.tmpdir(), "grasscn-firework-"));

  try {
    await cp(corpus, copy, { recursive: true });
    const file = path.join(copy, frame.reference.file);
    const image = PNG.sync.read(await readFile(file));

    // The first covered pixel of the native mask; flip its lowest red bit.
    const mask = PNG.sync.read(
      await readFile(path.join(copy, frame.mask.file))
    );

    const pixel = Array.from({ length: mask.width * mask.height }).findIndex(
      (_, index) => mask.data[index * 4 + 3] === 255
    );

    // oxlint-disable-next-line no-bitwise -- One deliberate one-bit change.
    image.data[pixel * 4] = (image.data[pixel * 4] ?? 0) ^ 1;
    const changed = PNG.sync.write(image);
    await writeFile(file, changed);

    const result = await compareWithProjectedReference(page, testInfo, copy, {
      ...frame,
      reference: { ...frame.reference, sha256: sha256(changed) },
    });

    expect(result.mismatchedPixels).toBe(1);
  } finally {
    await rm(copy, { force: true, recursive: true });
  }
});
