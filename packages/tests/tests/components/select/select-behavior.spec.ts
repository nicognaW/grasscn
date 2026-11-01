import { test, expect } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";

test("Select respects cancelled opening and closing in uncontrolled mode", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__selectVoices = 0;
    HTMLMediaElement.prototype.play = function () {
      (window as any).__selectVoices++;
      return Promise.resolve();
    };
  });
  await page.goto("/?component=select&cancelOpen=1");
  const trigger = page.getByRole("combobox");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.press("ArrowDown");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__selectVoices)).toBe(0);
  await page.goto("/?component=select&cancelClose=1");
  await trigger.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(await page.evaluate(() => (window as any).__selectVoices)).toBe(1);
});
test("Select keyboard navigation visits disabled options without committing them", async ({
  page,
}) => {
  await page.goto("/?component=select&disabledIndex=1");
  const trigger = page.getByRole("combobox", {
    name: "Game mode",
    exact: true,
  });
  await expect(trigger).toHaveText("Survival");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "Survival", exact: true })
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const disabled = page.getByRole("option", { name: "Creative", exact: true });
  await expect(disabled).toBeFocused();
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveText("Survival");
  await expect(page.getByLabel("Select changes", { exact: true })).toHaveText(
    "0"
  );
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "Adventure", exact: true })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveText("Adventure");
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel("Select changes", { exact: true })).toHaveText(
    "1"
  );
  await expect(page.getByRole("listbox")).toHaveCount(0);
});
test("Select pointer focus does not commit before activation, and Escape cancels", async ({
  page,
}) => {
  await page.goto("/?component=select");
  const trigger = page.getByRole("combobox");
  await trigger.click();
  const creative = page.getByRole("option", { name: "Creative", exact: true });
  await creative.hover();
  await expect(creative).toHaveAttribute("data-highlighted", "");
  await expect(page.getByLabel("Select changes", { exact: true })).toHaveText(
    "0"
  );
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveText("Survival");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("option", { name: "Creative", exact: true }).click();
  await expect(trigger).toHaveText("Creative");
  await expect(
    page.getByLabel("Selected game mode", { exact: true })
  ).toHaveText("item-1");
});
test("Select preserves controlled acceptance, rejection and external updates", async ({
  page,
}) => {
  await page.goto("/?component=select&controlled=1");
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Creative", exact: true }).click();
  await expect(page.getByRole("combobox")).toHaveText("Creative");
  await page.locator("#select-external").click();
  await expect(page.getByRole("combobox")).toHaveText("Adventure");
  await expect(page.getByLabel("Select changes", { exact: true })).toHaveText(
    "1"
  );
  await page.goto("/?component=select&controlled=1&reject=1");
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Creative", exact: true }).click();
  await expect(page.getByRole("combobox")).toHaveText("Survival");
  await expect(page.getByLabel("Select changes", { exact: true })).toHaveText(
    "1"
  );
});
test("Select supports an empty placeholder and semantic groups", async ({
  page,
}) => {
  await page.goto("/?component=select&selectedIndex=-1&group=1");
  await expect(page.getByRole("combobox")).toHaveText("Choose game mode");
  await page.getByRole("combobox").click();
  await expect(
    page.getByRole("group", { name: "Game modes", exact: true })
  ).toBeVisible();
  await expect(page.locator('[data-slot="select-separator"]')).toBeVisible();
  await page.getByRole("option", { name: "Adventure", exact: true }).click();
  await expect(page.getByRole("combobox")).toHaveText("Adventure");
});
test("Select participates in native forms and omits disabled values", async ({
  page,
}) => {
  await page.goto("/?component=select&form=1&required=1&selectedIndex=-1");
  await page.getByRole("button", { name: "Save mode", exact: true }).click();
  await expect(page.getByLabel("Submitted mode", { exact: true })).toHaveText(
    ""
  );
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Creative", exact: true }).click();
  await page.getByRole("button", { name: "Save mode", exact: true }).click();
  await expect(page.getByLabel("Submitted mode", { exact: true })).toHaveText(
    "item-1"
  );
  await page.goto("/?component=select&form=1&disabled=1");
  await expect(page.getByRole("combobox")).toBeDisabled();
  await page.getByRole("button", { name: "Save mode", exact: true }).click();
  await expect(page.getByLabel("Submitted mode", { exact: true })).toHaveText(
    "missing"
  );
});
test("Select Trigger, Content and Item preserve refs and asChild composition", async ({
  page,
}) => {
  await page.goto(
    "/?component=select&triggerAsChild=1&contentAsChild=1&itemAsChild=1"
  );
  await page.getByRole("combobox").click();
  await expect(
    page.locator('section[data-slot="select-content"] section[role="option"]')
  ).toBeVisible();
  await page.locator("#read-select-refs").dispatchEvent("click");
  await expect(page.getByLabel("Select refs", { exact: true })).toHaveText(
    "BUTTON/SECTION/SECTION"
  );
  await page.keyboard.press("End");
  await expect(
    page.getByRole("option", { name: "Adventure", exact: true })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("combobox")).toHaveText("Adventure");
});
test("Select uses the original cycle-button click for opening, while list selection and scrolling stay silent", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).selectVoices = [];
    HTMLMediaElement.prototype.play = function () {
      (window as any).selectVoices.push({
        source: this.src,
        volume: this.volume,
        rate: this.playbackRate,
      });
      return Promise.resolve();
    };
  });
  const voices = () => page.evaluate(() => (window as any).selectVoices);
  await page.goto("/?component=select");
  await page.getByRole("combobox").hover();
  expect(await voices()).toEqual([]);
  await page.getByRole("combobox").click();
  await expect
    .poll(voices)
    .toEqual([{ source: minecraftClickSound, volume: 0.25, rate: 1 }]);
  await page.getByRole("option", { name: "Creative", exact: true }).hover();
  await page.getByRole("option", { name: "Creative", exact: true }).click();
  expect(await voices()).toHaveLength(1);
  await page.goto("/?component=select-trigger&state=disabled");
  await page.getByRole("combobox").dispatchEvent("click");
  expect(await voices()).toEqual([]);
  await page.goto(
    `/?component=select&open=1&popper=1&labels=${encodeURIComponent(JSON.stringify(Array.from({ length: 9 }, (_, i) => `Option ${i + 1}`)))}`
  );
  const viewport = page.locator('[data-slot="select-viewport"]');
  await viewport.hover();
  await page.mouse.wheel(0, 120);
  await expect
    .poll(() => viewport.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(0);
  expect(await voices()).toEqual([]);
  await page.keyboard.press("End");
  await expect(
    page.getByRole("option", { name: "Option 9", exact: true })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("combobox")).toHaveText("Option 9");
  expect(await voices()).toEqual([]);
});
