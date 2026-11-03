import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import type { CapturedReferenceCase } from "@ppt/installed/reference-case";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type inputReference from "../reference/input/manifest.json";

type QuestionnaireInputCase = (typeof inputReference)["cases"][number];

/** Fields consumed from this file's closed Label, Controls, Button and Input routes. */
interface QuestionnaireComparisonCase extends CapturedReferenceCase {
  label?: string;
  text?: string;
  placeholder?: string;
  checked?: boolean;
  x?: number;
  y?: number;
  background?: string;
  alignment?: string;
  wrapWidth?: number;
  maxLength?: number;
  cursor?: number;
  anchor?: number;
}

interface QuestionnaireComparisonManifest {
  background: string;
  cases: QuestionnaireComparisonCase[];
}

// Native capture Case.wrapWidth is a nullable Integer; zero or absence disables wrapping.
const questionnaireCaseQuery = (
  c: QuestionnaireComparisonCase,
  part: string,
  action: string,
  manifest: QuestionnaireComparisonManifest
) => {
  const q = new URLSearchParams({
    action,
    align: c.alignment ?? "left",
    background: c.background ?? manifest.background ?? "#202020",
    checked: String(c.checked ?? false),
    component: "questionnaire",
    height: String(c.height ?? 20),
    label: c.label ?? "",
    native: "1",
    part,
    placeholder: c.placeholder ?? "",
    scale: String(c.scale),
    state: c.state,
    text: c.text ?? "",
    width: String(c.width),
    x: String(c.x ?? 16),
    y: String(c.y ?? 16),
  });

  if (action === "radio") {
    q.set("radio", "1");
  }

  if ((c.wrapWidth ?? 0) !== 0) {
    q.set("wrapWidth", String(c.wrapWidth));
  }

  if (c.maxLength !== undefined) {
    q.set("maxLength", String(c.maxLength));
  }

  return q;
};

const parts = [
  ["title", "label"],
  ["description", "label"],
  ["error", "label"],
  ["progress", "label"],
  ["checkbox", "controls"],
  ["action", "."],
  ["action", "button-cjk"],
  ["input", "input"],
];

for (const [part, dir] of parts) {
  // SAFETY: The closed constituent table reads retained Label, Controls, ASCII/CJK Button and Input manifests with this real shared core, variant optionals and string background headers.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained constituent boundary; the existing runtime read/parse phase is preserved.
  const manifest = JSON.parse(
    readFileSync(
      pixelPerfectFile(`tests/reference/${dir}/manifest.json`),
      "utf-8"
    )
  ) as QuestionnaireComparisonManifest;

  test.describe(`Questionnaire actual ${part} native constituents ${dir}`, () => {
    test.describe.configure({ mode: "parallel" });

    for (const c of manifest.cases) {
      let questionnaireActions: string[];

      if (part === "action") {
        questionnaireActions = ["next", "previous", "skip", "submit"];
      } else if (part === "checkbox") {
        questionnaireActions = ["next", "radio"];
      } else {
        questionnaireActions = ["next"];
      }

      for (const action of questionnaireActions) {
        test(`${c.name} ${action}`, async ({ page }, info) => {
          await page.setViewportSize({ height: 900, width: 1536 });

          if (part === "input") {
            await page.clock.install({
              time: new Date("2026-10-28T00:00:00Z"),
            });
            await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));
          }

          const q = questionnaireCaseQuery(c, part, action, manifest);

          await page.goto(`/?${q}`);
          const subject = page.locator("[data-subject]");
          await expect(subject).toBeVisible();

          if (["title", "description", "error", "progress"].includes(part)) {
            await expect(subject).toHaveAttribute(
              "data-mc-label-layout-ready",
              "true"
            );
          }

          if (part === "input") {
            await expect(subject).toHaveAttribute("data-mc-ready", "true");
          }

          await page.mouse.move(0, 0);

          if (c.state.startsWith("focus")) {
            await (
              part === "checkbox" ? subject.locator("input") : subject
            ).focus();
          }

          if (c.state === "hover") {
            await (
              part === "checkbox" ? subject.locator("input") : subject
            ).hover();
          }

          if (part === "input") {
            // SAFETY: Only the per-iteration [input, input] route enters this branch; its retained Input cases have required string text, as the type-only artifact import records.
            const cursor =
              c.cursor ?? (c as QuestionnaireInputCase).text.length;

            const anchor = c.anchor ?? cursor;

            await subject.evaluate(
              (el: HTMLInputElement, p) => {
                el.setSelectionRange(
                  Math.min(p.cursor, p.anchor),
                  Math.max(p.cursor, p.anchor),
                  p.cursor < p.anchor ? "backward" : "forward"
                );
              },
              { cursor, anchor }
            );
            // SAFETY: This same captured Input route supplies the retained case's required numeric caretMs; the existing clock call and property read stay in place.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Existing closed-route correlation to the exact Input artifact.
            await page.clock.runFor((c as QuestionnaireInputCase).caretMs);
            await expect(subject).toHaveAttribute("data-mc-ready", "true");
          } else {
            for (const glyph of await subject
              .locator("[data-mc-label-ready]")
              .all()) {
              await expect(glyph).toHaveAttribute(
                "data-mc-label-ready",
                "true"
              );
            }

            await page.evaluate(async () => {
              const frameCompletion = Promise.withResolvers();

              try {
                requestAnimationFrame(() => {
                  requestAnimationFrame(frameCompletion.resolve);
                });
              } catch (error) {
                frameCompletion.reject(error);
              }

              return await frameCompletion.promise;
            });
          }

          const bytes = readFileSync(
            pixelPerfectFile(`tests/reference/${dir}/captures/${c.name}`)
          );

          const actualBytes = await subject.screenshot({
            animations: "disabled",
          });

          const a = PNG.sync.read(bytes);
          const b = PNG.sync.read(actualBytes);

          expect(createHash("sha256").update(bytes).digest("hex")).toBe(
            c.sha256
          );
          expect([b.width, b.height]).toEqual([a.width, a.height]);
          let mismatchedPixels = 0;

          for (let i = 0; i < a.data.length; i += 4) {
            mismatchedPixels += Number(
              !a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4))
            );
          }

          writeFileSync(
            info.outputPath("metrics.json"),
            JSON.stringify({
              component: "questionnaire",
              manifest:
                dir === "."
                  ? "tests/reference/manifest.json"
                  : `tests/reference/${dir}/manifest.json`,
              alias: action,
              part,
              action,
              case: c.name,
              mismatchedPixels,
              tolerance: 0,
            })
          );
          writeFileSync(info.outputPath("actual.png"), actualBytes);
          expect(mismatchedPixels).toBe(0);
        });
      }
    }
  });
}
