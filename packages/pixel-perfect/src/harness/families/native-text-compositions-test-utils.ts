import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { test, expect } from "@grasscn/pixel-perfect/test";
import { compare } from "@ppt/harness/families/text-components-test-utils";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type messageReference from "../../../tests/reference/message/manifest.json";
import type spinnerReference from "../../../tests/reference/spinner/manifest.json";

type CompositionReference = typeof messageReference | typeof spinnerReference;

export const nativeTextCompositionTests = function nativeTextCompositionTests(
  component: "code-block" | "trace" | "message-scroller" | "spinner"
) {
  test.describe.configure({ mode: "parallel" });

  const directory = `tests/reference/${component === "spinner" ? component : "message"}`;

  // SAFETY: The directory expression selects only the retained message or spinner manifest represented by these exact imported types.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned retained-JSON producer boundary; runtime read and parse stay unchanged.
  const manifest = JSON.parse(
    readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
  ) as CompositionReference;

  test(`${component} comparator catches one changed pixel`, () => {
    const expected = PNG.sync.read(
      readFileSync(
        pixelPerfectFile(`${directory}/captures/${manifest.cases[0].name}`)
      )
    );

    const changed = PNG.sync.read(PNG.sync.write(expected));

    // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
    changed.data[0] ^= 1;
    expect(compare(expected, changed).mismatchedPixels).toBe(1);
  });

  for (const c of manifest.cases) {
    test(`${component} native constituent pixels: ${c.name}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ height: 900, width: 1536 });
      const q = new URLSearchParams({ component, native: "1" });

      for (const [key, value] of Object.entries(c)) {
        if (typeof value === "string" || typeof value === "number") {
          q.set(key, String(value));
        }
      }

      await page.goto(`/?${q}`);
      const subject = page.locator("[data-subject]");
      await expect(subject).toBeVisible();
      await expect(subject).toHaveAttribute(
        "data-slot",
        component === "code-block"
          ? "code-block-content"
          : component === "trace"
            ? "trace-line"
            : component === "message-scroller"
              ? "message-scroller-item"
              : component
      );

      if (component === "code-block") {
        await expect(
          subject.locator("[data-mc-selectable-ready]")
        ).toHaveAttribute("data-mc-selectable-ready", "true");
      }

      if (component === "message-scroller") {
        await expect(subject.locator("[data-mc-chat-ready]")).toHaveAttribute(
          "data-mc-chat-ready",
          "true"
        );
      }

      for (const node of await subject
        .locator("[data-mc-label-layout-ready]")
        .all()) {
        await expect(node).toHaveAttribute(
          "data-mc-label-layout-ready",
          "true"
        );
      }

      for (const node of await subject.locator("[data-mc-label-ready]").all()) {
        await expect(node).toHaveAttribute("data-mc-label-ready", "true");
      }

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

        return frameCompletion.promise;
      });

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
          manifest: `${directory}/manifest.json`,
          mismatchedPixels,
          part:
            component === "code-block"
              ? "content"
              : component === "trace"
                ? "line"
                : component === "message-scroller"
                  ? "item"
                  : "default",
          tolerance: 0,
        })
      );
      expect(mismatchedPixels).toBe(0);
    });
  }
};
