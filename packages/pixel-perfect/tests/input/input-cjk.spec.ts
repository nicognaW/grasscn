import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import capturedManifest from "../reference/input-cjk/manifest.json";
import type nativeInput from "../reference/input/manifest.json";

// The inferred primary Input protocol includes the optional fields absent from these CJK records.
const manifest: typeof nativeInput = capturedManifest;

const compare = function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  let mismatchedPixels = 0;
  const diff = new PNG({ height: expected.height, width: expected.width });

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

test("Input pixel comparator detects a one-pixel change", async () => {
  const expected = PNG.sync.read(
    await readFile(
      pixelPerfectFile(
        `tests/reference/input-cjk/captures/${manifest.cases[0].name}`
      )
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));
  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const c of manifest.cases) {
  test(`Input native pixels: ${c.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ height: 900, width: 1536 });
    await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));

    const query = new URLSearchParams({
      component: "input",
      placeholder: c.placeholder ?? "",
      scale: String(c.scale),
      state: c.state,
      text: c.text,
      width: String(c.width),
    });

    const caseMaxLength = c.maxLength;

    if (caseMaxLength !== null && caseMaxLength !== undefined) {
      query.set("maxLength", String(caseMaxLength));
    }

    await page.goto(`/?${query}`);
    const input = page.getByRole("textbox", { name: "Test input" });
    await input.evaluate(
      (node, position) => {
        Object.assign((node as HTMLElement).style, {
          left: `${position.x}px`,
          position: "fixed",
          top: `${position.y}px`,
        });
      },
      { x: c.x * c.scale, y: c.y * c.scale }
    );
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute("data-mc-ready", "true");
    await expect(input).toHaveAttribute("data-mc-bitmap", "true");

    if (c.state.startsWith("focus")) {
      await page.keyboard.press("Tab");
      await expect(input).toBeFocused();
    }

    if (c.state === "hover") {
      await input.hover();
    } else {
      await page.mouse.move(0, 0);
    }

    const cursor = c.cursor ?? c.text.length;
    const anchor = c.anchor ?? cursor;

    await input.evaluate(
      (node, selection) => {
        const inputElement = node as HTMLInputElement;
        inputElement.setSelectionRange(
          Math.min(selection.cursor, selection.anchor),
          Math.max(selection.cursor, selection.anchor),
          selection.cursor < selection.anchor ? "backward" : "forward"
        );
      },
      { anchor, cursor }
    );
    await page.clock.runFor(c.caretMs);
    await expect(input).toHaveAttribute("data-mc-ready", "true");

    const expectedBytes = await readFile(
      pixelPerfectFile(`tests/reference/input-cjk/captures/${c.name}`)
    );

    expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
      c.sha256
    );
    const actualBytes = await input.screenshot({ animations: "disabled" });

    const actual = PNG.sync.read(actualBytes);
    const expected = PNG.sync.read(expectedBytes);

    const { diff, mismatchedPixels } = compare(expected, actual);
    await writeFile(testInfo.outputPath("actual.png"), actualBytes);
    await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
    await writeFile(
      testInfo.outputPath("metrics.json"),
      JSON.stringify(
        {
          case: c.name,
          mismatchedPixels,
          tolerance: 0,
          totalPixels: expected.width * expected.height,
        },
        null,
        2
      )
    );
    expect(mismatchedPixels).toBe(0);
  });
}
