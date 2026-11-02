import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

interface NativeCase {
  name: string;
  text: string;
  placeholder?: string;
  state: string;
  width: number;
  height: number;
  scale: number;
  x: number;
  y: number;
  value?: number;
  cursor?: number;
  anchor?: number;
  caretMs: number;
  sha256: string;
  referenceDirectory: string;
}

const manifest = {
  cases: ["textarea", "textarea-cjk"].flatMap((directory) =>
    (
      JSON.parse(
        readFileSync(
          pixelPerfectFile(`tests/reference/${directory}/manifest.json`),
          "utf-8"
        )
      ).cases as NativeCase[]
    ).map((c) => ({ ...c, referenceDirectory: directory }))
  ),
};

const compare = function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  const diff = new PNG({ height: expected.height, width: expected.width });
  let mismatchedPixels = 0;

  for (let i = 0; i < expected.data.length; i += 4) {
    const different = !actual.data
      .subarray(i, i + 4)
      .equals(expected.data.subarray(i, i + 4));

    mismatchedPixels += Number(different);
    diff.data.set(
      different
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

test("Textarea comparator catches a one-pixel mutation", async () => {
  const expected = PNG.sync.read(
    await readFile(
      pixelPerfectFile(
        `tests/reference/textarea/captures/${manifest.cases[0].name}`
      )
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));
  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const c of manifest.cases) {
  test(`Textarea native pixels: ${c.name}`, async ({ page }, testInfo) => {
    if (c.referenceDirectory === "textarea-cjk") {
      await page.setViewportSize({ width: 1536, height: 900 });
    }

    await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));
    await page.goto(
      `/?${new URLSearchParams({ component: "textarea", height: String(c.height), placeholder: c.placeholder ?? "", scale: String(c.scale), state: c.state, text: c.text, width: String(c.width) })}`
    );
    const area = page.getByRole("textbox", { name: "Test textarea" });

    if (c.referenceDirectory === "textarea-cjk") {
      await area.evaluate(
        (node, position) => {
          Object.assign((node as HTMLElement).style, {
            left: `${position.x}px`,
            position: "fixed",
            top: `${position.y}px`,
          });
        },
        { x: c.x * c.scale, y: c.y * c.scale }
      );
      await expect(area).toHaveAttribute("data-mc-bitmap", "true");
    }

    await expect(area).toHaveAttribute("data-mc-ready", "true");

    if (c.state.startsWith("focus")) {
      await page.keyboard.press("Tab");
      await expect(area).toBeFocused();
    }

    await page.mouse.move(0, 0);
    await area.evaluate(
      (node, settings) => {
        const area = node as HTMLTextAreaElement;
        area.setSelectionRange(
          Math.min(settings.cursor, settings.anchor),
          Math.max(settings.cursor, settings.anchor),
          settings.cursor < settings.anchor ? "backward" : "forward"
        );
        area.scrollTop = settings.scroll;
      },
      {
        anchor: c.anchor ?? c.cursor ?? c.text.length,
        cursor: c.cursor ?? c.text.length,
        scroll: (c.value ?? 0) * c.scale,
      }
    );
    await page.clock.runFor(c.caretMs);

    const expectedBytes = await readFile(
      pixelPerfectFile(
        `tests/reference/${c.referenceDirectory}/captures/${c.name}`
      )
    );

    expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
      c.sha256
    );

    const actualBytes = await area.screenshot({ animations: "disabled" });
    const actual = PNG.sync.read(actualBytes);
    const expected = PNG.sync.read(expectedBytes);

    const { diff, mismatchedPixels } = compare(expected, actual);
    await writeFile(testInfo.outputPath("actual.png"), actualBytes);
    await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
    await writeFile(
      testInfo.outputPath("metrics.json"),
      JSON.stringify({ case: c.name, mismatchedPixels, tolerance: 0 }, null, 2)
    );
    expect(mismatchedPixels).toBe(0);
  });
}
