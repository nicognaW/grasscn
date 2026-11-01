import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { PNG } from "pngjs";

import { pixelPerfectTest as test, expect } from "./verified-test";

function compare(actual: PNG, expected: PNG) {
  if (actual.width !== expected.width || actual.height !== expected.height)
    throw Error("Native reference dimensions differ");
  const diff = new PNG({ width: actual.width, height: actual.height });
  let differentPixels = 0;
  for (let offset = 0; offset < actual.data.length; offset += 4) {
    if (
      !actual.data
        .subarray(offset, offset + 4)
        .equals(expected.data.subarray(offset, offset + 4))
    ) {
      differentPixels++;
      diff.data.set([255, 0, 0, 255], offset);
    }
  }
  return { differentPixels, diff };
}

test("default documentation code controls match their Minecraft reference cases", async ({
  page,
}, info) => {
  const records: {
    reference: string;
    differentPixels: number;
    totalPixels: number;
  }[] = [];
  let probe = false;
  async function pixels(
    bytes: Buffer,
    name: string,
    family = "docs-code-controls"
  ) {
    const referenceURL = new URL(
      `./reference/${family}/captures/${name}-s2.png`,
      import.meta.url
    );
    const referenceBytes = await readFile(referenceURL);
    const manifest = JSON.parse(
      await readFile(
        new URL(`./reference/${family}/manifest.json`, import.meta.url),
        "utf8"
      )
    );
    expect(createHash("sha256").update(referenceBytes).digest("hex")).toBe(
      manifest.cases.find(
        (entry: { name: string }) => entry.name === `${name}-s2.png`
      ).sha256
    );
    const expected = PNG.sync.read(referenceBytes);
    if (!probe) {
      const corrupted = PNG.sync.read(referenceBytes);
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
      reference: `${family}/${name}-s2.png`,
      differentPixels: result.differentPixels,
      totalPixels: actual.width * actual.height,
    });
    await writeFile(
      info.outputPath("docs-native-pixels.json"),
      JSON.stringify(
        { onePixelCorruptionDetected: probe, cases: records },
        null,
        2
      )
    );
    expect(result.differentPixels, name).toBe(0);
  }

  await page.goto(
    `${process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176"}/docs/components/button`
  );
  const example = page.getByRole("region", {
    name: "Button example",
    exact: true,
  });
  const tabs = example.getByRole("tablist");
  await expect(tabs).toHaveAttribute("data-mc-tabs-ready", "true");
  await page.mouse.move(0, 0);
  await pixels(await tabs.screenshot(), "docs-tabs-preview");
  await example.getByRole("tab", { name: "Preview", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(
    example.getByRole("tab", { name: "Code", exact: true })
  ).toHaveAttribute("aria-selected", "true");
  await pixels(await tabs.screenshot(), "docs-tabs-code-focus");
  await pixels(
    await example
      .getByRole("button", { name: "Copy", exact: true })
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
  if (!bounds) throw Error("The executable directive is unavailable");
  await pixels(
    await page.screenshot({
      clip: {
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: 200,
        height: 18,
      },
    }),
    "docs-code-directive-semicolon",
    "docs-code-directive"
  );

  const implementation = page.getByRole("region", {
    name: "Button implementation source",
    exact: true,
  });
  const expand = implementation.getByRole("button", {
    name: "Expand",
    exact: true,
  });
  await pixels(await expand.screenshot(), "docs-expand");
  await expand.click();
  await page.mouse.move(0, 0);
  await pixels(
    await implementation
      .getByRole("button", { name: "Collapse", exact: true })
      .screenshot(),
    "docs-collapse"
  );
});
