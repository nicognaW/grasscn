import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { compareSelectPixels } from "@ppt/harness/families/select-pixel-compare";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const directory = "tests/reference/select";

const manifest = JSON.parse(
  readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
) as {
  cases: {
    name: string;
    element: string;
    label?: string;
    labels?: string[];
    width: number;
    height: number;
    x: number;
    y: number;
    scale: number;
    state: string;
    selectedIndex?: number;
    value?: number;
    timeMs?: number;
    background: string;
    targetIndex?: number;
    disabledIndex?: number;
    sha256: string;
  }[];
};

test("Select comparator catches a one-pixel change", () => {
  const expected = PNG.sync.read(
    readFileSync(
      pixelPerfectFile(`${directory}/captures/${manifest.cases[0].name}`)
    )
  );

  const actual = PNG.sync.read(PNG.sync.write(expected));
  actual.data[0] ^= 1;
  expect(compareSelectPixels(expected, actual).mismatches).toBe(1);
});

test.describe("Select native matrix", () => {
  test.describe.configure({ mode: "parallel" });

  for (const c of manifest.cases) {
    test(`Select native pixels: ${c.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ height: 900, width: 1536 });
      await page.addInitScript(() => {
        Date.now = () =>
          Number(new URLSearchParams(location.search).get("timeMs") ?? 0);
      });

      const query = new URLSearchParams({
        component: c.element,
        height: String(c.height),
        scale: String(c.scale),
        state: c.state,
        timeMs: String(c.timeMs ?? 0),
        width: String(c.width),
      });

      const caseLabel = c.label;

      if (caseLabel !== null && caseLabel !== undefined) {
        query.set("label", caseLabel);
      }

      if (c.labels) {
        query.set("labels", JSON.stringify(c.labels));
      }

      const caseSelectedIndex = c.selectedIndex;

      if (caseSelectedIndex !== null && caseSelectedIndex !== undefined) {
        query.set("selectedIndex", String(caseSelectedIndex));
      }

      const caseDisabledIndex = c.disabledIndex;

      if (caseDisabledIndex !== null && caseDisabledIndex !== undefined) {
        query.set("disabledIndex", String(caseDisabledIndex));
      }

      await page.goto(`/?${query}`);
      const subject = page.locator("[data-subject]");
      await expect(subject).toBeVisible();
      await page.addStyleTag({
        content: `html,body{background:${c.background}} #root{visibility:hidden;${c.element === "select-list" ? "opacity:0;" : ""}} [data-subject]{visibility:visible} [data-mc-positioner]{left:0!important;top:0!important;transform:none!important}`,
      });
      await subject.evaluate(
        (node, p) =>
          Object.assign(node.style, {
            height: p.height + "px",
            left: p.x + "px",
            position: "fixed",
            top: p.y + "px",
            width: p.width + "px",
          }),
        {
          height: c.height * c.scale,
          width: c.width * c.scale,
          x: c.x * c.scale,
          y: c.y * c.scale,
        }
      );
      await expect(subject).toHaveAttribute("data-mc-select-ready", "true");
      await page.mouse.move(0, 0);

      if (c.state === "focus") {
        await subject.focus();
      } else {
        await page.evaluate(() => {
          (document.activeElement as HTMLElement)?.blur();
        });
      }

      if (c.state.endsWith("hover")) {
        await (
          c.element === "select-list"
            ? subject.getByRole("option").nth(c.targetIndex ?? 0)
            : subject
        ).hover();
      }

      // Minecraft hover probes keep the list unfocused; Base UI pointer focus is tested separately.
      if (c.element === "select-list" && c.state !== "focus") {
        await page.evaluate(() => {
          (document.activeElement as HTMLElement)?.blur();
        });
      }

      if (c.element === "select-list") {
        await subject.locator('[data-slot="select-viewport"]').evaluate(
          (node, scroll) => {
            node.scrollTop = scroll;
          },
          (c.value ?? 0) * c.scale
        );
      }

      await page.evaluate(
        async () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                resolve();
              })
            )
          )
      );

      for (const label of await subject
        .locator("[data-mc-label-ready]")
        .all()) {
        await expect(label).toHaveAttribute("data-mc-label-ready", "true");
      }

      const actualBytes = await subject.screenshot();
      writeFileSync(testInfo.outputPath("actual.png"), actualBytes);

      const expectedBytes = readFileSync(
        pixelPerfectFile(`${directory}/captures/${c.name}`)
      );

      expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(
        c.sha256
      );

      const expected = PNG.sync.read(expectedBytes);
      const actual = PNG.sync.read(actualBytes);

      expect([actual.width, actual.height]).toEqual([
        expected.width,
        expected.height,
      ]);
      const { diff, mismatches } = compareSelectPixels(expected, actual);
      writeFileSync(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
      writeFileSync(
        testInfo.outputPath("metrics.json"),
        JSON.stringify({
          case: c.name,
          mismatchedPixels: mismatches,
          tolerance: 0,
          totalPixels: actual.width * actual.height,
        })
      );
      await testInfo.attach("actual", {
        body: actualBytes,
        contentType: "image/png",
      });
      expect(mismatches).toBe(0);
    });
  }
});
