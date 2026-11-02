import { test, expect } from "@grasscn/tests/test";
import type { Page } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";

const game = (page: Page) =>
  page.getByRole("menuitem", { exact: true, name: "Game menu" });

const world = (page: Page) =>
  page.getByRole("menuitem", { exact: true, name: "World menu" });

const openMenu = async function openMenu(page: Page, query = "") {
  await page.goto(`/?component=menubar&${query}`);
  await game(page).click();
};

test("Menubar roving focus skips disabled menus and wraps", async ({
  page,
}) => {
  await page.goto("/?component=menubar");
  await expect(game(page)).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(game(page)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(world(page)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(game(page)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(world(page)).toBeFocused();
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Unavailable menu" })
  ).toBeDisabled();
});

test("Menubar navigates between open menus with the keyboard", async ({
  page,
}) => {
  await page.goto("/?component=menubar");
  await game(page).press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: /Resume game/ })
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Unavailable" })
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "你好，世界" })
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Create world" })
  ).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /Resume game/ })).toHaveCount(
    0
  );
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("menuitem", { name: /Resume game/ })
  ).toBeVisible();
});

test("Menubar pointer hover switches open menus without opening disabled menus", async ({
  page,
}) => {
  await openMenu(page);
  await world(page).hover();
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Create world" })
  ).toBeVisible();
  await expect(world(page)).toHaveAttribute("data-popup-open", "");

  const disabled = page.getByRole("menuitem", {
    exact: true,
    name: "Unavailable menu",
  });

  const rect = (await disabled.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await expect(world(page)).toHaveAttribute("data-popup-open", "");
  await expect(disabled).not.toHaveAttribute("data-popup-open");
});

test("Menubar submenu navigation restores focus and Escape returns to its trigger", async ({
  page,
}) => {
  await openMenu(page);
  await page.getByRole("menuitem", { exact: true, name: "More" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Video settings" })
  ).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "More" })
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(game(page)).toBeFocused();
});

test("Menubar selects an action once and permits cancelling automatic dismissal", async ({
  page,
}) => {
  await openMenu(page);
  await page.getByRole("menuitem", { name: /Resume game/ }).click();
  await expect(page.getByLabel("Menu actions", { exact: true })).toHaveText(
    "1"
  );
  await expect(page.getByRole("menu")).toHaveCount(0);
  await openMenu(page, "preventAction");
  await page.getByRole("menuitem", { name: /Resume game/ }).click();
  await expect(page.getByLabel("Menu actions", { exact: true })).toHaveText(
    "1"
  );
  await expect(page.getByRole("menu")).toBeVisible();
});

test("Menubar preserves checkbox and radio state", async ({ page }) => {
  await openMenu(page, "keepOpen");

  const checkbox = page.getByRole("menuitemcheckbox", {
    exact: true,
    name: "Show coordinates",
  });

  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await expect(page.getByLabel("Menu checked", { exact: true })).toHaveText(
    "true"
  );
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

test("Menubar respects controlled state and rejected changes", async ({
  page,
}) => {
  await openMenu(page, "controlled&reject");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await openMenu(page, "controlled");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("Menubar supports default-open state and keyboard toggling", async ({
  page,
}) => {
  await page.goto("/?component=menubar&open");
  await expect(page.getByRole("menu")).toBeVisible();
  await game(page).focus();
  await game(page).press("Enter");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await game(page).press(" ");
  await expect(page.getByRole("menu")).toBeVisible();
});

test("Menubar permits Escape and outside-interaction cancellation", async ({
  page,
}) => {
  await openMenu(page, "preventEscape&preventOutside");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.locator("#menubar-outside").evaluate((node: HTMLButtonElement) => {
    node.click();
  });
  await expect(page.getByRole("menu")).toBeVisible();
});

test("Menubar preserves composed element refs and clears unmounted content refs", async ({
  page,
}) => {
  await openMenu(page, "triggerAsChild&contentAsChild&preventOutside");
  await expect(page.getByRole("menu")).toHaveJSProperty("tagName", "SECTION");
  await page.locator("#menubar-outside").evaluate((node: HTMLButtonElement) => {
    node.click();
  });
  await expect(page.getByLabel("Menu refs", { exact: true })).toHaveText(
    "DIV,BUTTON,SECTION"
  );
  await page
    .getByRole("menuitem", { exact: true, name: "Composed action" })
    .click();
  await expect(page.getByLabel("Menu actions", { exact: true })).toHaveText(
    "1"
  );
  await page.locator("#menubar-outside").evaluate((node: HTMLButtonElement) => {
    node.click();
  });
  await expect(page.getByLabel("Menu refs", { exact: true })).toHaveText(
    "DIV,BUTTON,"
  );
});

test("Menubar renders CJK labels and invokes the corresponding action", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openMenu(page);
  const item = page.getByRole("menuitem", { exact: true, name: "你好，世界" });
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

test("Menubar typeahead focuses a matching action", async ({ page }) => {
  await page.goto("/?component=menubar");
  await game(page).press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: /Resume game/ })
  ).toBeFocused();
  await page.keyboard.press("m");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "More" })
  ).toBeFocused();
});

test("Menubar uses RTL submenu and trigger navigation", async ({ page }) => {
  await openMenu(page, "rtl");
  await page.getByRole("menuitem", { exact: true, name: "More" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Video settings" })
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "More" })
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(game(page)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(world(page)).toBeFocused();
});

test("Menubar native activation plays once and hover/menu navigation stay silent", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__menubarVoices = [];
    HTMLMediaElement.prototype.play = function play() {
      (window as any).__menubarVoices.push({
        rate: this.playbackRate,
        source: this.src,
        volume: this.volume,
      });

      return Promise.resolve();
    };
  });

  const voices = async () =>
    page.evaluate(() => (window as any).__menubarVoices);

  await page.goto("/?component=menubar&keepOpen");
  await game(page).hover();
  await game(page).focus();
  expect(await voices()).toEqual([]);
  await game(page).press("ArrowDown");
  await expect(page.getByRole("menu")).toBeVisible();
  expect(await voices()).toEqual([]);
  await page.keyboard.press("Escape");
  await game(page).press("Enter");
  expect(await voices()).toEqual([
    { rate: 1, source: minecraftClickSound, volume: 0.25 },
  ]);
  await page.getByRole("menuitem", { name: /Resume game/ }).hover();
  expect(await voices()).toHaveLength(1);
  await page
    .getByRole("menuitemcheckbox", { exact: true, name: "Show coordinates" })
    .click();
  expect(await voices()).toHaveLength(2);
  await page.keyboard.press("Escape");
  await game(page).click();
  expect(await voices()).toHaveLength(3);
});

for (const query of ["nativeButtonChild", "controlled&reject"]) {
  test(`Menubar keeps trigger sound single for ${query}`, async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__menubarVoices = 0;
      HTMLMediaElement.prototype.play = function play() {
        (window as any).__menubarVoices += 1;

        return Promise.resolve();
      };
    });
    await openMenu(page, query);
    await expect
      .poll(async () => page.evaluate(() => (window as any).__menubarVoices))
      .toBe(1);
    await page.keyboard.press("Escape");
    await game(page).focus();
    await game(page).press("Enter");
    await expect
      .poll(async () => page.evaluate(() => (window as any).__menubarVoices))
      .toBe(2);
  });
}
