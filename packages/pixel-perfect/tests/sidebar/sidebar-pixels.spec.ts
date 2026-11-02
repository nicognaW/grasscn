import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const repo = path.resolve(".");

const hash = (value: Buffer) =>
  createHash("sha256").update(value).digest("hex");

const compare = function compare(expected: PNG, actual: PNG) {
  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  let mismatchedPixels = 0;
  const diff = new PNG({ height: expected.height, width: expected.width });

  for (let i = 0; i < expected.data.length; i += 4) {
    const different = !actual.data
      .subarray(i, i + 4)
      .equals(expected.data.subarray(i, i + 4));

    mismatchedPixels += Number(different);
    diff.data.set(
      different
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

const runtimeErrors = new WeakMap<object, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});

test.afterEach(({ page, browser }, info) => {
  writeFileSync(
    info.outputPath("browser-version.json"),
    JSON.stringify({ version: browser.version() })
  );
  const errors = runtimeErrors.get(page) ?? [];
  writeFileSync(info.outputPath("page-errors.json"), JSON.stringify(errors));
  expect(errors).toEqual([]);
});

test("Sidebar native constituent comparator rejects one changed pixel", () => {
  const expected = PNG.sync.read(
    readFileSync(
      pixelPerfectFile(
        path.join(repo, "tests/reference/captures/normal-w200-s1.png")
      )
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));

  actual.data[0] ^= 1;
  expect(compare(expected, actual).mismatchedPixels).toBe(1);
});

const matrices = [
  ["", "button"],
  ["button-cjk", "button"],
  ["input", "input"],
  ["input-cjk", "input"],
  ["card", "panel"],
  ["label", "label"],
  ["separator", "separator"],
  ["scroll-area", "scroll"],
] as const;

test.describe("Sidebar original native constituent cases", () => {
  test.describe.configure({ mode: "parallel" });

  for (const [folder, kind] of matrices) {
    const directory = path.join(repo, "tests/reference", folder);

    const manifest = JSON.parse(
      readFileSync(
        pixelPerfectFile(path.join(directory, "manifest.json")),
        "utf-8"
      )
    );

    for (const c of manifest.cases) {
      const representative =
        (folder === "" && c.width === 200 && c.label === "Button") ||
        (folder === "button-cjk" &&
          c.width === 103 &&
          c.label === "你好，世界");

      const parts =
        kind === "button"
          ? [
              "menu-button",
              "sub-button",
              ...(representative
                ? ["trigger", "group-action", "menu-action"]
                : []),
            ]
          : kind === "label"
            ? ["label", "badge"]
            : [kind];

      for (const part of parts) {
        for (const active of ["menu-button", "sub-button"].includes(part) &&
        ["hover", "focus"].includes(c.state)
          ? [false, true]
          : [false]) {
          test(`Sidebar ${part} native pixels ${c.name} active:${active}`, async ({
            page,
          }, info) => {
            await page.setViewportSize({ width: 1536, height: 900 });

            if (kind === "input") {
              await page.clock.install({
                time: new Date("2026-10-28T00:00:00Z"),
              });
              await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));
            }

            const params = new URLSearchParams({
              native: "1",
              part,
              state: c.state,
              scale: String(c.scale),
              width: String(c.width),
              height: String(c.height ?? 20),
              x: String(c.x ?? 16),
              y: String(c.y ?? 16),
              background: c.background ?? manifest.background ?? "#202020",
            });

            for (const field of [
              "label",
              "text",
              "placeholder",
              "maxLength",
              "wrapWidth",
              "alignment",
              "contentHeight",
              "value",
            ]) {
              if (c[field] != null) {
                params.set(field, String(c[field]));
              }
            }

            if (active) {
              params.set("active", "1");
            }

            await page.goto(`/?component=sidebar&${params}`);
            const subject = page.locator("[data-subject]");
            await expect(subject).toHaveAttribute(
              "data-slot",
              part === "sub-button"
                ? "sidebar-menu-sub-button"
                : part === "label"
                  ? "sidebar-group-label"
                  : part === "badge"
                    ? "sidebar-menu-badge"
                    : part === "panel"
                      ? "sidebar"
                      : part === "scroll"
                        ? "sidebar-content"
                        : `sidebar-${part}`
            );
            await page.addStyleTag({
              content:
                "#root{visibility:hidden}[data-subject]{visibility:visible}",
            });
            await page.mouse.move(0, 0);

            if (kind === "input") {
              await expect(subject).toHaveAttribute("data-mc-ready", "true");
              await expect(subject).toHaveAttribute("data-mc-bitmap", "true");

              if (c.state.startsWith("focus")) {
                await subject.focus();
                await expect(subject).toBeFocused();
              }

              if (c.state === "hover") {
                await subject.hover();
              }

              const cursor = c.cursor ?? c.text.length,
                anchor = c.anchor ?? cursor;

              await subject.evaluate(
                (node, selection) => {
                  (node as HTMLInputElement).setSelectionRange(
                    Math.min(selection.cursor, selection.anchor),
                    Math.max(selection.cursor, selection.anchor),
                    selection.cursor < selection.anchor ? "backward" : "forward"
                  );
                },
                { cursor, anchor }
              );
              await page.clock.runFor(c.caretMs);
              await expect(subject).toHaveAttribute("data-mc-ready", "true");
            } else if (kind === "scroll") {
              await expect(subject).toHaveAttribute(
                "data-mc-scroll-ready",
                "true"
              );

              const viewport = subject.locator(
                '[data-slot="scroll-area-viewport"]'
              );

              await viewport.evaluate((node, scroll) => {
                node.scrollTop = scroll;
              }, c.value * c.scale);
              await expect
                .poll(
                  async () => await viewport.evaluate((node) => node.scrollTop)
                )
                .toBe(c.value * c.scale);

              if (c.state === "hover") {
                await subject
                  .locator('[data-slot="scroll-area-scrollbar"]')
                  .hover();
              }

              if (c.state === "focus") {
                await viewport.focus();
              }
            } else if (kind === "button" && !active) {
              if (c.state === "hover") {
                await subject.hover();
              }

              if (c.state === "focus") {
                await subject.focus();
                await page.keyboard.press("Tab");
                await page.keyboard.press("Shift+Tab");
                await expect(subject).toBeFocused();
              }
            }

            if (kind === "label") {
              await expect(subject).toHaveAttribute(
                "data-mc-label-layout-ready",
                "true"
              );
            }

            for (const label of await subject
              .locator("[data-mc-label-ready]")
              .all()) {
              await expect(label).toHaveAttribute(
                "data-mc-label-ready",
                "true"
              );
            }

            if (kind !== "input") {
              await page.evaluate(
                async () =>
                  await new Promise<void>((resolve) =>
                    requestAnimationFrame(() =>
                      requestAnimationFrame(() => {
                        resolve();
                      })
                    )
                  )
              );
            }

            const expectedBytes = readFileSync(
              pixelPerfectFile(path.join(directory, "captures", c.name))
            );

            expect(hash(expectedBytes)).toBe(c.sha256);

            const actualBytes = await subject.screenshot(),
              expected = PNG.sync.read(expectedBytes),
              actual = PNG.sync.read(actualBytes),
              { mismatchedPixels, diff } = compare(expected, actual);

            writeFileSync(info.outputPath("actual.png"), actualBytes);
            writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
            writeFileSync(
              info.outputPath("metrics.json"),
              JSON.stringify({
                case: c.name,
                part,
                active,
                mismatchedPixels,
                tolerance: 0,
              })
            );
            expect(mismatchedPixels).toBe(0);
          });
        }
      }
    }
  }
});
