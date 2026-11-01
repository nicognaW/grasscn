import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import {
  parseNativeManifest,
  nativeReference,
} from "@ppt/runtime/docs-reference-types";
import { PNG } from "pngjs";

const compare = (actual: PNG, expected: PNG) => {
  if (actual.width !== expected.width || actual.height !== expected.height) {
    throw new Error("Native reference dimensions differ");
  }

  const diff = new PNG({ height: actual.height, width: actual.width });
  let differentPixels = 0;

  for (let offset = 0; offset < actual.data.length; offset += 4) {
    if (
      !actual.data
        .subarray(offset, offset + 4)
        .equals(expected.data.subarray(offset, offset + 4))
    ) {
      differentPixels += 1;
      diff.data.set([255, 0, 0, 255], offset);
    }
  }

  return { diff, differentPixels };
};

test("default documentation code controls match their Minecraft reference cases", async ({
  page,
}, info) => {
  const records: {
    reference: string;
    differentPixels: number;
    totalPixels: number;
  }[] = [];

  let probe = false;

  const pixels = async (
    bytes: Buffer,
    name: string,
    family = "docs-code-controls"
  ) => {
    const referenceURL = new URL(
      `../../reference/${family}/captures/${name}-s2.png`,
      import.meta.url
    );

    const referenceBytes = await readFile(referenceURL);

    const manifest = parseNativeManifest(
      await readFile(
        new URL(`../../reference/${family}/manifest.json`, import.meta.url),
        "utf-8"
      )
    );

    expect(createHash("sha256").update(referenceBytes).digest("hex")).toBe(
      nativeReference(manifest, `${name}-s2.png`).sha256
    );
    const expected = PNG.sync.read(referenceBytes);

    if (!probe) {
      const corrupted = PNG.sync.read(referenceBytes);
      // eslint-disable-next-line no-bitwise -- Preserve the established exact byte operation for one-pixel negative controls or diagnostic RGBA shading.
      corrupted.data[0] ^= 1;
      expect(compare(corrupted, expected).differentPixels).toBe(1);
      probe = true;
    }

    const actual = PNG.sync.read(bytes);
    const result = compare(actual, expected);
    await writeFile(info.outputPath(`${name}-actual.png`), bytes);
    await writeFile(
      info.outputPath(`${name}-diff.png`),
      PNG.sync.write(result.diff)
    );
    records.push({
      differentPixels: result.differentPixels,
      reference: `${family}/${name}-s2.png`,
      totalPixels: actual.width * actual.height,
    });
    await writeFile(
      info.outputPath("docs-native-pixels.json"),
      JSON.stringify(
        { cases: records, onePixelCorruptionDetected: probe },
        null,
        2
      )
    );
    expect(result.differentPixels, name).toBe(0);
  };

  await page.goto(
    `${process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176"}/docs/components/button`
  );

  const example = page.getByRole("region", {
    exact: true,
    name: "Button example",
  });

  const tabs = example.getByRole("tablist");
  await expect(tabs).toHaveAttribute("data-mc-tabs-ready", "true");
  await page.mouse.move(0, 0);
  await pixels(await tabs.screenshot(), "docs-tabs-preview");
  await example.getByRole("tab", { exact: true, name: "Preview" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(
    example.getByRole("tab", { exact: true, name: "Code" })
  ).toHaveAttribute("aria-selected", "true");
  await pixels(await tabs.screenshot(), "docs-tabs-code-focus");
  await pixels(
    await example
      .getByRole("button", { exact: true, name: "Copy" })
      .screenshot(),
    "docs-copy"
  );

  const directive = example.locator(".documentation-code-line").first();
  await expect(
    directive
      .locator(".mc-code-token")
      .filter({ hasText: '"use client"' })
      .first()
  ).toHaveCSS("color", "rgb(85, 255, 85)");
  await directive.scrollIntoViewIfNeeded();
  const bounds = await directive.boundingBox();

  if (!bounds) {
    throw new Error("The executable directive is unavailable");
  }

  await pixels(
    await page.screenshot({
      clip: {
        height: 18,
        width: 200,
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
      },
    }),
    "docs-code-directive-semicolon",
    "docs-code-directive"
  );

  const implementation = page.getByRole("region", {
    exact: true,
    name: "Button implementation source",
  });

  const expand = implementation.getByRole("button", {
    exact: true,
    name: "Expand",
  });

  await pixels(await expand.screenshot(), "docs-expand");
  await expand.click();
  await page.mouse.move(0, 0);
  await pixels(
    await implementation
      .getByRole("button", { exact: true, name: "Collapse" })
      .screenshot(),
    "docs-collapse"
  );
});
