import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

export const compare = function compare(expected: PNG, actual: PNG) {
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

    mismatchedPixels += +mismatch;
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

export const nativeTextTests = function nativeTextTests(
  component: "badge" | "typography" | "breadcrumb" | "kbd"
) {
  test.describe.configure({ mode: "parallel" });

  const directories =
    component === "badge"
      ? ["tests/reference/tooltip"]
      : component === "kbd"
        ? ["tests/reference", "tests/reference/button-cjk"]
        : ["tests/reference/label"];

  test(`${component} pixel comparator detects a changed pixel`, () => {
    const manifest = JSON.parse(
      readFileSync(pixelPerfectFile(`${directories[0]}/manifest.json`), "utf-8")
    );

    const expected = PNG.sync.read(
      readFileSync(
        pixelPerfectFile(`${directories[0]}/captures/${manifest.cases[0].name}`)
      )
    );

    const mutated = PNG.sync.read(PNG.sync.write(expected));

    mutated.data[0] ^= 1;
    expect(compare(expected, mutated).mismatchedPixels).toBe(1);
  });

  for (const directory of directories) {
    const manifest = JSON.parse(
      readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
    );

    const parts =
      component === "typography"
        ? [
            "default",
            "h1",
            "h2",
            "h3",
            "h4",
            "p",
            "small",
            "blockquote",
            "code",
            "lead",
            "large",
            "muted",
          ]
        : component === "breadcrumb"
          ? ["link", "page"]
          : ["default"];

    for (const part of parts) {
      for (const c of manifest.cases) {
        test(`${component} ${part} native pixels: ${c.name}`, async ({
          page,
        }, info) => {
          await page.setViewportSize({ width: 1536, height: 900 });

          const params = new URLSearchParams({
            component,
            native: "1",
            part,
            label: c.label ?? c.text ?? "Button",
            text: c.label ?? c.text ?? "Button",
            scale: String(c.scale),
            state: c.state,
            width: String(c.width),
            height: String(c.height ?? 20),
            x: String(c.x ?? 16),
            y: String(c.y ?? 16),
            background: c.background ?? "#202020",
            align: c.alignment ?? "left",
          });

          if (c.wrapWidth != null) params.set("wrapWidth", String(c.wrapWidth));
          await page.goto(`/?${params}`);
          const subject = page.locator("[data-subject]");
          await expect(subject).toHaveAttribute(
            "data-slot",
            component === "breadcrumb"
              ? `breadcrumb-${part}`
              : component === "typography" && part !== "default"
                ? `typography-${part === "code" ? "inline-code" : part}`
                : component
          );
          await expect(subject).toBeVisible();
          await page.mouse.move(0, 0);

          if (component === "kbd") {
            if (c.state === "hover") await subject.hover();

            if (c.state === "focus") {
              await subject.focus();
              await page.keyboard.press("Tab");
              await page.keyboard.press("Shift+Tab");
              await expect(subject).toBeFocused();
            }
          }

          if (component === "badge")
            await expect(
              subject.locator("[data-mc-tooltip-painted]")
            ).toHaveAttribute("data-mc-tooltip-painted", "true");
          else if (component !== "kbd")
            await expect(subject).toHaveAttribute(
              "data-mc-label-layout-ready",
              "true"
            );

          for (const line of await subject
            .locator("[data-mc-label-ready]")
            .all())
            await expect(line).toHaveAttribute("data-mc-label-ready", "true");
          await page.evaluate(async () => {
            const frameCompletion = Promise.withResolvers<void>();

            try {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  frameCompletion.resolve();
                });
              });
            } catch (error) {
              frameCompletion.reject(error);
            }

            return await frameCompletion.promise;
          });

          const bytes = readFileSync(
            pixelPerfectFile(`${directory}/captures/${c.name}`)
          );

          expect(createHash("sha256").update(bytes).digest("hex")).toBe(
            c.sha256
          );

          const actualBytes = await subject.screenshot(),
            { mismatchedPixels, diff } = compare(
              PNG.sync.read(bytes),
              PNG.sync.read(actualBytes)
            );

          writeFileSync(info.outputPath("actual.png"), actualBytes);
          writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
          writeFileSync(
            info.outputPath("metrics.json"),
            JSON.stringify({
              component,
              manifest: `${directory}/manifest.json`,
              part,
              alias: part,
              case: c.name,
              mismatchedPixels,
              tolerance: 0,
            })
          );
          expect(mismatchedPixels).toBe(0);
        });
      }
    }
  }
};
