import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const directory = "tests/reference/dialog";

const manifest = JSON.parse(
  readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
);

function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);

  const left = new Uint32Array(
    expected.data.buffer,
    expected.data.byteOffset,
    expected.data.length / 4
  );

  const right = new Uint32Array(
    actual.data.buffer,
    actual.data.byteOffset,
    actual.data.length / 4
  );

  const diff = new PNG({ height: expected.height, width: expected.width });
  let mismatchedPixels = 0;

  for (let i = 0; i < left.length; i += 1) {
    const mismatch = left[i] !== right[i];
    mismatchedPixels += Number(mismatch);
    const offset = i * 4;
    diff.data[offset] = mismatch ? 255 : expected.data[offset] >> 2;
    diff.data[offset + 1] = mismatch ? 0 : expected.data[offset + 1] >> 2;
    diff.data[offset + 2] = mismatch ? 255 : expected.data[offset + 2] >> 2;
    diff.data[offset + 3] = 255;
  }

  return { diff, mismatchedPixels };
}

test("Dialog comparator catches a one-pixel change", () => {
  const expected = PNG.sync.read(
    readFileSync(
      pixelPerfectFile(`${directory}/captures/${manifest.cases[0].name}`)
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));

  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const directory of [
  "tests/reference/dialog",
  "tests/reference/dialog-extra",
]) {
  test.describe(`Dialog native viewport matrix ${directory}`, () => {
    const manifest = JSON.parse(
      readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
    );

    test.describe.configure({ mode: "parallel" });

    for (const c of manifest.cases) {
      test(`Dialog native pixels: ${c.name}`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 1536, height: 900 });

        const query = new URLSearchParams({
          component: "dialog",
          native: "1",
          scale: String(c.scale),
          label: c.label,
          wrapWidth: String(c.wrapWidth),
          labels: JSON.stringify(c.labels),
          state: c.state,
        });

        if (c.text != null) query.set("text", c.text);

        if (c.disabledIndex != null)
          query.set("disabledIndex", String(c.disabledIndex));

        if (c.checked) query.set("patterned", "1");
        await page.goto(`/?${query}`);
        await page.addStyleTag({
          content: `html,body{background:${c.background}} #root{opacity:0}`,
        });
        const dialog = page.getByRole("dialog");
        await expect(dialog).toHaveAttribute("data-mc-dialog-ready", "true");
        await expect(
          page.locator('[data-slot="dialog-overlay"]')
        ).toHaveAttribute("data-mc-backdrop-ready", "true");

        if (/[^\x00-\x7f]/.test((c.label ?? "") + (c.text ?? ""))) {
          await expect(
            dialog.locator("[data-mc-dialog-unicode-ready]")
          ).toHaveCount(3);

          for (const line of await dialog
            .locator("[data-mc-dialog-unicode-ready]")
            .all())
            await expect(line).toHaveAttribute(
              "data-mc-dialog-unicode-ready",
              "true"
            );
        }

        await page.mouse.move(0, 0);
        const button = dialog.getByRole("button").nth(c.targetIndex ?? 0);

        if (c.state === "hover") await button.hover();

        if (c.state === "focus") await button.focus();
        await page.evaluate(
          async () =>
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  resolve();
                })
              )
            )
        );
        writeFileSync(
          testInfo.outputPath("layout.json"),
          JSON.stringify(
            await dialog.evaluate((node) =>
              [
                node,
                ...node.querySelectorAll(
                  '[data-slot="dialog-title"],.mc-dialog-text,[data-slot="dialog-footer"],button'
                ),
              ].map((n) => {
                const r = n.getBoundingClientRect();

                return {
                  slot: n.getAttribute("data-slot"),
                  text: n.textContent,
                  rect: { x: r.x, y: r.y, width: r.width, height: r.height },
                  shift: (n as HTMLElement).dataset.mcDialogShift,
                };
              })
            ),
            null,
            2
          )
        );

        const bytes = readFileSync(
          pixelPerfectFile(`${directory}/captures/${c.name}`)
        );

        expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);

        const actual = await page.screenshot({ animations: "disabled" }),
          { diff, mismatchedPixels } = compare(
            PNG.sync.read(bytes),
            PNG.sync.read(actual)
          );

        writeFileSync(testInfo.outputPath("actual.png"), actual);
        writeFileSync(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
        writeFileSync(
          testInfo.outputPath("metrics.json"),
          JSON.stringify({
            case: c.name,
            mismatchedPixels,
            totalPixels: 1536 * 900,
            tolerance: 0,
          })
        );
        expect(mismatchedPixels).toBe(0);
      });
    }
  });
}
