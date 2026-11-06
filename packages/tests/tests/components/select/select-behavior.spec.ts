import { test, expect } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";

interface SelectClickPlaybackState extends Window {
  selectVoices?: { rate: number; source: string; volume: number }[];
}

type InitializedSelectClickPlaybackState = typeof window &
  SelectClickPlaybackState & {
    selectVoices: { rate: number; source: string; volume: number }[];
  };

interface SelectPlaybackState extends Window {
  __selectVoices?: number;
}

type InitializedSelectPlaybackState = typeof window &
  SelectPlaybackState & {
    __selectVoices: number;
  };

test("Select respects cancelled opening and closing in uncontrolled mode", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // SAFETY: this write installs the actual recorder field on the new page; it is optional before this producer assignment.
    (window as SelectPlaybackState).__selectVoices = 0;
    // oxlint-disable-next-line typescript/promise-function-async, unicorn/consistent-function-scoping -- This browser API stub records synchronously and returns its original fulfilled Promise; async would change throw and Promise-adoption timing. Keep play inside this initializer because Playwright serializes the callback without its Node lexical scope.
    HTMLMediaElement.prototype.play = function play() {
      // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
      // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
      (window as InitializedSelectPlaybackState).__selectVoices += 1;
      // oxlint-enable typescript/no-unsafe-type-assertion

      return Promise.resolve();
    };
  });
  await page.goto("/?component=select&cancelOpen=1");
  const trigger = page.getByRole("combobox");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.press("ArrowDown");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
  expect(
    await page.evaluate(
      () => (window as InitializedSelectPlaybackState).__selectVoices
    )
  ).toBe(0);
  // oxlint-enable typescript/no-unsafe-type-assertion
  await page.goto("/?component=select&cancelClose=1");
  await trigger.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
  expect(
    await page.evaluate(
      () => (window as InitializedSelectPlaybackState).__selectVoices
    )
  ).toBe(1);
  // oxlint-enable typescript/no-unsafe-type-assertion
});

test("Select keyboard navigation visits disabled options without committing them", async ({
  page,
}) => {
  await page.goto("/?component=select&disabledIndex=1");

  const trigger = page.getByRole("combobox", {
    exact: true,
    name: "Game mode",
  });

  await expect(trigger).toHaveText("Survival");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { exact: true, name: "Survival" })
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const disabled = page.getByRole("option", { exact: true, name: "Creative" });
  await expect(disabled).toBeFocused();
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveText("Survival");
  await expect(page.getByLabel("Select changes", { exact: true })).toHaveText(
    "0"
  );
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { exact: true, name: "Adventure" })
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
  const creative = page.getByRole("option", { exact: true, name: "Creative" });
  await creative.hover();
  await expect(creative).toHaveAttribute("data-highlighted", "");
  await expect(page.getByLabel("Select changes", { exact: true })).toHaveText(
    "0"
  );
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveText("Survival");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("option", { exact: true, name: "Creative" }).click();
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
  await page.getByRole("option", { exact: true, name: "Creative" }).click();
  await expect(page.getByRole("combobox")).toHaveText("Creative");
  await page.locator("#select-external").click();
  await expect(page.getByRole("combobox")).toHaveText("Adventure");
  await expect(page.getByLabel("Select changes", { exact: true })).toHaveText(
    "1"
  );
  await page.goto("/?component=select&controlled=1&reject=1");
  await page.getByRole("combobox").click();
  await page.getByRole("option", { exact: true, name: "Creative" }).click();
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
    page.getByRole("group", { exact: true, name: "Game modes" })
  ).toBeVisible();
  await expect(page.locator('[data-slot="select-separator"]')).toBeVisible();
  await page.getByRole("option", { exact: true, name: "Adventure" }).click();
  await expect(page.getByRole("combobox")).toHaveText("Adventure");
});

test("Select participates in native forms and omits disabled values", async ({
  page,
}) => {
  await page.goto("/?component=select&form=1&required=1&selectedIndex=-1");
  await page.getByRole("button", { exact: true, name: "Save mode" }).click();
  await expect(page.getByLabel("Submitted mode", { exact: true })).toHaveText(
    ""
  );
  await page.getByRole("combobox").click();
  await page.getByRole("option", { exact: true, name: "Creative" }).click();
  await page.getByRole("button", { exact: true, name: "Save mode" }).click();
  await expect(page.getByLabel("Submitted mode", { exact: true })).toHaveText(
    "item-1"
  );
  await page.goto("/?component=select&form=1&disabled=1");
  await expect(page.getByRole("combobox")).toBeDisabled();
  await page.getByRole("button", { exact: true, name: "Save mode" }).click();
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
    page.getByRole("option", { exact: true, name: "Adventure" })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("combobox")).toHaveText("Adventure");
});

test("Select uses the original cycle-button click for opening, while list selection and scrolling stay silent", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // SAFETY: this write installs the actual recorder field on the new page; it is optional before this producer assignment.
    (window as SelectClickPlaybackState).selectVoices = [];
    // oxlint-disable-next-line typescript/promise-function-async, unicorn/consistent-function-scoping -- This browser API stub records synchronously and returns its original fulfilled Promise; async would change throw and Promise-adoption timing. Keep play inside this initializer because Playwright serializes the callback without its Node lexical scope.
    HTMLMediaElement.prototype.play = function play() {
      // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
      // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
      (window as InitializedSelectClickPlaybackState).selectVoices.push({
        rate: this.playbackRate,
        source: this.src,
        volume: this.volume,
      });
      // oxlint-enable typescript/no-unsafe-type-assertion

      return Promise.resolve();
    };
  });

  // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
  const voices = async () =>
    await page.evaluate(
      () => (window as InitializedSelectClickPlaybackState).selectVoices
    );
  // oxlint-enable typescript/no-unsafe-type-assertion

  await page.goto("/?component=select");
  await page.getByRole("combobox").hover();
  expect(await voices()).toEqual([]);
  await page.getByRole("combobox").click();
  await expect
    .poll(voices)
    .toEqual([{ rate: 1, source: minecraftClickSound, volume: 0.25 }]);
  await page.getByRole("option", { exact: true, name: "Creative" }).hover();
  await page.getByRole("option", { exact: true, name: "Creative" }).click();
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
    .poll(async () => await viewport.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(0);
  expect(await voices()).toEqual([]);
  await page.keyboard.press("End");
  await expect(
    page.getByRole("option", { exact: true, name: "Option 9" })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("combobox")).toHaveText("Option 9");
  expect(await voices()).toEqual([]);
});
