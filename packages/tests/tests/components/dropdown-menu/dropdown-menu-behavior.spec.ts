import { test, expect } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";
import type { RecordedAudioPlayback } from "@tests/harness/audio-playback";

interface DropdownPlaybackState {
  __menuSounds: RecordedAudioPlayback[];
}

interface DropdownCounterState {
  __menuVoices: number;
}

test("Dropdown Menu keyboard navigation skips disabled items and opens nested menus", async ({
  page,
}) => {
  await page.goto("/?component=dropdown-menu");
  const trigger = page.getByRole("button", { exact: true, name: "Game menu" });
  await trigger.focus();
  await trigger.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: /Resume game/u })
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Unavailable" })
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "你好，世界" })
  ).toBeFocused();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("menuitem", { name: /Resume game/u })
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "More" })
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Video settings" })
  ).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "More" })
  ).toBeFocused();
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Video settings" })
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("Dropdown Menu selects an action once and permits keeping it open", async ({
  page,
}) => {
  await page.goto("/?component=dropdown-menu");
  await page.getByRole("button", { exact: true, name: "Game menu" }).click();
  await page.getByRole("menuitem", { name: /Resume game/u }).click();
  await expect(page.getByLabel("Menu actions", { exact: true })).toHaveText(
    "1"
  );
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.goto("/?component=dropdown-menu&preventAction");
  await page.getByRole("button", { exact: true, name: "Game menu" }).click();
  await page.getByRole("menuitem", { name: /Resume game/u }).click();
  await expect(page.getByLabel("Menu actions", { exact: true })).toHaveText(
    "1"
  );
  await expect(page.getByRole("menu")).toBeVisible();
});

test("Dropdown Menu preserves checkbox, radio and prevented-close semantics", async ({
  page,
}) => {
  await page.goto("/?component=dropdown-menu&keepOpen");
  const trigger = page.getByRole("button", { exact: true, name: "Game menu" });
  await trigger.click();

  const check = page.getByRole("menuitemcheckbox", {
    exact: true,
    name: "Show coordinates",
  });

  await check.click();
  await expect(check).toBeChecked();
  await expect(page.getByLabel("Menu checked", { exact: true })).toHaveText(
    "true"
  );
  await expect(page.getByRole("menu")).toBeVisible();
  await check.click();
  await expect(check).not.toBeChecked();
  await page.getByRole("menuitemradio", { exact: true, name: "Game" }).click();
  await expect(page.getByLabel("Menu radio", { exact: true })).toHaveText(
    "game"
  );
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(
    page.getByRole("menuitemradio", { exact: true, name: "Game" })
  ).toBeChecked();
  await expect(
    page.getByRole("menuitemradio", { exact: true, name: "World" })
  ).not.toBeChecked();
});

test("Dropdown Menu disabled triggers and items cannot activate", async ({
  page,
}) => {
  await page.goto("/?component=dropdown-menu&disabled");
  const trigger = page.getByRole("button", { exact: true, name: "Game menu" });
  await expect(trigger).toBeDisabled();
  await trigger.dispatchEvent("click");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.goto("/?component=dropdown-menu&disabledCheck");
  await page.getByRole("button", { exact: true, name: "Game menu" }).click();
  const item = page.getByRole("menuitem", { exact: true, name: "Unavailable" });
  await expect(item).toBeDisabled();
  await item.dispatchEvent("click");
  await expect(page.getByLabel("Menu actions", { exact: true })).toHaveText(
    "0"
  );

  const check = page.getByRole("menuitemcheckbox", {
    exact: true,
    name: "Show coordinates",
  });

  await expect(check).toBeDisabled();
  await check.dispatchEvent("click");
  await expect(page.getByLabel("Menu checked", { exact: true })).toHaveText(
    "false"
  );
});

