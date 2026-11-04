import { test, expect } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";
import type { Page } from "@playwright/test";

interface ToggleGroupPlaybackState extends Window {
  sounds?: { rate: number; source: string; volume: number }[];
}

type InitializedToggleGroupPlaybackState = typeof window &
  ToggleGroupPlaybackState & {
    sounds: { rate: number; source: string; volume: number }[];
  };

const base = "/?component=toggle-group";

const verifyToggleGroupKeyboard = async (
  page: Page,
  extra: string,
  key: string
) => {
  await page.goto(base + extra);

  const one = page.locator("[data-subject]");
  const two = page.locator("#item-two");

  await one.focus();
  await page.keyboard.press(key);
  await expect(two).toBeFocused();
  await page.keyboard.press("Space");
  await expect(two).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("End");
  await expect(page.locator("#item-three")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(one).toBeFocused();
};

const verifyControlledToggleGroup = async (page: Page, type: string) => {
  await page.goto(`${base}&controlled=1&type=${type}`);
  await page.locator("#external").click();
  await expect(page.locator("#item-two")).toHaveAttribute("data-pressed", "");
  await page.locator("[data-subject]").click();
  await expect(page.locator("[data-subject]")).toHaveAttribute(
    "data-pressed",
    ""
  );
};

const verifyBlockedToggleGroup = async (page: Page, extra: string) => {
  await page.goto(`${base}&${extra}`);
  await page.locator("[data-subject]").dispatchEvent("click");
  await expect(page.locator("[data-subject]")).not.toHaveAttribute(
    "data-pressed"
  );
  await expect(page.locator("#events")).toHaveText("0");
};

const verifySilentToggleGroup = async (page: Page, extra: string) => {
  await page.goto(`${base}&${extra}`);
  await page.locator("[data-subject]").dispatchEvent("click");
  // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
  expect(
    await page.evaluate(
      () => (window as InitializedToggleGroupPlaybackState).sounds
    )
  ).toEqual([]);
  // oxlint-enable typescript/no-unsafe-type-assertion
};

test("Toggle Group single selection and deselection", async ({ page }) => {
  await page.goto(base);

  const one = page.getByRole("button", { name: "Filter one" });
  const two = page.getByRole("button", { name: "Filter two" });

  await one.click();
  await expect(one).toHaveAttribute("aria-pressed", "true");
  await two.click();
  await expect(one).not.toHaveAttribute("aria-pressed", "true");
  await expect(two).toHaveAttribute("aria-pressed", "true");
  await two.click();
  await expect(two).not.toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#events")).toHaveText("3");
});

test("Toggle Group multiple preserves independent pressed values", async ({
  page,
}) => {
  await page.goto(`${base}&type=multiple`);

  const one = page.getByRole("button", { name: "Filter one" });
  const two = page.getByRole("button", { name: "Filter two" });

  await one.click();
  await two.click();
  await expect(one).toHaveAttribute("aria-pressed", "true");
  await expect(two).toHaveAttribute("aria-pressed", "true");
  await one.click();
  await expect(one).toHaveAttribute("aria-pressed", "false");
  await expect(two).toHaveAttribute("aria-pressed", "true");
});

test("Toggle Group roving keyboard focus supports RTL and vertical layout", async ({
  page,
}) => {
  for (const [extra, key] of [
    ["", "ArrowRight"],
    ["&dir=rtl", "ArrowLeft"],
    ["&orientation=vertical", "ArrowDown"],
  ]) {
    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    await verifyToggleGroupKeyboard(page, extra, key);
  }
});

test("Toggle Group skips disabled items and obeys no-loop", async ({
  page,
}) => {
  await page.goto(`${base}&disabledItem=two&noLoop=1`);
  await page.locator("[data-subject]").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#item-three")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#item-three")).toBeFocused();
});

test("Toggle Group supports controlled external values and rejected updates", async ({
  page,
}) => {
  for (const type of ["single", "multiple"]) {
    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    await verifyControlledToggleGroup(page, type);
  }

  await page.goto(`${base}&controlled=1&reject=1`);
  await page.locator("[data-subject]").click();
  await expect(page.locator("[data-subject]")).not.toHaveAttribute(
    "data-pressed"
  );
  await expect(page.locator("#events")).toHaveText("1");
});

test("Toggle Group cancelled activation and disabled roots remain unchanged", async ({
  page,
}) => {
  for (const extra of [
    "cancel=1",
    "state=disabled",
    "state=disabled&asChild=1",
  ]) {
    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    await verifyBlockedToggleGroup(page, extra);
  }
});

test("Toggle Group retains composed children, refs and accessible names", async ({
  page,
}) => {
  await page.goto(`${base}&asChild=1&text=Hello%20世界`);
  await expect(page.locator("[data-subject]")).toContainText("Hello 世界");
  await page.locator("[data-subject]").click();
  await expect(page.locator("[data-subject]")).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.locator("#read-ref").click();
  await expect(page.locator("#tag")).toHaveText("DIV/A");
});

test("Toggle Group uses original click audio and silent focus navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // SAFETY: this write installs the actual recorder field on the new page; it is optional before this producer assignment.
    (window as ToggleGroupPlaybackState).sounds = [];
    // oxlint-disable-next-line typescript/promise-function-async -- This browser API stub records synchronously and returns its original fulfilled Promise; async would change throw and Promise-adoption timing.
    HTMLMediaElement.prototype.play = function play() {
      // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
      // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
      (window as InitializedToggleGroupPlaybackState).sounds.push({
        rate: this.playbackRate,
        source: this.src,
        volume: this.volume,
      });
      // oxlint-enable typescript/no-unsafe-type-assertion

      return Promise.resolve();
    };
  });
  await page.goto(base);
  await page.locator("[data-subject]").hover();
  await page.locator("[data-subject]").focus();
  await page.keyboard.press("ArrowRight");
  // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
  expect(
    await page.evaluate(
      () => (window as InitializedToggleGroupPlaybackState).sounds
    )
  ).toEqual([]);
  // oxlint-enable typescript/no-unsafe-type-assertion
  await page.keyboard.press("Space");
  // SAFETY: this page init script assigns the exact recorder before installing playback; the callback and post-navigation observations read that initialized field without changing any lookup.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact initialized page-local playback recorder protocol; preserve original field reads and resets.
  expect(
    await page.evaluate(
      () => (window as InitializedToggleGroupPlaybackState).sounds
    )
  ).toEqual([{ rate: 1, source: minecraftClickSound, volume: 0.25 }]);
  // oxlint-enable typescript/no-unsafe-type-assertion

  for (const extra of [
    "cancel=1",
    "state=disabled",
    "state=disabled&asChild=1",
  ]) {
    // oxlint-disable-next-line no-await-in-loop -- Runs the current fixture case on one shared page; its navigation, interactions and observations finish before the next case replaces that page.
    await verifySilentToggleGroup(page, extra);
  }
});
