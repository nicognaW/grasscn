import { writeFileSync } from "node:fs";

import { test, expect } from "@grasscn/tests/test";
import {
  recordPitchedPlayback,
  recordedPitchedPlayback,
} from "@tests/harness/audio-playback";

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

test("Combobox opens, filters CJK, selects with keyboard and submits native form values", async ({
  page,
}) => {
  await page.goto("/?component=combobox");
  const input = page.getByRole("combobox");
  await expect(input).toHaveAttribute("spellcheck", "false");
  await expect(input).toHaveAttribute("autocorrect", "off");
  await input.fill("世界");
  await expect(page.getByRole("option")).toHaveCount(1);
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page.locator("#value")).toHaveText("世界");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.locator("#submit").click();
  await expect(page.locator("#attempt")).toHaveText("世界");
  await expect(input).toHaveAttribute("data-mc-bitmap", "true");
});

test("Combobox skips disabled entries, honors Escape and restores focus", async ({
  page,
}) => {
  await page.goto("/?component=combobox");
  const input = page.getByRole("combobox");
  await input.fill("Bedrock");
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(
    page.getByRole("option", { exact: true, name: "Bedrock" })
  ).toHaveAttribute("aria-disabled", "true");
  await page
    .getByRole("option", { exact: true, name: "Bedrock" })
    .dispatchEvent("click");
  await expect(page.locator("#value")).toHaveText("none");
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page.locator("#value")).toHaveText("none");
  await input.fill("St");
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page.locator("#value")).toHaveText("Stick");
  await page.getByRole("button", { name: "Show options" }).click();
  await input.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(input).toBeFocused();
});

test("Combobox clears selection and reports empty filtered results without removing live status", async ({
  page,
}) => {
  await page.goto("/?component=combobox&initial=1");
  await page.locator("#explicit-clear").click();
  await expect(page.locator("#value")).toHaveText("none");
  const input = page.getByRole("combobox");
  await input.fill("nothing-found");
  await expect(page.getByRole("status")).toHaveText("No blocks found.");
  await expect(page.getByRole("option")).toHaveCount(0);
  await input.fill("Stone");
  await expect(page.getByRole("status")).toBeEmpty();
  await expect(page.getByRole("option")).toHaveCount(1);
});

test("Combobox preserves render functions, state classes, DOM refs and labeled groups", async ({
  page,
}) => {
  await page.goto("/?component=combobox&customRender=1");
  const input = page.getByRole("combobox");
  await input.click();
  await expect(input).toHaveAttribute("data-custom", "open");
  await expect(input).toHaveClass(/custom-open/u);
  await expect(page.locator("[data-rendered]")).toHaveCount(4);
  await page.locator("#ref").dispatchEvent("click");
  await expect(page.locator("#refs")).toHaveText("INPUT/DIV");
  await page.goto("/?component=combobox&grouped=1");
  await page.getByRole("combobox").click();
  await expect(
    page.getByRole("group", { name: "Building blocks" })
  ).toBeVisible();
  await expect(page.locator("[data-slot=combobox-separator]")).toHaveAttribute(
    "role",
    "presentation"
  );
  await expect(page.getByRole("option")).toHaveCount(4);
});

test("Combobox respects controlled cancellation and disabled/read-only state", async ({
  page,
}) => {
  await page.goto("/?component=combobox&initial=1&reject=1");
  const input = page.getByRole("combobox");
  await input.fill("Stick");
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page.locator("#attempt")).toHaveText("Stick");
  await expect(page.locator("#value")).toHaveText("Stone");
  await page.goto("/?component=combobox&rejectOpen=1");
  await page.getByRole("button", { name: "Show options" }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.goto("/?component=combobox&disabled=1");
  await expect(page.getByRole("combobox")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Show options" })
  ).toBeDisabled();
  await page.goto("/?component=combobox&readOnly=1");
  await expect(page.getByRole("combobox")).toHaveAttribute("readonly", "");
});

test("Combobox multiple mode preserves values, collection rendering and chip removal keyboard behavior", async ({
  page,
}) => {
  await page.goto("/?component=combobox&multiple=1");
  const input = page.getByRole("combobox");
  await input.fill("世界");
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page.locator("#value")).toHaveText("Stone,世界");
  await expect(page.locator("[data-slot=combobox-chip]")).toHaveCount(2);
  await page.locator("[data-slot=combobox-chip-remove]").first().click();
  await expect(page.locator("#value")).toHaveText("世界");
  await input.fill("");
  await input.press("ArrowLeft");
  await input.press("Backspace");
  await expect(page.locator("#value")).toBeEmpty();
  await page.goto("/?component=combobox&multiple=1&manualRemove=1");
  await page.getByRole("button", { exact: true, name: "Remove Stone" }).click();
  await expect(page.locator("#value")).toBeEmpty();
});

test("Combobox uses original click audio for native buttons while typing and choosing suggestions stay silent", async ({
  page,
}) => {
  await recordPitchedPlayback(page);
  await page.goto("/?component=combobox");
  await page.getByRole("button", { name: "Show options" }).click();
  const awaitedRecordedPitchedPlayback1 = await recordedPitchedPlayback(page);
  expect(awaitedRecordedPitchedPlayback1.length).toBe(1);
  await page.getByRole("combobox").fill("Stone");
  await page.getByRole("combobox").press("ArrowDown");
  await page.getByRole("combobox").press("Enter");
  const awaitedRecordedPitchedPlayback2 = await recordedPitchedPlayback(page);
  expect(awaitedRecordedPitchedPlayback2.length).toBe(1);
  await page.locator("#explicit-clear").click();
  const sounds = await recordedPitchedPlayback(page);
  expect(sounds.length).toBe(2);
  expect(
    sounds.every(
      (s) =>
        s.source.startsWith("data:audio/ogg;base64,") &&
        s.volume === 0.25 &&
        s.pitch === 1
    )
  ).toBe(true);
});

test("Combobox IME Enter cannot commit a suggestion before CJK composition completes", async ({
  page,
}) => {
  await page.goto("/?component=combobox");
  const input = page.getByRole("combobox");
  await input.focus();
  await input.dispatchEvent("compositionstart", { data: "世" });
  await input.evaluate((node) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )!.set!;

    setter.call(node, "世界");
    node.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        composed: true,
        data: "世界",
        inputType: "insertCompositionText",
        isComposing: true,
      })
    );
  });
  await input.dispatchEvent("keydown", {
    code: "Enter",
    isComposing: true,
    key: "Enter",
    keyCode: 229,
  });
  await expect(page.locator("#value")).toHaveText("none");
  await input.dispatchEvent("compositionend", { data: "世界" });
  await expect(input).toHaveValue("世界");
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page.locator("#value")).toHaveText("世界");
  await expect(input).toHaveAttribute("data-mc-bitmap", "true");
});
