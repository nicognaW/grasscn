import { readFile } from "node:fs/promises";
import path from "node:path";

import { test, expect, type Page } from "@grasscn/tests/test";
const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176";
async function primary(page: Page, name: string) {
  await page.goto(`${origin}/docs/components/${name}`);
  return page.locator(".documentation-example").first();
}
async function clipboard(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as unknown as { copied: string }).copied = value;
        },
      },
    });
  });
}

test("Slider docs default edits one controlled thumb", async ({ page }) => {
  const example = await primary(page, "slider");
  const slider = example.getByRole("slider", { name: "Volume", exact: true });
  await expect(slider).toHaveCount(1);
  await expect(slider).toHaveAttribute("aria-valuenow", "50");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "51");
});
test("Input docs defaults preserve editing and associated control state", async ({
  page,
}) => {
  test.setTimeout(120000);
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
  await example.getByRole("radio", { name: "Creative", exact: true }).check();
  await expect(
    example.getByRole("radio", { name: "Creative", exact: true })
  ).toBeChecked();
  await expect(
    example.getByRole("radio", { name: "Survival", exact: true })
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
  await example.getByRole("button", { name: "Send", exact: true }).click();
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
  await page.getByRole("option", { name: "Creative", exact: true }).click();
  await expect(example.getByRole("combobox", { name: "Game mode" })).toHaveText(
    "Creative"
  );
  example = await primary(page, "toggle-group");
  const crafting = example.getByRole("button", {
    name: "Crafting table",
    exact: true,
  });
  const furnace = example.getByRole("button", { name: "Furnace", exact: true });
  await expect(crafting).toHaveAttribute("aria-pressed", "true");
  await furnace.click();
  await expect(crafting).toHaveAttribute("aria-pressed", "false");
  await expect(furnace).toHaveAttribute("aria-pressed", "true");
  await furnace.click();
  await expect(furnace).toHaveAttribute("aria-pressed", "false");
  example = await primary(page, "combobox");
  await example.getByRole("combobox", { name: "Choose a biome" }).fill("Birch");
  await page.getByRole("option", { name: "Birch Forest", exact: true }).click();
  await expect(example.getByRole("combobox")).toHaveValue("Birch Forest");
  await example
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await expect(example.getByRole("combobox")).toHaveValue("");
});
test("OTP docs default completes the real six-character input", async ({
  page,
}) => {
  const example = await primary(page, "input-otp");
  const input = example.getByRole("textbox", {
    name: "One-time code",
    exact: true,
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
    name: "Field implementation source",
    exact: true,
  });
  await source.getByRole("button", { name: "Copy", exact: true }).click();
  const copied = await page.evaluate(
    () => (window as unknown as { copied: string }).copied
  );
  expect(copied).toContain("function Field(");
  expect(copied).not.toContain("function FormExample(");
  const install = page.getByRole("region", {
    name: "Field installation",
    exact: true,
  });
  await install.getByRole("tab", { name: "Manual", exact: true }).click();
  await expect(
    install.getByRole("button", { name: "field.tsx", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await install
    .getByRole("region", { name: "Selected manual file", exact: true })
    .getByRole("button", { name: /^Copy( full file)?$/ })
    .click();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied)
  ).toBe(copied);
});
test("Form docs block validates saves and resets", async ({ page }) => {
  const example = await primary(page, "form");
  await example
    .getByRole("button", { name: "Save player", exact: true })
    .click();
  await expect(example.getByRole("alert")).toContainText(
    "Enter your player name"
  );
  await example
    .getByRole("textbox", { name: "Player name", exact: true })
    .fill("Alex");
  await example
    .getByRole("button", { name: "Save player", exact: true })
    .click();
  await expect(
    example.getByRole("status", { name: "Saved player" })
  ).toContainText("Alex");
  await example.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(
    example.getByRole("textbox", { name: "Player name", exact: true })
  ).toHaveValue("");
});
test("Questionnaire docs default submits ordered answers", async ({ page }) => {
  const example = await primary(page, "questionnaire");
  await example.getByRole("radio", { name: /Survival/ }).check();
  await example.getByRole("button", { name: "Next", exact: true }).click();
  await example
    .getByRole("textbox", { name: "World name", exact: true })
    .fill("My world");
  await example
    .getByRole("button", { name: "Save world", exact: true })
    .click();
  await expect(
    example.getByRole("status", { name: "World setup result" })
  ).toContainText("My world: survival");
});
test("Input family docs copy complete executable primary examples", async ({
  page,
}) => {
  test.setTimeout(180000);
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
    await example.getByRole("tab", { name: "Code", exact: true }).click();
    await example.getByRole("button", { name: "Copy", exact: true }).click();
    const code = await readFile(
      path.resolve("../../apps/web/examples/inputs", `${name}-example.tsx`),
      "utf8"
    );
    expect(
      await page.evaluate(
        () => (window as unknown as { copied: string }).copied
      )
    ).toBe(code);
  }
});

test("Input docs default layouts fit desktop and narrow viewports", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  for (const width of [1536, 390])
    for (const name of ["form", "combobox"]) {
      await page.setViewportSize({ width, height: 900 });
      const example = await primary(page, name);
      await expect(example).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth)
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: info.outputPath(`${name}-${width}-actual.png`),
      });
    }
});
