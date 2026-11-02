import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { test, expect } from "@grasscn/pixel-perfect/test";
import { compare } from "@ppt/harness/families/text-components-test-utils";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

export const nativeChatTests = function nativeChatTests(
  component: "message" | "bubble"
) {
  test.describe.configure({ mode: "parallel" });

  const directory = "tests/reference/message";

  const manifest = JSON.parse(
    readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
  );

  test(`${component} comparator detects one changed pixel`, () => {
    const expected = PNG.sync.read(
      readFileSync(
        pixelPerfectFile(`${directory}/captures/${manifest.cases[0].name}`)
      )
    );

    const changed = PNG.sync.read(PNG.sync.write(expected));

    changed.data[0] ^= 1;
    expect(compare(expected, changed).mismatchedPixels).toBe(1);
  });

  for (const c of manifest.cases) {
    test(`${component} native chat pixels: ${c.name}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ height: 900, width: 1536 });

      const q = new URLSearchParams({
        background: c.background,
        color: c.color,
        component,
        height: String(c.height),
        label: c.label,
        native: "1",
        scale: String(c.scale),
        width: String(c.width),
        x: String(c.x),
        y: String(c.y),
      });

      await page.goto(`/?${q}`);
      const subject = page.locator("[data-subject]");
      await expect(subject).toHaveAttribute(
        "data-slot",
        `${component}-content`
      );
      await expect(subject).toHaveAttribute("data-mc-chat-ready", "true");
      await expect(
        subject.locator("[data-mc-label-layout-ready]")
      ).toHaveAttribute("data-mc-label-layout-ready", "true");

      for (const glyph of await subject
        .locator("[data-mc-label-ready]")
        .all()) {
        await expect(glyph).toHaveAttribute("data-mc-label-ready", "true");
      }

      await page.evaluate(
        async () =>
          // oxlint-disable-next-line promise/avoid-new -- Preserve this page-realm two-frame barrier and its existing settlement value.
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve();
              });
            });
          })
      );

      const bytes = readFileSync(
        pixelPerfectFile(`${directory}/captures/${c.name}`)
      );

      expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);

      const actualBytes = await subject.screenshot();

      const { mismatchedPixels, diff } = compare(
        PNG.sync.read(bytes),
        PNG.sync.read(actualBytes)
      );

      writeFileSync(info.outputPath("actual.png"), actualBytes);
      writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
      writeFileSync(
        info.outputPath("metrics.json"),
        JSON.stringify({
          alias: "base",
          case: c.name,
          component,
          manifest: directory + "/manifest.json",
          mismatchedPixels,
          part:
            component === "message" || component === "bubble"
              ? "content"
              : "constituent",
          tolerance: 0,
        })
      );
      expect(mismatchedPixels).toBe(0);
    });
  }
};
