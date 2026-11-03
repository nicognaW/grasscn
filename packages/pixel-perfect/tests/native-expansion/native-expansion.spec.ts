import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { referenceFile, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

interface NativeExpansionManifest {
  cases: {
    name: string;
    scale: number;
    element: string;
  }[];
}

const expansionReference = process.env.GRASSCN_EXPANSION_REFERENCE ?? "";

const corpora =
  expansionReference === ""
    ? [
        "book",
        "hotbar",
        "hud",
        "hud/meters",
        "sign",
        "player-preview",
        "player-preview/custom-skins",
        "map",
        "map/locator",
        "map/demo-world",
        "trading",
        "trading/scrollbar",
        "player-list",
      ].map((name) => referenceFile(name))
    : [path.resolve(expansionReference)];

const specimens = corpora.flatMap((reference) =>
  // SAFETY: All489cases in the13retained native-expansion manifests emit name, numeric scale and element; an override supplies the same capture-consumer contract at this original read boundary.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact native capture manifest consumer projection; no new validation or generic JSON caster.
  (
    JSON.parse(
      readFileSync(
        pixelPerfectFile(path.join(reference, "manifest.json")),
        "utf-8"
      )
    ) as NativeExpansionManifest
  ).cases.map((sample) => ({ reference, sample }))
);

for (const { reference, sample } of specimens) {
  test(`native expansion pixels ${sample.name}`, async ({ page }, info) => {
    await page.setViewportSize({ height: 900, width: 1536 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      `${process.env.GRASSCN_EXPANSION_URL ?? `${process.env.GRASSCN_FIXTURE_URL ?? "http://127.0.0.1:5174"}/adventure.html`}?scale=${sample.scale}&case=${encodeURIComponent(JSON.stringify(sample))}`
    );
    const subject = page.locator("[data-subject]");
    await expect(subject).toBeVisible();

    if (sample.element === "player-preview") {
      await expect(subject).toHaveAttribute("data-ready", "true");
    }

    if (sample.element === "sign" || sample.element === "hanging-sign") {
      await expect(subject.locator("canvas")).toHaveAttribute(
        "data-ready",
        "true"
      );
    }

    await expect
      .poll(
        async () =>
          await subject
            .locator("img")
            .evaluateAll((images: HTMLImageElement[]) =>
              images.every((image) => image.complete && image.naturalWidth > 0)
            )
      )
      .toBe(true);
    await page.evaluate(async () => await document.fonts.ready);
    await page.waitForTimeout(100);

    const actual = await subject.screenshot();

    const expected = readFileSync(
      pixelPerfectFile(path.join(reference, "captures", sample.name))
    );

    const a = PNG.sync.read(actual);
    const b = PNG.sync.read(expected);

    expect([a.width, a.height]).toEqual([b.width, b.height]);
    let differences = 0;

    const diff = new PNG({ height: a.height, width: a.width });
    const coordinates: unknown[] = [];

    for (let i = 0; i < a.data.length; i += 4) {
      const same = a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4));

      if (!same) {
        differences += 1;

        if (coordinates.length < 20) {
          coordinates.push([
            (i / 4) % a.width,
            Math.floor(i / 4 / a.width),
            [...a.data.subarray(i, i + 4)],
            [...b.data.subarray(i, i + 4)],
          ]);
        }
      }

      diff.data.set(same ? [0, 0, 0, 0] : [255, 0, 255, 255], i);
    }

    writeFileSync(
      info.outputPath("pixels.json"),
      JSON.stringify({
        coordinates,
        mismatchedPixels: differences,
        name: sample.name,
        totalPixels: a.width * a.height,
      })
    );

    if (differences) {
      writeFileSync(info.outputPath("actual.png"), actual);
      writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
    }

    expect(errors).toEqual([]);
    expect(differences).toBe(0);
  });
}
