import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import type { TestInfo } from "@playwright/test";
import type { CapturedReferenceCase } from "@ppt/installed/reference-case";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

/** Fields consumed from the closed Suggestions, Input and Input CJK routes. */
interface ComboboxComparisonCase extends CapturedReferenceCase {
  element: string;
  x: number;
  y: number;
  background?: string;
  labels?: string[];
  selectedIndex?: number;
  targetIndex?: number;
  value?: number;
  text?: string;
  placeholder?: string;
  maxLength?: number;
  cursor?: number;
  anchor?: number;
}

interface ComboboxSuggestionsCase extends ComboboxComparisonCase {
  labels: string[];
  selectedIndex: number;
  value: number;
  background: string;
}

interface ComboboxHoveredSuggestionCase extends ComboboxSuggestionsCase {
  state: "hover";
  targetIndex: number;
}

interface ComboboxInputCase extends ComboboxComparisonCase {
  element: "input";
  text: string;
  caretMs: number;
}

interface ComboboxComparisonManifest {
  cases: ComboboxComparisonCase[];
}

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
  c: { name: string },
  kind: string,
  info: TestInfo
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

  // SAFETY: The closed Suggestions/Input/Input CJK loop reads retained manifests with the real shared core and optional variant fields; branch-specific fields are projected only at their existing guards.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained capture boundary; existing runtime read/parse phase is preserved.
  const m = JSON.parse(
    readFileSync(pixelPerfectFile(path.join(dir, "manifest.json")), "utf-8")
  ) as ComboboxComparisonManifest;

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
        // SAFETY: The captured kind suggestions route reads only its retained Suggestions cases, all with string-array labels.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Actual closed-route/variant contract at the existing guard; no added property read or validation.
        q.set("labels", JSON.stringify((c as ComboboxSuggestionsCase).labels));
        q.set("selectedIndex", String(c.selectedIndex));
        q.set("surface", c.element === "menu-panel" ? "popup" : "suggestions");
      } else {
        // SAFETY: This existing else branch covers only the captured Input/Input CJK routes, both with required string text.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Actual closed-route/variant contract at the existing guard; no added property read or validation.
        q.set("text", (c as ComboboxInputCase).text);
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
          // SAFETY: Within the Suggestions route, the existing hover-state guard selects exactly the retained hover cases, all with numeric targetIndex.
          await subject
            .getByRole("option")
            .nth((c as ComboboxHoveredSuggestionCase).targetIndex)
            .hover();
        } else {
          await page.mouse.move(0, 0);
        }

        await subject.evaluate(
          (node, value) => {
            node.scrollTop = value;
          },
          (c.value ?? 0) * 12 * c.scale
        );

        // SAFETY: This existing Suggestions branch uses the same captured retained producer, whose labels are string arrays.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Actual closed-route/variant contract at the existing guard; no added property read or validation.
        const unicodeCount = (c as ComboboxSuggestionsCase).labels.filter(
          (label: string) => /[^\u0020-\u007E]/u.test(label)
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

          await frameCompletion.promise;
        });
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

        // SAFETY: This existing non-Suggestions branch contains only Input/Input CJK cases with required string text; the cursor read and short-circuit default stay in place.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Actual closed-route/variant contract at the existing guard; no added property read or validation.
        const cursor = c.cursor ?? (c as ComboboxInputCase).text.length;
        const anchor = c.anchor ?? cursor;

        await subject.evaluate(
          (
            n: HTMLInputElement,
            { cursor: selectionCursor, anchor: selectionAnchor }
          ) => {
            n.setSelectionRange(
              Math.min(selectionCursor, selectionAnchor),
              Math.max(selectionCursor, selectionAnchor),
              selectionCursor < selectionAnchor ? "backward" : "forward"
            );
          },
          { anchor, cursor }
        );
        // SAFETY: This captured Input/Input CJK route supplies required numeric caretMs; the clock call and property-read position stay unchanged.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Actual closed-route/variant contract at the existing guard; no added property read or validation.
        await page.clock.runFor((c as ComboboxInputCase).caretMs);
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
