import { readFile } from "node:fs/promises";
import path from "node:path";

import { test, expect } from "@grasscn/tests/test";
import type { Page } from "@grasscn/tests/test";

const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";

const primary = async (page: Page, name: string) => {
  await page.goto(`${origin}/docs/components/${name}`);

  return page.locator(".documentation-example").first();
};

const clipboard = async (page: Page) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        // eslint-disable-next-line require-await -- The clipboard mock preserves the asynchronous browser API while recording its supplied text synchronously.
        writeText: async (value: string) => {
          window.copied = value;
        },
      },
    });
  });
};

// These properties capture clipboard writes performed by this test page.
declare global {
  interface Window {
    copied: string;
  }
}

test("Slider docs default edits one controlled thumb", async ({ page }) => {
  const example = await primary(page, "slider");
  const slider = example.getByRole("slider", { exact: true, name: "Volume" });
  await expect(slider).toHaveCount(1);
  await expect(slider).toHaveAttribute("aria-valuenow", "50");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "51");
});

test("Input docs defaults preserve editing and associated control state", async ({
  page,
}) => {
  test.setTimeout(120_000);
  let example = await primary(page, "checkbox");
  const checkbox = example.getByRole("checkbox", { name: "Enable shadows" });
  await expect(checkbox).not.toBeChecked();
  await example.locator("label").filter({ hasText: "Enable shadows" }).click();
  await expect(checkbox).toBeChecked();
  example = await primary(page, "input");
  await example.getByRole("textbox", { name: "Player name" }).fill("Alex");
  await expect(example.getByRole("textbox")).toHaveValue("Alex");
  example = await primary(page, "textarea");
  await example
    .getByRole("textbox", { name: "Journey notes" })
    .fill("First\nSecond");
  await expect(example.getByRole("textbox")).toHaveValue("First\nSecond");
  example = await primary(page, "label");
  await example.locator("label").filter({ hasText: "Player name" }).click();
  await expect(
    example.getByRole("textbox", { name: "Player name" })
  ).toBeFocused();
  example = await primary(page, "radio-group");
  await example.getByRole("radio", { exact: true, name: "Creative" }).check();
  await expect(
    example.getByRole("radio", { exact: true, name: "Creative" })
  ).toBeChecked();
  await expect(
    example.getByRole("radio", { exact: true, name: "Survival" })
  ).not.toBeChecked();
  example = await primary(page, "switch");
  const clouds = example.getByRole("switch", { name: "Enable clouds" });
  await clouds.focus();
  await page.keyboard.press("Space");
  await expect(clouds).toBeChecked();
  example = await primary(page, "toggle");

  const toggle = example.getByRole("button", {
    name: "Only craftable recipes",
  });

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  example = await primary(page, "native-select");
  await example
    .getByRole("combobox", { name: "Native world mode" })
    .selectOption("creative");
  await expect(
    example.getByRole("combobox", { name: "Native world mode" })
  ).toHaveValue("creative");
  example = await primary(page, "input-group");
  await example.getByRole("textbox", { name: "Chat message" }).fill("Hello");
  await example.getByRole("button", { exact: true, name: "Send" }).click();
  await expect(
    example.getByRole("status", { name: "Sent message" })
  ).toContainText("Hello");
  await expect(example.getByRole("textbox")).toHaveValue("");
});

test("Selection docs defaults resolve labels arrays and suggestions", async ({
  page,
}) => {
  let example = await primary(page, "select");
  await example.getByRole("combobox", { name: "Game mode" }).click();
  await page.getByRole("option", { exact: true, name: "Creative" }).click();
  await expect(example.getByRole("combobox", { name: "Game mode" })).toHaveText(
    "Creative"
  );
  example = await primary(page, "toggle-group");

  const crafting = example.getByRole("button", {
    exact: true,
    name: "Crafting table",
  });

  const furnace = example.getByRole("button", { exact: true, name: "Furnace" });
  await expect(crafting).toHaveAttribute("aria-pressed", "true");
  await furnace.click();
  await expect(crafting).toHaveAttribute("aria-pressed", "false");
  await expect(furnace).toHaveAttribute("aria-pressed", "true");
  await furnace.click();
  await expect(furnace).toHaveAttribute("aria-pressed", "false");
  example = await primary(page, "combobox");
  await example.getByRole("combobox", { name: "Choose a biome" }).fill("Birch");
  await page.getByRole("option", { exact: true, name: "Birch Forest" }).click();
  await expect(example.getByRole("combobox")).toHaveValue("Birch Forest");
  await example
    .getByRole("button", { exact: true, name: "Clear selection" })
    .click();
  await expect(example.getByRole("combobox")).toHaveValue("");
});

