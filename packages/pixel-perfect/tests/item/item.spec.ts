import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { compare } from "@ppt/harness/families/text-components-test-utils";
import { pixelPerfectRoot, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";
test.describe.configure({ mode: "parallel" });
for (const [part, directory] of [
  ["row", "item"],
  ["title", "label"],
  ["separator", "separator"],
]) {
  const base = `tests/reference/${directory}`,
    manifest = JSON.parse(
      readFileSync(pixelPerfectFile(`${base}/manifest.json`), "utf8")
    );
  test(`Item ${part} comparator detects one changed pixel`, () => {
    const expected = PNG.sync.read(
        readFileSync(
          pixelPerfectFile(`${base}/captures/${manifest.cases[0].name}`)
        )
      ),
      changed = PNG.sync.read(PNG.sync.write(expected));
    changed.data[0] ^= 1;
    expect(compare(expected, changed).mismatchedPixels).toBe(1);
  });
  for (const c of manifest.cases)
    for (const mode of part === "row"
      ? ["link", "button", ...(!c.state.endsWith("hover") ? ["plain"] : [])]
      : ["link"])
      test(`Item ${part} ${mode} native pixels: ${c.name}`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width: 1536, height: 900 });
        const q = new URLSearchParams({
          component: "item",
          part,
          label: c.label ?? "New World",
          text: c.text ?? "world-1",
          description: c.placeholder ?? "Survival Mode",
          scale: String(c.scale),
          state: c.state,
          selected: String(c.selected ?? false),
          width: String(c.width),
          height: String(c.height),
          x: String(c.x),
          y: String(c.y),
          background: c.background,
          align: c.alignment ?? "left",
        });
        if (c.wrapWidth != null) q.set("wrapWidth", String(c.wrapWidth));
        if (mode === "plain") q.set("plain", "1");
        if (mode === "button") q.set("button", "1");
        await page.goto(`/?${q}`);
        const subject = page.locator("[data-subject]");
        await expect(subject).toHaveAttribute(
          "data-slot",
          part === "row" ? "item" : `item-${part}`
        );
        await expect(subject).toBeVisible();
        await page.mouse.move(0, 0);
        if (part === "row") {
          await expect(
            subject.locator('[data-slot="item-content"]')
          ).toHaveAttribute("data-mc-item-content-ready", "true");
          for (const text of await subject
            .locator("[data-mc-label-layout-ready]")
            .all())
            await expect(text).toHaveAttribute(
              "data-mc-label-layout-ready",
              "true"
            );
          const media = subject.locator("[data-mc-item-media-ready]");
          await expect(media).toHaveAttribute(
            "data-mc-item-media-ready",
            "true"
          );
          if (c.state === "hover") await subject.hover();
          if (c.state === "icon-hover") {
            const box = (await subject.boundingBox())!;
            await page.mouse.move(box.x + 18 * c.scale, box.y + 18 * c.scale);
          }
          if (c.state === "focus") {
            await subject.focus();
            await page.keyboard.press("Tab");
            await page.keyboard.press("Shift+Tab");
            await expect(subject).toBeFocused();
          }
          await expect(media).toHaveAttribute(
            "data-mc-item-media-state",
            c.state === "hover" ? "1" : c.state === "icon-hover" ? "2" : "0"
          );
        } else if (part === "title")
          await expect(subject).toHaveAttribute(
            "data-mc-label-layout-ready",
            "true"
          );
        await page.addStyleTag({
          content:
            "#read-ref,#resize,#tag,#events,#actions{visibility:hidden!important}",
        });
        for (const glyph of await subject
          .locator("[data-mc-label-ready]")
          .all())
          await expect(glyph).toHaveAttribute("data-mc-label-ready", "true");
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve())
              )
            )
        );
        const box = (await subject.boundingBox())!;
        expect([box.x, box.y]).toEqual([c.x * c.scale, c.y * c.scale]);
        const bytes = readFileSync(
          pixelPerfectFile(`${base}/captures/${c.name}`)
        );
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);
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
            part,
            mode,
            case: c.name,
            mismatchedPixels,
            tolerance: 0,
          })
        );
        expect(mismatchedPixels).toBe(0);
      });
}
