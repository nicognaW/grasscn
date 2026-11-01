import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectRoot } from "@ppt/paths";
import {
  parseNativeManifest,
  nativeReference,
} from "@ppt/runtime/docs-reference-types";
import { evidenceFile } from "@ppt/runtime/evidence-paths";
import { PNG } from "pngjs";

const comparePixels = (actual: PNG, expected: PNG) => {
  let mismatchedPixels = 0;
  const diff = new PNG({ height: actual.height, width: actual.width });

  for (let i = 0; i < actual.data.length; i += 4) {
    const different = !actual.data
      .subarray(i, i + 4)
      .equals(expected.data.subarray(i, i + 4));

    mismatchedPixels += Number(different);
    diff.data.set(
      different
        ? [255, 0, 255, 255]
        : [
            // eslint-disable-next-line no-bitwise -- Preserve the established exact byte operation for one-pixel negative controls or diagnostic RGBA shading.
            expected.data[i] >> 2,
            // eslint-disable-next-line no-bitwise -- Preserve the established exact byte operation for one-pixel negative controls or diagnostic RGBA shading.
            expected.data[i + 1] >> 2,
            // eslint-disable-next-line no-bitwise -- Preserve the established exact byte operation for one-pixel negative controls or diagnostic RGBA shading.
            expected.data[i + 2] >> 2,
            255,
          ],
      i
    );
  }

  return { diff, mismatchedPixels };
};

const cases = [
  {
    family: "docs-input-defaults/native-a",
    file: "docs-slider-volume-50-s2.png",
    label: "Volume",
    name: "slider",
    role: "slider",
  },
  {
    family: "controls",
    file: "checkbox-unchecked-normal-s2.png",
    label: "Enable shadows",
    name: "checkbox",
    role: "checkbox",
  },
  {
    family: "input",
    file: "input-w200-normal-c39-s2.png",
    label: "Player name",
    name: "input",
    role: "textbox",
  },
  {
    family: "textarea",
    file: "textarea-c18-s2.png",
    label: "Journey notes",
    name: "textarea",
    role: "textbox",
  },
  {
    family: "select",
    file: "select-c70-s2.png",
    label: "Game mode",
    name: "select",
    role: "combobox",
  },
  {
    family: "radio-group",
    file: "radio-group-c8-s2.png",
    label: "Survival",
    name: "radio-group",
    role: "radio",
  },
  {
    family: "switch",
    file: "switch-c16-s2.png",
    label: "Enable clouds",
    name: "switch",
    role: "switch",
  },
] as const;

for (const c of cases) {
  test(`Input docs native default: ${c.name}`, async ({ page }, info) => {
    const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";
    await page.setViewportSize({ height: 900, width: 1536 });
    await page.mouse.move(0, 0);
    await page.goto(`${origin}/docs/components/${c.name}`);
    const example = page.locator(".documentation-example").first();

    const subject =
      c.name === "slider"
        ? example.locator('[data-slot="slider"]')
        : example.getByRole(c.role, { exact: true, name: c.label });

    await expect(subject).toBeVisible();

    if (c.name === "input" || c.name === "textarea") {
      await expect(subject).toHaveAttribute("data-mc-ready", "true");
    }

    if (c.name === "select") {
      await expect(subject).toHaveAttribute("data-mc-select-ready", "true");
    }

    const referencePath = evidenceFile(
      `tests/reference/${c.family}/captures/${c.file}`,
      pixelPerfectRoot
    );

    const referenceBytes = await readFile(referencePath);

    const manifest = parseNativeManifest(
      await readFile(
        evidenceFile(
          `tests/reference/${c.family}/manifest.json`,
          pixelPerfectRoot
        ),
        "utf-8"
      )
    );

    const record = nativeReference(manifest, c.file);
    expect(createHash("sha256").update(referenceBytes).digest("hex")).toBe(
      record.sha256
    );
    const actualBytes = await subject.screenshot({ animations: "disabled" });
    await writeFile(info.outputPath("actual.png"), actualBytes);

    const expected = PNG.sync.read(referenceBytes);
    const actual = PNG.sync.read(actualBytes);

    expect([actual.width, actual.height]).toEqual([
      expected.width,
      expected.height,
    ]);

    if (c.name === "slider") {
      const mutated = PNG.sync.read(referenceBytes);
      // eslint-disable-next-line no-bitwise -- Preserve the established exact byte operation for one-pixel negative controls or diagnostic RGBA shading.
      mutated.data[0] ^= 1;
      expect(comparePixels(mutated, expected).mismatchedPixels).toBe(1);
    }

    const { mismatchedPixels, diff } = comparePixels(actual, expected);
    await writeFile(info.outputPath("diff.png"), PNG.sync.write(diff));
    await writeFile(
      info.outputPath("metrics.json"),
      JSON.stringify({
        mismatchedPixels,
        referencePath,
        referenceSha256: record.sha256,
        totalPixels: actual.width * actual.height,
      })
    );
    expect(mismatchedPixels).toBe(0);
  });
}
