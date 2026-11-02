import type { InputGroupCaptureManifest, InputGroupEntryElement } from "@ppt/installed/control-capture-protocol";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { PNG } from "pngjs";

test.describe.configure({ mode: "parallel" });

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

for (const [folder, part] of [
  ["input", "input"],
  ["input-cjk", "input"],
  ["textarea", "textarea"],
  ["textarea-cjk", "textarea"],
  ["label", "text"],
  ["", "button"],
  ["button-cjk", "button"],
]) {
  const directory = path.join("tests/reference", folder);
  const reference = directory;

  // SAFETY: the existing InputGroup entry/label/button route table selects these concrete captured-reference producers.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact InputGroupCaptureManifest producer boundary with original collection read timing.
const manifest = JSON.parse(
    readFileSync(path.join(directory, "manifest.json"), "utf-8")
  ) as InputGroupCaptureManifest;

  for (const c of manifest.cases) {
    test(`input-group ${folder || "button"} ${c.name}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({
        height: 900,
        width: folder === "input" ? 1280 : 1536,
      });

      const entry = part === "input" || part === "textarea";

      const q = new URLSearchParams({
        align: c.alignment ?? "left",
        background: c.background ?? "#202020",
        component: "input-group",
        height: String(c.height ?? (part === "text" ? 9 : 20)),
        label: c.label ?? "Button",
        native: "1",
        part,
        placeholder: c.placeholder ?? "",
        scale: String(c.scale),
        state: c.state ?? "normal",
        text: c.text ?? "",
        width: String(c.width),
        x: String(c.x ?? 16),
        y: String(c.y ?? 16),
      });

      const caseWrapWidth = c.wrapWidth;

      if (caseWrapWidth !== null && caseWrapWidth !== undefined) {
        q.set("wrapWidth", String(caseWrapWidth));
      }

      const caseMaxLength = c.maxLength;

      if (caseMaxLength !== null && caseMaxLength !== undefined) {
        q.set("maxLength", String(caseMaxLength));
      }

      if (entry) {
        await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") });
        await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));
      }

      await page.goto(`/?${q}`);
      const subject = page.locator("#subject");
      await expect(subject).toBeVisible();

      if (entry) {
        await expect(subject).toHaveAttribute("data-mc-ready", "true");

        if (
          folder.includes("cjk") ||
          /\P{ASCII}/u.test((c.text ?? "") + (c.placeholder ?? ""))
        ) {
          await expect(subject).toHaveAttribute("data-mc-bitmap", "true");
        }
      }

      if (part === "text") {
        await expect(subject).toHaveAttribute(
          "data-mc-label-layout-ready",
          "true"
        );
      }

      for (const line of await subject.locator("[data-mc-label-ready]").all()) {
        await expect(line).toHaveAttribute("data-mc-label-ready", "true");
      }

      if (c.state?.startsWith("focus")) {
        await subject.focus();

        if (part === "button") {
          await page.keyboard.press("Tab");
          await page.keyboard.press("Shift+Tab");
        }
      }

      if (c.state === "hover") {
        await subject.hover();
      } else {
        await page.mouse.move(0, 0);
      }

      if (entry) {
        const cursor = c.cursor ?? c.text!.length;
        const anchor = c.anchor ?? cursor;

        await subject.evaluate(
          (node, { cursor, anchor }) =>
            // SAFETY: this entry fixture route renders an HTML input or textarea with native selection support.
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact entry subject DOM API producer boundary.
              (node as InputGroupEntryElement).setSelectionRange(
              Math.min(cursor, anchor),
              Math.max(cursor, anchor),
              cursor < anchor ? "backward" : "forward"
            ),
          { anchor, cursor }
        );

        if (part === "textarea") {
          await subject.evaluate(
            (node, y) => {
              node.scrollTop = y;
            },
            (c.value ?? 0) * c.scale
          );
        }

        await page.clock.runFor(c.caretMs!);
        await expect(subject).toHaveAttribute("data-mc-ready", "true");
      } else {
        await page.evaluate(
          async () =>
            {
              const frameCompletion = Promise.withResolvers();

              try {
                requestAnimationFrame(() => {
                  requestAnimationFrame(frameCompletion.resolve);
                });
              } catch (error) {
                frameCompletion.reject(error);
              }

              return await frameCompletion.promise;
            }
        );
      }

      const expectedBytes = await readFile(
        path.join(reference, "captures", c.name)
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
          component: "input-group",
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
        `${folder}/${c.name}: installed pixels differ`
      );
    });
  }
}
