import { readFile } from "node:fs/promises";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import type { Locator, Page } from "@grasscn/pixel-perfect/test";
import { referenceFile } from "@ppt/paths";
import { PNG } from "pngjs";

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

const focusByKeyboard = async function focusByKeyboard(
  page: Page,
  locator: Locator
) {
  for (let i = 0; i < 256; i += 1) {
    await page.keyboard.press("Tab");

    if (
      await locator.evaluate((element) => element === document.activeElement)
    ) {
      return;
    }
  }

  throw new Error("Preview control was not keyboard reachable");
};

const nativePixels = async function nativePixels(
  locator: Locator,
  file: string
) {
  const actual = PNG.sync.read(
    await locator.screenshot({ animations: "disabled" })
  );

  const expected = PNG.sync.read(
    await readFile(referenceFile(file.replace(/^tests\/reference\//u, "")))
  );

  expect([actual.width, actual.height]).toEqual([
    expected.width,
    expected.height,
  ]);
  expect(
    actual.data.equals(expected.data),
    "Preview chrome must preserve native pixels"
  ).toBe(true);
};

for (const scale of [2]) {
  test(`Preview native pixels at scale ${scale}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${origin}docs/components/button`);

    const button = page
      .locator(
        '.documentation-playground [data-stage="button"] [data-slot="button"]'
      )
      .first();

    await page.mouse.move(0, 0);
    await nativePixels(
      button,
      `tests/reference/captures/normal-w200-s${scale}.png`
    );
    await button.hover();
    await nativePixels(
      button,
      `tests/reference/captures/hover-w200-s${scale}.png`
    );
    await page.mouse.move(0, 0);
    await focusByKeyboard(page, button);
    await nativePixels(
      button,
      `tests/reference/captures/focus-w200-s${scale}.png`
    );
    await nativePixels(
      page
        .locator(
          '.documentation-playground [data-stage="button"] [data-slot="button"]'
        )
        .nth(1),
      `tests/reference/captures/disabled-w200-s${scale}.png`
    );
    await page.goto(`${origin}docs/components/checkbox`);

    const checkbox = page
      .locator(".documentation-playground")
      .getByRole("checkbox", { name: "Enable shadows" });

    await page.mouse.move(0, 0);
    await nativePixels(
      checkbox,
      `tests/reference/controls/captures/checkbox-unchecked-normal-s${scale}.png`
    );
    await focusByKeyboard(page, checkbox);
    await nativePixels(
      checkbox,
      `tests/reference/controls/captures/checkbox-unchecked-focus-s${scale}.png`
    );
    await nativePixels(
      page
        .locator(".documentation-playground")
        .getByRole("checkbox", { name: "Unavailable" }),
      `tests/reference/controls/captures/checkbox-checked-disabled-s${scale}.png`
    );
    await page.goto(`${origin}docs/components/slider`);

    const slider = page
      .locator('.documentation-playground [data-slot="slider"]')
      .first();

    await slider.hover();
    await nativePixels(
      slider,
      `tests/reference/slider/captures/slider-w200-v500-hover-s${scale}.png`
    );
    await nativePixels(
      page.locator('.documentation-playground [data-slot="slider"]').nth(1),
      `tests/reference/slider/captures/slider-w200-v500-disabled-s${scale}.png`
    );
    await page.goto(`${origin}docs/components/input`);

    const input = page
      .locator(".documentation-playground")
      .getByRole("textbox", { exact: true, name: "Demo input" });

    await expect(input).toHaveAttribute("data-mc-ready", "true");
    await page.mouse.move(0, 0);
    await nativePixels(
      input,
      `tests/reference/input/captures/input-w200-normal-c39-s${scale}.png`
    );

    const readonly = page
      .locator(".documentation-playground")
      .getByRole("textbox", { exact: true, name: "Read-only demo input" });

    await expect(readonly).toHaveAttribute("data-mc-ready", "true");
    await nativePixels(
      readonly,
      `tests/reference/input/captures/input-w200-readonly-c44-s${scale}.png`
    );

    const disabled = page
      .locator(".documentation-playground")
      .getByRole("textbox", { exact: true, name: "Disabled demo input" });

    await expect(disabled).toHaveAttribute("data-mc-ready", "true");
    await nativePixels(
      disabled,
      `tests/reference/input/captures/input-w200-disabled-c41-s${scale}.png`
    );
    await page.goto(`${origin}docs/components/textarea`);

    const textarea = page
      .locator(".documentation-playground")
      .getByRole("textbox", { exact: true, name: "Demo textarea" });

    await expect(textarea).toHaveAttribute("data-mc-ready", "true");
    await page.mouse.move(0, 0);
    await nativePixels(
      textarea,
      `tests/reference/textarea/captures/textarea-c18-s${scale}.png`
    );

    for (const name of ["Read-only demo textarea", "Disabled demo textarea"]) {
      const field = page
        .locator(".documentation-playground")
        .getByRole("textbox", { exact: true, name });

      await expect(field).toHaveAttribute("data-mc-ready", "true");
      await nativePixels(
        field,
        `tests/reference/textarea/captures/textarea-c18-s${scale}.png`
      );
    }

    await page.goto(`${origin}docs/components/separator`);

    await nativePixels(
      page
        .locator(".documentation-playground")
        .getByRole("separator", { exact: true, name: "Menu header separator" }),
      `tests/reference/separator/captures/separator-c6-s${scale}.png`
    );
    await nativePixels(
      page
        .locator(".documentation-playground")
        .getByRole("separator", { exact: true, name: "Menu footer separator" }),
      `tests/reference/separator/captures/separator-c24-s${scale}.png`
    );
    await page.goto(`${origin}docs/components/scroll-area`);

    const scrollArea = page
      .locator(".documentation-playground")
      .getByRole("region", { exact: true, name: "Demo scroll area" });

    await expect(scrollArea).toHaveAttribute("data-mc-scroll-ready", "true");
    await page.mouse.move(0, 0);
    await nativePixels(
      scrollArea,
      `tests/reference/scroll-area/captures/scroll-area-c69-s${scale}.png`
    );
    await page.goto(`${origin}docs/components/progress`);

    const progress = page
      .locator(".documentation-playground")
      .getByRole("progressbar", { exact: true, name: "Demo progress" });

    await page.mouse.move(0, 0);
    await nativePixels(
      progress,
      `tests/reference/progress/captures/progress-c6-s${scale}.png`
    );
    await page
      .locator(".documentation-playground")
      .getByRole("button", { exact: true, name: "Boss bar notches: None" })
      .click();
    await expect(progress.locator("canvas")).toHaveAttribute(
      "data-mc-progress-painted",
      "true"
    );
    await nativePixels(
      progress,
      `tests/reference/progress/captures/progress-c18-s${scale}.png`
    );
  });
}

test("Preview text fields share the native focused Input pixels", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));
  await page.goto(`${origin}docs/components/button`);

  const fields = [
    { name: "Button label", path: "button" },
    { name: "Demo input", path: "input" },
    { name: "Find a component", path: "input" },
  ];

  // Match a captured vanilla case so preview CSS cannot add a second focus ring.
  for (const entry of fields) {
    await page.goto(`${origin}docs/components/${entry.path}`);

    const field = page
      .locator(".documentation-playground")
      .getByLabel(entry.name, { exact: true });

    await field.fill("");
    await field.evaluate((element: HTMLInputElement) => {
      const input = element;
      input.style.width = "206px";
      input.style.height = "40px";
      input.placeholder = "";
    });
    await expect(field).toHaveAttribute("data-slot", "input");
    await page.clock.runFor(100);
    await expect(field).toHaveCSS("outline-style", "none");
    await nativePixels(
      field,
      "tests/reference/input/captures/input-w103-focus-c3-s2.png"
    );
  }
});

