import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import type { Locator, TestInfo } from "@grasscn/pixel-perfect/test";
import { parseNavigationManifest } from "@ppt/runtime/docs-reference-types";
import { PNG } from "pngjs";

const website = (
  process.env.GRASSCN_WEBSITE_URL ??
  process.env.GRASSCN_PREVIEW_URL ??
  "http://127.0.0.1:5176"
).replace(/\/$/u, "");

const family = new URL(
  "../../reference/next-docs-navigation/",
  import.meta.url
);

const manifest = parseNavigationManifest(
  readFileSync(new URL("native-a/manifest.json", family), "utf-8")
);

const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const compareNative = async (
  subject: Locator,
  name: string,
  info: TestInfo
) => {
  const reference = manifest.cases.find((item) => item.name === name);

  if (!reference) {
    throw new Error(`Missing declared native case: ${name}`);
  }

  expect(manifest.sourceJarSha256).toBe(
    "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290"
  );
  expect(
    digest(
      await readFile(
        new URL("native-a/source/ControlsReferenceMain.java", family)
      )
    )
  ).toBe(manifest.captureSourceSha256);
  expect(digest(await readFile(new URL("cases.json", family)))).toBe(
    manifest.caseDefinitionSha256
  );

  const expectedBytes = await readFile(
    new URL(`native-a/captures/${name}`, family)
  );

  expect(digest(expectedBytes)).toBe(reference.sha256);
  const expected = PNG.sync.read(expectedBytes);
  const actualBytes = await subject.screenshot({ animations: "disabled" });
  const actual = PNG.sync.read(actualBytes);
  await writeFile(info.outputPath("actual.png"), actualBytes);
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ height: expected.height, width: expected.width });
  let mismatchedPixels = 0;

  for (let index = 0; index < expected.data.length; index += 4) {
    const mismatch = !actual.data
      .subarray(index, index + 4)
      .equals(expected.data.subarray(index, index + 4));

    mismatchedPixels += Number(mismatch);
    diff.data.set(
      mismatch
        ? [255, 0, 255, 255]
        : [
            // eslint-disable-next-line no-bitwise -- Preserve the established exact byte operation for one-pixel negative controls or diagnostic RGBA shading.
            expected.data[index] >> 2,
            // eslint-disable-next-line no-bitwise -- Preserve the established exact byte operation for one-pixel negative controls or diagnostic RGBA shading.
            expected.data[index + 1] >> 2,
            // eslint-disable-next-line no-bitwise -- Preserve the established exact byte operation for one-pixel negative controls or diagnostic RGBA shading.
            expected.data[index + 2] >> 2,
            255,
          ],
      index
    );
  }

  await writeFile(info.outputPath("diff.png"), PNG.sync.write(diff));
  await writeFile(
    info.outputPath("metrics.json"),
    JSON.stringify(
      {
        browserVersion: subject.page().context().browser()?.version(),
        captureSourceSha256: manifest.captureSourceSha256,
        case: name,
        devicePixelRatio: await subject
          .page()
          .evaluate(() => window.devicePixelRatio),
        minecraftVersion: manifest.minecraftVersion,
        mismatchedPixels,
        referenceSha256: reference.sha256,
        renderedUrl: subject.page().url(),
        sourceJarSha256: manifest.sourceJarSha256,
        tolerance: 0,
        totalPixels: expected.width * expected.height,
        viewport: subject.page().viewportSize(),
      },
      null,
      2
    )
  );
  expect(mismatchedPixels).toBe(0);
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.clock.install({ time: new Date("2026-11-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-11-01T00:00:01Z"));
  await page.goto(`${website}/docs`);
  await page.mouse.move(0, 0);
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(1);
});

test("documentation search placeholder matches its captured Minecraft input", async ({
  page,
}, info) => {
  const input = page.getByRole("combobox", { name: "Search documentation" });
  await expect(input).toHaveAttribute("data-mc-ready", "true");
  await compareNative(input, "docs-search-empty-s2.png", info);
});

test("documentation prose search typing matches its captured Minecraft input", async ({
  page,
}, info) => {
  const input = page.getByRole("combobox", { name: "Search documentation" });
  await page.keyboard.press("Control+k");
  await expect(input).toBeFocused();
  await input.fill("hear");
  // Typing happens after the painter mounts: allow its next frame, still in the caret-on phase.
  await page.clock.runFor(16);
  await expect(input).toHaveAttribute("data-mc-ready", "true");
  await compareNative(input, "docs-search-hear-s2.png", info);
});