test("Dropdown Menu controlled state can reject opening and dismissal", async ({
  page,
}) => {
  await page.goto("/?component=dropdown-menu&controlled&reject");
  await page.getByRole("button", { exact: true, name: "Game menu" }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.goto("/?component=dropdown-menu&controlled&reject&open");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeVisible();
});

test("Dropdown Menu asChild retains native tags, refs and a single composed action", async ({
  page,
}) => {
  await page.goto(
    "/?component=dropdown-menu&triggerAsChild&contentAsChild&nonmodal&preventOutside"
  );
  const trigger = page.getByRole("button", { exact: true, name: "Game menu" });
  await trigger.click();
  await page
    .getByRole("button", { exact: true, name: "Inspect menu refs" })
    .click();
  await expect(page.getByLabel("Menu refs", { exact: true })).toHaveText(
    "BUTTON,SECTION"
  );
  await page
    .getByRole("menuitem", { exact: true, name: "Composed action" })
    .click();
  await expect(page.getByLabel("Menu actions", { exact: true })).toHaveText(
    "1"
  );
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("Dropdown Menu retains CJK names, native refs and original font readiness", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?component=dropdown-menu");
  await page.getByRole("button", { exact: true, name: "Game menu" }).click();
  const item = page.getByRole("menuitem", { exact: true, name: "你好，世界" });
  await expect(item.locator("[data-mc-menu-text-ready]")).toHaveAttribute(
    "data-mc-menu-text-ready",
    "true"
  );
  await expect(item.locator("[data-mc-menu-unicode-ready]")).toHaveAttribute(
    "data-mc-menu-unicode-ready",
    "true"
  );
  await item.click();
  await expect(page.getByLabel("Menu actions", { exact: true })).toHaveText(
    "1"
  );
  expect(errors).toEqual([]);
});

test("Dropdown Menu typeahead focuses a matching action", async ({ page }) => {
  await page.goto("/?component=dropdown-menu");
  await page
    .getByRole("button", { exact: true, name: "Game menu" })
    .press("ArrowDown");
  await page.keyboard.press("m");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "More" })
  ).toBeFocused();
});

test("Dropdown Menu hover stays silent; native trigger and checkbox activation click once", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // SAFETY: This Dropdown Menu initScript creates __menuSounds as an empty playback trace before navigation and playback.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
    (window as typeof window & DropdownPlaybackState).__menuSounds = [];
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      // SAFETY: The paired Dropdown Menu initializer owns __menuSounds; this unchanged native play mock appends only rate, source and volume.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
      (window as typeof window & DropdownPlaybackState).__menuSounds.push({
        rate: this.playbackRate,
        source: this.src,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });

  const voices = async () =>
    page.evaluate(
      () =>
        // SAFETY: This Dropdown Menu reader follows navigation initialized with the exact paired __menuSounds producer.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
        (window as typeof window & DropdownPlaybackState).__menuSounds
    );

  await page.goto("/?component=dropdown-menu");
  const trigger = page.getByRole("button", { exact: true, name: "Game menu" });
  await trigger.hover();
  await trigger.focus();
  expect(await voices()).toEqual([]);
  await trigger.press("ArrowDown");
  await expect(page.getByRole("menu")).toBeVisible();
  expect(await voices()).toEqual([]);
  await page.keyboard.press("Escape");
  await trigger.press("Enter");
  expect(await voices()).toEqual([
    { rate: 1, source: minecraftClickSound, volume: 0.25 },
  ]);
  await page.keyboard.press("Escape");
  await trigger.click();
  expect(await voices()).toHaveLength(2);
  await page.getByRole("menuitem", { name: /Resume game/u }).hover();
  expect(await voices()).toHaveLength(2);
  await page.getByRole("menuitem", { name: /Resume game/u }).click();
  expect(await voices()).toHaveLength(2);
  await trigger.click();
  await page
    .getByRole("menuitemcheckbox", { exact: true, name: "Show coordinates" })
    .click();
  expect(await voices()).toHaveLength(4);
});

for (const query of ["nonmodal", "controlled&reject", "nativeButtonChild"]) {
  test(`Dropdown Menu trigger sound remains single for ${query}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // SAFETY: This Dropdown Menu initScript creates __menuVoices as a zero playback counter before navigation and playback.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
      (window as typeof window & DropdownCounterState).__menuVoices = 0;
      HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
        // SAFETY: The paired Dropdown Menu initializer sets __menuVoices to zero; this mock only increments that owned counter.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
        (window as typeof window & DropdownCounterState).__menuVoices += 1;

        return Promise.resolve();
      };
    });
    await page.goto(`/?component=dropdown-menu&${query}`);

    const trigger = page.getByRole("button", {
      exact: true,
      name: "Game menu",
    });

    await trigger.click();
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            // SAFETY: This Dropdown Menu reader follows navigation initialized with the exact paired __menuVoices producer.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
            (window as typeof window & DropdownCounterState).__menuVoices
        )
      )
      .toBe(1);
    await page.keyboard.press("Escape");
    await trigger.focus();
    await trigger.press("Enter");
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            // SAFETY: This Dropdown Menu reader follows navigation initialized with the exact paired __menuVoices producer.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
            (window as typeof window & DropdownCounterState).__menuVoices
        )
      )
      .toBe(2);
  });
}

test("Dropdown Menu follows RTL submenu keyboard direction", async ({
  page,
}) => {
  await page.goto("/?component=dropdown-menu&rtl");
  await page
    .getByRole("button", { exact: true, name: "Game menu" })
    .press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Video settings" })
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "More" })
  ).toBeFocused();
});
