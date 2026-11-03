import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { expectTruthy } from "@grasscn/tests/assertions";
import type { SelectReferenceCase } from "@ppt/installed/reference-case";
import { compareSelectPixels } from "@ppt/harness/families/select-pixel-compare";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

type SelectInteractionCase =
  | (Omit<SelectReferenceCase, "element" | "labels"> & {
      element: "select-trigger";
      labels?: string[];
    })
  | (Omit<SelectReferenceCase, "element" | "labels"> & {
      element: "select-list";
      labels: string[];
    });

interface SelectInteractionManifest {
  cases: SelectInteractionCase[];
}

// SAFETY: The retained Select producer emits432trigger cases and366list cases; every list supplies its labels, and the source renderer reads labels only for select-list.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact fixed retained Select producer; preserve this original fresh read and parse.
const manifest = JSON.parse(
  readFileSync(
    pixelPerfectFile("tests/reference/select/manifest.json"),
    "utf-8"
  )
) as SelectInteractionManifest;

for (const scale of [1, 2, 3]) {
  for (const mode of ["pointer", "keyboard"]) {
    test(`Select ${mode} focus preserves original list pixels at scale ${scale}`, async ({
      page,
    }, testInfo) => {
      const c = manifest.cases.find(
        (selectListCase) =>
          selectListCase.element === "select-list" &&
          selectListCase.width === 300 &&
          selectListCase.height === 80 &&
          selectListCase.labels.length === 3 &&
          selectListCase.selectedIndex === 1 &&
          selectListCase.state === "focus" &&
          selectListCase.background === "#202020" &&
          selectListCase.disabledIndex === undefined &&
          selectListCase.scale === scale
      );

      expectTruthy(c);
      await page.setViewportSize({ height: 900, width: 1536 });
      await page.goto(`/?component=select&popper=1&scale=${scale}`);
      const trigger = page.getByRole("combobox");

      if (mode === "pointer") {
        await trigger.click();
      } else {
        await trigger.focus();
        await page.keyboard.press("ArrowDown");
      }

      const popup = page.locator('[data-slot="select-content"]');
      await expect(popup).toHaveAttribute("data-mc-select-ready", "true");
      await popup.evaluate(
        (node, p) =>
          Object.assign(node.style, {
            position: "fixed",
            left: `${p.x  }px`,
            top: `${p.y  }px`,
          }),
        { x: c.x * scale, y: c.y * scale }
      );
      await page.addStyleTag({
        content:
          "#root{opacity:0} [data-mc-positioner]{left:0!important;top:0!important;transform:none!important}",
      });
      await page.mouse.move(0, 0);

      const creative = page.getByRole("option", {
        exact: true,
        name: "Creative",
      });

      if (mode === "pointer") {
        await creative.hover();
      } else {
        await expect(
          page.getByRole("option", { exact: true, name: "Survival" })
        ).toBeFocused();
        await page.keyboard.press("ArrowDown");
      }

      if (mode === "keyboard") {
        await expect(creative).toBeFocused();
      }

      await expect(creative).toHaveAttribute("data-highlighted", "");
      await expect(
        page.getByLabel("Select changes", { exact: true })
      ).toHaveText("0");
      const actualBytes = await popup.screenshot();

      const expected = PNG.sync.read(
        readFileSync(
          pixelPerfectFile(`tests/reference/select/captures/${c.name}`)
        )
      );

      writeFileSync(testInfo.outputPath("actual.png"), actualBytes);
      writeFileSync(
        testInfo.outputPath("metrics.json"),
        JSON.stringify({
          component: "select",
          manifest: "tests/reference/select/manifest.json",
          case: c.name,
          part: "list",
          alias: mode,
        })
      );
      await testInfo.attach("actual", {
        body: actualBytes,
        contentType: "image/png",
      });
      expect(
        compareSelectPixels(expected, PNG.sync.read(actualBytes)).mismatches
      ).toBe(0);
    });
  }
}
