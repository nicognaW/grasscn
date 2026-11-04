import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type extendedDialogReference from "../reference/dialog-extra/manifest.json";
import type dialogReference from "../reference/dialog/manifest.json";

type DialogReferenceCase = (typeof dialogReference)["cases"][number] & {
  checked?: (typeof extendedDialogReference)["cases"][number]["checked"];
};

interface DialogReferenceManifest {
  cases: DialogReferenceCase[];
}

const directory = "tests/reference/dialog";

// SAFETY: these retained native capture producers own this concrete case schema; the existing read/parse phase and verification assertions remain unchanged.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const manifest = JSON.parse(
  readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
) as DialogReferenceManifest;

const compare = function compare(expected: PNG, actual: PNG) {
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
    diff.data[offset] = mismatch ? 255 : Math.floor(expected.data[offset] / 4);
    diff.data[offset + 1] = mismatch
      ? 0
      : Math.floor(expected.data[offset + 1] / 4);
    diff.data[offset + 2] = mismatch
      ? 255
      : Math.floor(expected.data[offset + 2] / 4);
    diff.data[offset + 3] = 255;
  }

  return { diff, mismatchedPixels };
};

test("Dialog comparator catches a one-pixel change", () => {
  const expected = PNG.sync.read(
    readFileSync(
      pixelPerfectFile(`${directory}/captures/${manifest.cases[0].name}`)
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));

  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

for (const constituentDirectory of [
  "tests/reference/dialog",
  "tests/reference/dialog-extra",
]) {
  test.describe(`Dialog native viewport matrix ${constituentDirectory}`, () => {
    // SAFETY: these retained native capture producers own this concrete case schema; the existing read/parse phase and verification assertions remain unchanged.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const constituentManifest = JSON.parse(
      readFileSync(
        pixelPerfectFile(`${constituentDirectory}/manifest.json`),
        "utf-8"
      )
    ) as DialogReferenceManifest;

    test.describe.configure({ mode: "parallel" });

    for (const c of constituentManifest.cases) {
      test(`Dialog native pixels: ${c.name}`, async ({ page }, testInfo) => {
        await page.setViewportSize({ height: 900, width: 1536 });

        const query = new URLSearchParams({
          component: "dialog",
          label: c.label,
          labels: JSON.stringify(c.labels),
          native: "1",
          scale: String(c.scale),
          state: c.state,
          wrapWidth: String(c.wrapWidth),
        });

        if (c.text !== null) {
          query.set("text", c.text);
        }

        if (c.disabledIndex !== undefined) {
          query.set("disabledIndex", String(c.disabledIndex));
        }

        if (c.checked === true) {
          query.set("patterned", "1");
        }

        await page.goto(`/?${query}`);
        await page.addStyleTag({
          content: `html,body{background:${c.background}} #root{opacity:0}`,
        });
        const dialog = page.getByRole("dialog");
        await expect(dialog).toHaveAttribute("data-mc-dialog-ready", "true");
        await expect(
          page.locator('[data-slot="dialog-overlay"]')
        ).toHaveAttribute("data-mc-backdrop-ready", "true");

        if (/\P{ASCII}/u.test((c.label ?? "") + (c.text ?? ""))) {
          await expect(
            dialog.locator("[data-mc-dialog-unicode-ready]")
          ).toHaveCount(3);

          {
            const readyElements = await dialog
              .locator("[data-mc-dialog-unicode-ready]")
              .all();

            const readinessResults = await Promise.allSettled(
              readyElements.map(async (line) => {
                await expect(line).toHaveAttribute(
                  "data-mc-dialog-unicode-ready",
                  "true"
                );
              })
            );

            const rejectedReadiness = readinessResults.find(
              (result) => result.status === "rejected"
            );

            if (rejectedReadiness) {
              throw rejectedReadiness.reason;
            }
          }
        }

        await page.mouse.move(0, 0);
        const button = dialog.getByRole("button").nth(c.targetIndex ?? 0);

        if (c.state === "hover") {
          await button.hover();
        }

        if (c.state === "focus") {
          await button.focus();
        }

        await page.evaluate(async () => {
          const frameCompletion: PromiseWithResolvers<void> =
            Promise.withResolvers();

          try {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                frameCompletion.resolve();
              });
            });
          } catch (error) {
            frameCompletion.reject(error);
          }

          await frameCompletion.promise;
        });
        writeFileSync(
          testInfo.outputPath("layout.json"),
          JSON.stringify(
            await dialog.evaluate((node) =>
              [
                node,
                ...node.querySelectorAll<HTMLElement | SVGElement>(
                  '[data-slot="dialog-title"],.mc-dialog-text,[data-slot="dialog-footer"],button'
                ),
              ].map((n) => {
                const r = n.getBoundingClientRect();

                return {
                  slot: n.dataset.slot ?? null,
                  text: n.textContent,
                  rect: { x: r.x, y: r.y, width: r.width, height: r.height },
                  shift: n.dataset.mcDialogShift,
                };
              })
            ),
            null,
            2
          )
        );

        const bytes = readFileSync(
          pixelPerfectFile(`${constituentDirectory}/captures/${c.name}`)
        );

        expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);

        const actual = await page.screenshot({ animations: "disabled" });

        const { diff, mismatchedPixels } = compare(
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
            tolerance: 0,
            totalPixels: 1536 * 900,
          })
        );
        expect(mismatchedPixels).toBe(0);
      });
    }
  });
}
