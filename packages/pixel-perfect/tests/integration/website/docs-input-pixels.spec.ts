import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { PNG } from "pngjs";

import { resolveRepositoryPath, pixelPerfectRoot } from "@ppt/paths";
import { test, expect } from "@grasscn/pixel-perfect/test";
function comparePixels(actual: PNG, expected: PNG) {
  let mismatchedPixels = 0;
  const diff = new PNG({ width: actual.width, height: actual.height });
  for (let i = 0; i < actual.data.length; i += 4) {
    const different = !actual.data
      .subarray(i, i + 4)
      .equals(expected.data.subarray(i, i + 4));
    mismatchedPixels += Number(different);
    diff.data.set(
      different
        ? [255, 0, 255, 255]
        : [
            expected.data[i] >> 2,
            expected.data[i + 1] >> 2,
            expected.data[i + 2] >> 2,
            255,
          ],
      i
    );
  }
  return { mismatchedPixels, diff };
}
const cases = [
  {
    name: "slider",
    role: "slider",
    label: "Volume",
    family: "docs-input-defaults/native-a",
    file: "docs-slider-volume-50-s2.png",
  },
  {
    name: "checkbox",
    role: "checkbox",
    label: "Enable shadows",
    family: "controls",
    file: "checkbox-unchecked-normal-s2.png",
  },
  {
    name: "input",
    role: "textbox",
    label: "Player name",
    family: "input",
    file: "input-w200-normal-c39-s2.png",
  },
  {
    name: "textarea",
    role: "textbox",
    label: "Journey notes",
    family: "textarea",
    file: "textarea-c18-s2.png",
  },
  {
    name: "select",
    role: "combobox",
    label: "Game mode",
    family: "select",
    file: "select-c70-s2.png",
  },
  {
    name: "radio-group",
    role: "radio",
    label: "Survival",
    family: "radio-group",
    file: "radio-group-c8-s2.png",
  },
  {
    name: "switch",
    role: "switch",
    label: "Enable clouds",
    family: "switch",
    file: "switch-c16-s2.png",
  },
] as const;
for (const c of cases)
  test(`Input docs native default: ${c.name}`, async ({ page }, info) => {
    const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";
    await page.setViewportSize({ width: 1536, height: 900 });
    await page.mouse.move(0, 0);
    await page.goto(`${origin}/docs/components/${c.name}`);
    const example = page.locator(".documentation-example").first();
    const subject =
      c.name === "slider"
        ? example.locator('[data-slot="slider"]')
        : example.getByRole(c.role, { name: c.label, exact: true });
    await expect(subject).toBeVisible();
    if (c.name === "input" || c.name === "textarea")
      await expect(subject).toHaveAttribute("data-mc-ready", "true");
    if (c.name === "select")
      await expect(subject).toHaveAttribute("data-mc-select-ready", "true");
    const referencePath = resolveRepositoryPath(
      `tests/reference/${c.family}/captures/${c.file}`,
      pixelPerfectRoot
    );
    const referenceBytes = await readFile(referencePath);
    const manifest = JSON.parse(
      await readFile(
        resolveRepositoryPath(
          `tests/reference/${c.family}/manifest.json`,
          pixelPerfectRoot
        ),
        "utf8"
      )
    );
    const record = manifest.cases.find(
      (entry: { name: string }) => entry.name === c.file
    );
    expect(createHash("sha256").update(referenceBytes).digest("hex")).toBe(
      record.sha256
    );
    const actualBytes = await subject.screenshot({ animations: "disabled" });
    await writeFile(info.outputPath("actual.png"), actualBytes);
    const expected = PNG.sync.read(referenceBytes),
      actual = PNG.sync.read(actualBytes);
    expect([actual.width, actual.height]).toEqual([
      expected.width,
      expected.height,
    ]);
    if (c.name === "slider") {
      const mutated = PNG.sync.read(referenceBytes);
      mutated.data[0] ^= 1;
      expect(comparePixels(mutated, expected).mismatchedPixels).toBe(1);
    }
    const { mismatchedPixels, diff } = comparePixels(actual, expected);
    await writeFile(info.outputPath("diff.png"), PNG.sync.write(diff));
    await writeFile(
      info.outputPath("metrics.json"),
      JSON.stringify({
        referencePath,
        referenceSha256: record.sha256,
        mismatchedPixels,
        totalPixels: actual.width * actual.height,
      })
    );
    expect(mismatchedPixels).toBe(0);
  });
