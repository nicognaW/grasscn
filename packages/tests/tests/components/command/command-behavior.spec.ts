import { test, expect } from "@grasscn/tests/test";
import {
  recordAudioSources,
  recordedAudioSources,
} from "@tests/harness/audio-playback";

test("Command filters keywords and CJK while preserving real input and refs", async ({
  page,
}) => {
  await page.goto("/?component=command");
  const input = page.getByRole("combobox");
  await expect(input).toHaveAttribute("spellcheck", "false");
  await expect(input).toHaveAttribute("autocorrect", "off");
  await input.fill("rock");
  await expect(page.getByRole("option")).toHaveCount(2);
  await expect(
    page.getByRole("option", { exact: true, name: "Stone Ctrl S" })
  ).toContainText("Stone");
  await expect(
    page.getByRole("option", { exact: true, name: "Bedrock" })
  ).toHaveAttribute("aria-disabled", "true");
  await input.fill("世界");
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("option")).toHaveAccessibleName("世界");
  await input.press("Enter");
  await expect(page.getByLabel("Selected command")).toHaveText("world");
  await input.fill("unavailable");
  await expect(
    page.getByText("No commands found.", { exact: true })
  ).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(0);
  await page.locator("#read-ref").click();
  await expect(page.getByLabel("Selected command")).toHaveText("INPUT");
});

test("Command supports pointer, keyboard navigation and disabled entries", async ({
  page,
}) => {
  await page.goto("/?component=command");
  const input = page.getByRole("combobox");
  await input.focus();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page.getByLabel("Selected command")).toHaveText("stick");
  await page.getByRole("option", { exact: true, name: "Settings" }).click();
  await expect(page.getByLabel("Selected command")).toHaveText("settings");
  await page
    .getByRole("option", { exact: true, name: "Bedrock" })
    .dispatchEvent("click");
  await expect(page.getByLabel("Selected command")).toHaveText("settings");
  await input.fill("");
  await input.press("End");
  await input.press("Enter");
  await expect(page.getByLabel("Selected command")).toHaveText("settings");
});

test("Command Dialog has accessible text, modal focus and Escape dismissal", async ({
  page,
}) => {
  await page.goto("/?component=command&dialog=1");

  const trigger = page.getByRole("button", {
    exact: true,
    name: "Open commands",
  });

  await trigger.click();

  const dialog = page.getByRole("dialog", {
    exact: true,
    name: "World commands",
  });

  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription("Find a command");
  const input = dialog.getByRole("combobox");
  await input.fill("世界");
  await input.press("Enter");
  await expect(page.getByLabel("Selected command")).toHaveText("world");
  await input.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { exact: true, name: "Done" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Command input and selection stay silent like native command suggestions", async ({
  page,
}) => {
  await recordAudioSources(page);
  await page.goto("/?component=command");
  const input = page.getByRole("combobox");
  await input.fill("stone");
  await input.press("Enter");
  await page.getByRole("option").hover();
  await page.getByRole("option").click();
  expect(await recordedAudioSources(page)).toEqual([]);
});