test("OTP docs default completes the real six-character input", async ({
  page,
}) => {
  const example = await primary(page, "input-otp");

  const input = example.getByRole("textbox", {
    exact: true,
    name: "One-time code",
  });

  await expect(input).toHaveCount(1);
  await input.fill("ABC123");
  await expect(
    example.getByRole("status", { name: "Completed code" })
  ).toContainText("Complete: ABC123");
});

test("Field docs implementation and manual copy select the owned file", async ({
  page,
}) => {
  const example = await primary(page, "field");
  await example.locator("label").filter({ hasText: "World name" }).click();
  await expect(
    example.getByRole("textbox", { name: "World name" })
  ).toBeFocused();
  await clipboard(page);

  const source = page.getByRole("region", {
    exact: true,
    name: "Field implementation source",
  });

  await source.getByRole("button", { exact: true, name: "Copy" }).click();

  const copied = await page.evaluate(() => window.copied);

  expect(copied).toContain("function Field(");
  expect(copied).not.toContain("function FormExample(");

  const install = page.getByRole("region", {
    exact: true,
    name: "Field installation",
  });

  await install.getByRole("tab", { exact: true, name: "Manual" }).click();
  await expect(
    install.getByRole("button", { exact: true, name: "field.tsx" })
  ).toHaveAttribute("aria-pressed", "true");
  await install
    .getByRole("region", { exact: true, name: "Selected manual file" })
    .getByRole("button", { name: /^Copy(?: full file)?$/u })
    .click();
  expect(await page.evaluate(() => window.copied)).toBe(copied);
});

test("Form docs block validates saves and resets", async ({ page }) => {
  const example = await primary(page, "form");
  await example
    .getByRole("button", { exact: true, name: "Save player" })
    .click();
  await expect(example.getByRole("alert")).toContainText(
    "Enter your player name"
  );
  await example
    .getByRole("textbox", { exact: true, name: "Player name" })
    .fill("Alex");
  await example
    .getByRole("button", { exact: true, name: "Save player" })
    .click();
  await expect(
    example.getByRole("status", { name: "Saved player" })
  ).toContainText("Alex");
  await example.getByRole("button", { exact: true, name: "Reset" }).click();
  await expect(
    example.getByRole("textbox", { exact: true, name: "Player name" })
  ).toHaveValue("");
});

test("Questionnaire docs default submits ordered answers", async ({ page }) => {
  const example = await primary(page, "questionnaire");
  await example.getByRole("radio", { name: /Survival/u }).check();
  await example.getByRole("button", { exact: true, name: "Next" }).click();
  await example
    .getByRole("textbox", { exact: true, name: "World name" })
    .fill("My world");
  await example
    .getByRole("button", { exact: true, name: "Save world" })
    .click();
  await expect(
    example.getByRole("status", { name: "World setup result" })
  ).toContainText("My world: survival");
});

test("Input family docs copy complete executable primary examples", async ({
  page,
}) => {
  test.setTimeout(180_000);

  /* eslint-disable no-await-in-loop -- Complete each interaction and assertion on the current page before navigating or changing its state. */
  for (const name of [
    "checkbox",
    "slider",
    "input",
    "textarea",
    "label",
    "select",
    "radio-group",
    "switch",
    "toggle",
    "toggle-group",
    "native-select",
    "input-group",
    "input-otp",
    "combobox",
    "form",
    "field",
    "questionnaire",
  ]) {
    const example = await primary(page, name);
    await clipboard(page);
    await example.getByRole("tab", { exact: true, name: "Code" }).click();
    await example.getByRole("button", { exact: true, name: "Copy" }).click();

    const code = await readFile(
      path.resolve("../../apps/web/examples/inputs", `${name}-example.tsx`),
      "utf-8"
    );

    expect(await page.evaluate(() => window.copied)).toBe(code);
  }
  /* eslint-enable no-await-in-loop */
});

test("Input docs default layouts fit desktop and narrow viewports", async ({
  page,
}, info) => {
  test.setTimeout(120_000);

  for (const width of [1536, 390]) {
    /* eslint-disable no-await-in-loop -- Complete each interaction and assertion on the current page before navigating or changing its state. */
    for (const name of ["form", "combobox"]) {
      await page.setViewportSize({ height: 900, width });
      const example = await primary(page, name);
      await expect(example).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth)
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: info.outputPath(`${name}-${width}-actual.png`),
      });
    }
    /* eslint-enable no-await-in-loop */
  }
});
