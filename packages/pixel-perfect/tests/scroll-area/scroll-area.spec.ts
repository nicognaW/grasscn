import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { minecraftTextareaAssets } from "@grasscn/web/ui/minecraft-textarea-assets";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const manifest = JSON.parse(
  readFileSync(
    pixelPerfectFile("tests/reference/scroll-area/manifest.json"),
    "utf-8"
  )
) as {
  cases: {
    name: string;
    width: number;
    height: number;
    scale: number;
    background: string;
    contentHeight: number;
    value: number;
    state: string;
    sha256: string;
  }[];
};

const compare = function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ height: expected.height, width: expected.width });
  let mismatchedPixels = 0;

  for (let i = 0; i < expected.data.length; i += 4) {
    const mismatch = !actual.data
      .subarray(i, i + 4)
      .equals(expected.data.subarray(i, i + 4));

    mismatchedPixels += Number(mismatch);
    diff.data.set(
      mismatch
        ? [255, 0, 255, 255]
        : [
            Math.floor(expected.data[i] / 4),
            Math.floor(expected.data[i + 1] / 4),
            Math.floor(expected.data[i + 2] / 4),
            255,
          ],
      i
    );
  }

  return { diff, mismatchedPixels };
};

test("ScrollArea comparator catches a one-pixel change", async () => {
  const expected = PNG.sync.read(
    await readFile(
      pixelPerfectFile(
        `tests/reference/scroll-area/captures/${manifest.cases[0].name}`
      )
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const c of manifest.cases) {
  test(`ScrollArea native pixels: ${c.name}`, async ({ page }, testInfo) => {
    const query = new URLSearchParams({
      component: "scroll-area",
      contentHeight: String(c.contentHeight),
      height: String(c.height),
      scale: String(c.scale),
      scroll: String(c.value),
      state: c.state,
      width: String(c.width),
    });

    await page.goto(`/?${query}`);
    await page.mouse.move(0, 0);
    const card = page.locator('[data-slot="scroll-area"]');
    await expect(card).toHaveAttribute("data-mc-scroll-ready", "true");
    const viewport = card.locator('[data-slot="scroll-area-viewport"]');
    await expect
      .poll(async () => viewport.evaluate((node) => node.scrollTop))
      .toBe(c.value * c.scale);

    if (c.state === "focus") {
      await viewport.focus();
    }

    if (c.state === "hover") {
      await card.locator('[data-slot="scroll-area-scrollbar"]').hover();
    }

    const expectedBytes = await readFile(
      pixelPerfectFile(`tests/reference/scroll-area/captures/${c.name}`)
    );

    expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
      c.sha256
    );
    const actualBytes = await card.screenshot({ animations: "disabled" });

    const { diff, mismatchedPixels } = compare(
      PNG.sync.read(expectedBytes),
      PNG.sync.read(actualBytes)
    );

    await writeFile(testInfo.outputPath("actual.png"), actualBytes);
    await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
    await writeFile(
      testInfo.outputPath("metrics.json"),
      JSON.stringify(
        {
          case: c.name,
          mismatchedPixels,
          tolerance: 0,
          totalPixels: c.width * c.height * c.scale * c.scale,
        },
        null,
        2
      )
    );
    expect(mismatchedPixels).toBe(0);
  });
}

test("ScrollArea retains original scroller PNG bytes and nine-slice metadata", () => {
  const provenance = JSON.parse(
    readFileSync(
      pixelPerfectFile("tests/reference/scroll-area/asset-provenance.json"),
      "utf-8"
    )
  );

  for (const name of ["scroller", "scroller_background"] as const) {
    const bytes = Buffer.from(
      minecraftTextareaAssets[name].split(",")[1],
      "base64"
    );

    const source =
      provenance.sources[
        `assets/minecraft/textures/gui/sprites/widget/${name}.png`
      ];

    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      source.sha256
    );
    expect(source.scaling).toEqual({
      border: 1,
      height: 32,
      type: "nine_slice",
      width: 6,
    });
  }
});

for (const scale of [1, 2, 3]) {
  test(`ScrollArea asChild retains native pixels at scale ${scale}`, async ({
    page,
  }, testInfo) => {
    const c = manifest.cases.find(
      (c) => c.name === `scroll-area-c67-s${scale}.png`
    )!;

    await page.goto(
      `/?component=scroll-area&width=${c.width}&height=${c.height}&contentHeight=${c.contentHeight}&scroll=${c.value}&scale=${scale}&asChild=1&defaults=1`
    );
    const subject = page.locator("section[data-subject]");
    await expect(subject).toHaveAttribute("data-mc-scroll-ready", "true");
    await expect
      .poll(async () =>
        subject
          .locator('[data-slot="scroll-area-viewport"]')
          .evaluate((node) => node.scrollTop)
      )
      .toBe(c.value * scale);

    const expected = PNG.sync.read(
      await readFile(
        pixelPerfectFile(`tests/reference/scroll-area/captures/${c.name}`)
      )
    );

    const actualBytes = await subject.screenshot();
    await writeFile(testInfo.outputPath("actual.png"), actualBytes);
    await writeFile(
      testInfo.outputPath("metrics.json"),
      JSON.stringify({
        alias: "asChild",
        case: c.name,
        component: "scroll-area",
        manifest: "tests/reference/scroll-area/manifest.json",
        part: "surface",
      })
    );
    expect(compare(expected, PNG.sync.read(actualBytes)).mismatchedPixels).toBe(
      0
    );
  });
}
