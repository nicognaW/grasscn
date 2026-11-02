import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { PNG } from "pngjs";

test.describe.configure({ mode: "parallel" });

const sha = (b) => createHash("sha256").update(b).digest("hex");

for (const [folder, part] of [
  ["suggestions", "list"],
  ["input", "input"],
  ["input-cjk", "input"],
]) {
  const directory = path.join("tests/reference", folder);

  const manifest = JSON.parse(
    readFileSync(path.join(directory, "manifest.json"), "utf-8")
  );

  for (const c of manifest.cases) {
    test(`command ${folder || "button"} ${c.name}`, async ({ page }, info) => {
      await page.setViewportSize({
        height: 900,
        width: folder === "input" ? 1280 : 1536,
      });

      const menu = folder === "suggestions";

      const query = new URLSearchParams({
        background: c.background ?? "#202020",
        component: "command",
        height: String(c.height),
        native: "1",
        part: menu ? "list" : "input",
        scale: String(c.scale),
        state: c.state,
        width: String(c.width),
        x: String(c.x ?? 16),
        y: String(c.y ?? 16),
      });

      if (menu) {
        query.set("labels", JSON.stringify(c.labels));
        query.set(
          "surface",
          c.element === "menu-panel" ? "popup" : "suggestions"
        );
        query.set("selectedIndex", String(c.selectedIndex));
      } else {
        query.set("text", c.text);
        query.set("placeholder", c.placeholder ?? "");

        const caseMaxLength = c.maxLength;

        if (caseMaxLength !== null && caseMaxLength !== undefined) {
          query.set("maxLength", String(caseMaxLength));
        }

        await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") });
        await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));
      }

      await page.goto(`/?${query}`);

      const subject = page.locator(
        menu ? '[data-slot="command-list"]' : '[data-slot="command-input"]'
      );

      if (menu) {
        await expect(subject).toHaveAttribute("data-mc-menu-ready", "true");
        await subject.focus();

        if (c.state.endsWith("hover")) {
          await subject.getByRole("option").nth(c.targetIndex).hover();
        } else {
          await page.mouse.move(0, 0);
        }

        await subject.evaluate(
          (node, scroll) => {
            node.scrollTop = scroll;
          },
          (c.value ?? 0) * 12 * c.scale
        );
        await expect(
          subject.locator('[data-mc-menu-text-ready="false"]')
        ).toHaveCount(0, { timeout: 15_000 });

        for (const line of await subject
          .locator("[data-mc-menu-unicode-ready]")
          .all()) {
          await expect(line).toHaveAttribute(
            "data-mc-menu-unicode-ready",
            "true"
          );
        }

        await page.evaluate(
          async () =>
            // oxlint-disable-next-line promise/avoid-new -- Preserve this page-realm two-frame barrier and its existing settlement value.
            new Promise((resolve) => {
              requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
              });
            })
        );
      } else {
        await expect(subject).toHaveAttribute("data-mc-ready", "true");

        if (folder === "input-cjk") {
          await expect(subject).toHaveAttribute("data-mc-bitmap", "true");
        }

        if (c.state.startsWith("focus")) {
          await subject.focus();
        }

        if (c.state === "hover") {
          await subject.hover();
        } else {
          await page.mouse.move(0, 0);
        }

        const cursor = c.cursor ?? c.text.length;
        const anchor = c.anchor ?? cursor;

        await subject.evaluate(
          (node, { cursor, anchor }) =>
            node.setSelectionRange(
              Math.min(cursor, anchor),
              Math.max(cursor, anchor),
              cursor < anchor ? "backward" : "forward"
            ),
          { anchor, cursor }
        );
        await page.clock.runFor(c.caretMs);
        await expect(subject).toHaveAttribute("data-mc-ready", "true");
      }

      const expectedBytes = await readFile(
        path.join(directory, "captures", c.name)
      );

      assert.equal(sha(expectedBytes), c.sha256);

      const expected = PNG.sync.read(expectedBytes);
      const actualBytes = await subject.screenshot({ animations: "disabled" });
      const actual = PNG.sync.read(actualBytes);

      writeFileSync(info.outputPath("actual.png"), actualBytes);
      writeFileSync(
        info.outputPath("metrics.json"),
        JSON.stringify({
          alias: "base",
          case: c.name,
          component: "command",
          manifest: path.join(directory, "manifest.json").replaceAll("\\", "/"),
          part,
        })
      );
      assert.deepEqual(
        [actual.width, actual.height],
        [expected.width, expected.height]
      );
      assert.ok(
        actual.data.equals(expected.data),
        `Installed Command ${folder}: ${c.name} differs`
      );
    });
  }
}