for (const scale of [2]) {
  test(`Tabs preview preserves native tab bar at scale ${scale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1536, height: 900 });
    await page.goto(`${origin}docs/components/tabs`);

    const list = page
      .locator(".documentation-playground")
      .getByRole("tablist", { exact: true, name: "World settings" });

    await expect(list).toHaveAttribute("data-mc-tabs-ready", "true");
    await page.mouse.move(0, 0);
    await nativePixels(
      list,
      `tests/reference/tabs/captures/tabs-c136-s${scale}.png`
    );
  });
}

for (const scale of [2]) {
  test(`Select preview preserves native cycle button at scale ${scale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1536, height: 900 });
    await page.goto(`${origin}docs/components/select`);

    const trigger = page
      .locator(".documentation-playground")
      .getByRole("combobox", { exact: true, name: "Demo game mode" });

    await expect(trigger).toHaveText("Survival");
    await expect(trigger).toHaveAttribute("data-mc-select-ready", "true");
    await page.mouse.move(0, 0);
    await nativePixels(
      trigger,
      `tests/reference/select/captures/select-c70-s${scale}.png`
    );
  });
}

for (const scale of [2]) {
  test(`Radio Group preview preserves native widget pixels at scale ${scale}`, async ({
    page,
  }) => {
    await page.goto(`${origin}docs/components/radio-group`);

    const radio = page
      .locator(".documentation-playground")
      .getByRole("radiogroup", { exact: true, name: "Demo radio game mode" })
      .getByRole("radio", { exact: true, name: "Survival" });

    await expect(radio).toBeChecked();
    await page.mouse.move(0, 0);
    await nativePixels(
      radio,
      `tests/reference/radio-group/captures/radio-group-c8-s${scale}.png`
    );
  });
}

for (const scale of [2]) {
  test(`Switch preview preserves native on/off pixels at scale ${scale}`, async ({
    page,
  }) => {
    await page.goto(`${origin}docs/components/switch`);

    const control = page
      .locator(".documentation-playground")
      .getByRole("switch", { exact: true, name: "Enable clouds" });

    await expect(control).not.toBeChecked();
    await page.mouse.move(0, 0);
    await nativePixels(
      control,
      `tests/reference/switch/captures/switch-c16-s${scale}.png`
    );
  });
}
