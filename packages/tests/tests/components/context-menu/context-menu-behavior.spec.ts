import { test, expect } from "@grasscn/tests/test";
import type { Page } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";
import {
  recordAudioPlayback,
  recordedAudioPlayback,
} from "@tests/harness/audio-playback";

async function openMenu(page: Page, query = "") {
  await page.goto(`/?component=context-menu&${query}`);
  await page
    .locator("#context-hit")
    .click({ button: "right", position: { x: 24, y: 24 } });
}

test("Context Menu uses pointer anchoring and skips disabled items with the keyboard", async ({
  page,
}) => {
  await openMenu(page);
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  const trigger = (await page.locator("#context-hit").boundingBox())!;

  const border = await page.locator("#context-hit").evaluate((node) => {
    const style = getComputedStyle(node);

    return [
      Number.parseFloat(style.borderLeftWidth),
      Number.parseFloat(style.borderTopWidth),
    ];
  });

  const bounds = (await menu.boundingBox())!;
  expect([bounds.x, bounds.y]).toEqual([
    trigger.x + border[0] + 24 + 4,
    trigger.y + border[1] + 24,
  ]);
  await page.keyboard.press("Home");
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
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
});

test("Context Menu invokes an action once and closes", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("menuitem", { name: /Resume game/ }).click();
  await expect(page.getByLabel("Menu actions", { exact: true })).toHaveText(
    "1"
  );
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("Context Menu preserves checkbox, radio and prevented-close behavior", async ({
  page,
}) => {
  await openMenu(page, "keepOpen");

  const checkbox = page.getByRole("menuitemcheckbox", {
    exact: true,
    name: "Show coordinates",
  });

  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("menuitemradio", { exact: true, name: "Game" }).click();
  await expect(page.getByLabel("Menu radio", { exact: true })).toHaveText(
    "game"
  );
  await expect(page.getByRole("menu")).toBeVisible();
});

for (const query of ["disabled", "preventTrigger", "controlled&reject"]) {
  test(`Context Menu respects ${query}`, async ({ page }) => {
    await openMenu(page, query);
    await expect(page.getByRole("menu")).toHaveCount(0);
  });
}

test("Context Menu supports controlled state and event cancellation", async ({
  page,
}) => {
  await openMenu(page, "controlled");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await openMenu(page, "preventEscape&preventOutside");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.locator("#context-outside").click({ force: true });
  await expect(page.getByRole("menu")).toBeVisible();
});

test("Context Menu preserves composed element refs and actions", async ({
  page,
}) => {
  await openMenu(page, "triggerAsChild&contentAsChild&nonmodal&preventOutside");
  await expect(page.locator("#context-hit")).toHaveJSProperty(
    "tagName",
    "BUTTON"
  );
  await expect(page.getByRole("menu")).toHaveJSProperty("tagName", "SECTION");
  await page.locator("#context-outside").evaluate((node: HTMLButtonElement) => {
    node.click();
  });
  await expect(page.getByLabel("Menu refs", { exact: true })).toHaveText(
    "BUTTON,SECTION"
  );
  await page
    .getByRole("menuitem", { exact: true, name: "Composed action" })
    .click();
  await expect(page.getByLabel("Menu actions", { exact: true })).toHaveText(
    "1"
  );
  await page.locator("#context-outside").evaluate((node: HTMLButtonElement) => {
    node.click();
  });
  await expect(page.getByLabel("Menu refs", { exact: true })).toHaveText(
    "BUTTON,"
  );
});

test("Context Menu renders CJK actions without browser errors", async ({
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

test("Context Menu follows RTL submenu navigation", async ({ page }) => {
  await openMenu(page, "rtl");
  await page.keyboard.press("End");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "More" })
  ).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Video settings" })
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("menuitem", { exact: true, name: "More" })
  ).toBeFocused();
});

test("Context Menu opening and hovering stay silent; checkbox activation plays the original click once", async ({
  page,
}) => {
  await recordAudioPlayback(page);
  await openMenu(page, "keepOpen");
  await page.getByRole("menuitem", { name: /Resume game/ }).hover();
  expect(await recordedAudioPlayback(page)).toEqual([]);
  await page
    .getByRole("menuitemcheckbox", { exact: true, name: "Show coordinates" })
    .click();
  expect(await recordedAudioPlayback(page)).toEqual([
    { rate: 1, source: minecraftClickSound, volume: 0.25 },
  ]);
});

test("Context Menu opens on touch long-press and cancels a cancelled touch", async ({
  browser,
}) => {
  const context = await browser.newContext({ hasTouch: true });

  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);

    await page.goto("/?component=context-menu");
    await expect(page.locator("#context-hit")).toBeVisible();
    await cdp.send("Input.dispatchTouchEvent", {
      touchPoints: [{ x: 100, y: 100 }],
      type: "touchStart",
    });
    await expect(page.getByRole("menu")).toBeVisible({ timeout: 2000 });
    await cdp.send("Input.dispatchTouchEvent", {
      touchPoints: [],
      type: "touchEnd",
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await page.goto("/?component=context-menu");
    await expect(page.locator("#context-hit")).toBeVisible();
    await cdp.send("Input.dispatchTouchEvent", {
      touchPoints: [{ x: 100, y: 100 }],
      type: "touchStart",
    });
    await cdp.send("Input.dispatchTouchEvent", {
      touchPoints: [],
      type: "touchCancel",
    });
    await page.waitForTimeout(850);
    await expect(page.getByRole("menu")).toHaveCount(0);
  } finally {
    await context.close();
  }
});
