import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const repo = path.resolve(".");
const audits = new WeakMap<object, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  audits.set(page, errors);
  page.on("pageerror", (e) => errors.push(e.message));
});

test.afterEach(({ page, browser }, info) => {
  const errors = audits.get(page) ?? [];
  writeFileSync(
    info.outputPath("runtime.json"),
    JSON.stringify({ browser: browser.version(), pageErrors: errors })
  );
  expect(errors).toEqual([]);
});

const compare = function compare(
  bytes: Buffer,
  expectedBytes: Buffer,
  c: any,
  kind: string,
  info: any
) {
  const a = PNG.sync.read(bytes);
  const e = PNG.sync.read(expectedBytes);

  expect([a.width, a.height]).toEqual([e.width, e.height]);
  let n = 0;
  const diff = new PNG({ height: a.height, width: a.width });

  for (let i = 0; i < a.data.length; i += 4) {
    const changed = !a.data
      .subarray(i, i + 4)
      .equals(e.data.subarray(i, i + 4));

    if (changed) {
      n += 1;
    }

    diff.data.set(changed ? [255, 0, 255, 255] : [0, 0, 0, 255], i);
  }

  writeFileSync(info.outputPath("actual.png"), bytes);
  writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
  writeFileSync(
    info.outputPath("metrics.json"),
    JSON.stringify({ case: c.name, kind, mismatchedPixels: n })
  );
  expect(n).toBe(0);
};

test.describe.configure({ mode: "parallel" });

for (const kind of ["suggestions", "input", "input-cjk"]) {
  const dir = path.join(repo, "tests/reference", kind);

  const m = JSON.parse(
    readFileSync(pixelPerfectFile(path.join(dir, "manifest.json")), "utf-8")
  );

  for (const c of m.cases) {
    test(`Combobox native ${kind}:${c.name}`, async ({ page }, info) => {
      if (kind !== "suggestions") {
        await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") });
        await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));
      }

      const q = new URLSearchParams({
        background: c.background ?? "#202020",
        height: String(c.height),
        native: "1",
        part: kind === "suggestions" ? "list" : "input",
        scale: String(c.scale),
        state: c.state,
        width: String(c.width),
        x: String(c.x ?? 16),
        y: String(c.y ?? 16),
      });

      if (kind === "suggestions") {
        q.set("labels", JSON.stringify(c.labels));
        q.set("selectedIndex", String(c.selectedIndex));
        q.set("surface", c.element === "menu-panel" ? "popup" : "suggestions");
      } else {
        q.set("text", c.text);
        q.set("placeholder", c.placeholder ?? "");

        const caseMaxLength = c.maxLength;

        if (caseMaxLength !== null && caseMaxLength !== undefined) {
          q.set("maxLength", String(caseMaxLength));
        }
      }

      await page.goto(`/?component=combobox&${q}`);
      const subject = page.locator("[data-subject]");

      if (kind === "suggestions") {
        await expect(subject).toHaveAttribute("data-mc-menu-ready", "true");
        await subject.focus();

        if (c.state.endsWith("hover")) {
          await subject.getByRole("option").nth(c.targetIndex).hover();
        } else {
          await page.mouse.move(0, 0);
        }

        await subject.evaluate(
          (node, value) => {
            node.scrollTop = value;
          },
          (c.value ?? 0) * 12 * c.scale
        );

        const unicodeCount = c.labels.filter((label: string) =>
          /[^\x20-\x7E]/.test(label)
        ).length;

        await expect(subject.locator("[data-mc-menu-text-ready]")).toHaveCount(
          unicodeCount
        );

        for (const label of await subject
          .locator("[data-mc-menu-text-ready]")
          .all()) {
          await expect(label).toHaveAttribute(
            "data-mc-menu-text-ready",
            "true"
          );
        }

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
            new Promise<void>((r) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  r();
                })
              )
            )
        );
      } else {
        await expect(subject).toHaveAttribute("data-mc-ready", "true");

        if (kind === "input-cjk") {
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
          (n, { cursor, anchor }) => {
            (n as HTMLInputElement).setSelectionRange(
              Math.min(cursor, anchor),
              Math.max(cursor, anchor),
              cursor < anchor ? "backward" : "forward"
            );
          },
          { anchor, cursor }
        );
        await page.clock.runFor(c.caretMs);
        await expect(subject).toHaveAttribute("data-mc-ready", "true");
      }

      const expected = readFileSync(
        pixelPerfectFile(path.join(dir, "captures", c.name))
      );

      expect(createHash("sha256").update(expected).digest("hex")).toBe(
        c.sha256
      );
      compare(await subject.screenshot(), expected, c, kind, info);
    });
  }
}
