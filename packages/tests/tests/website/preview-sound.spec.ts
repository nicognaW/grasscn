import { test, expect, type Page } from "@grasscn/tests/test";
import {
  getMinecraftSoundVolume,
  setMinecraftSoundVolume,
} from "@grasscn/web/ui/minecraft-sound";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";

type Voice = { source: string; volume: number; rate: number };
const voices = (page: Page) =>
  page.evaluate(() => (window as any).__previewVoices as Voice[]);
const clearVoices = (page: Page) =>
  page.evaluate(() => {
    (window as any).__previewVoices = [];
  });
const origin = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__previewVoices = [];
    HTMLMediaElement.prototype.play = function () {
      (window as any).__previewVoices.push({
        source: this.src,
        volume: this.volume,
        rate: this.playbackRate,
      });
      return Promise.resolve();
    };
  });
});

test("Master volume defaults to native gain and safely clamps public settings", () => {
  expect(getMinecraftSoundVolume()).toBe(1);
  try {
    setMinecraftSoundVolume(-1);
    expect(getMinecraftSoundVolume()).toBe(0);
    setMinecraftSoundVolume(2);
    expect(getMinecraftSoundVolume()).toBe(1);
    setMinecraftSoundVolume(0.4);
    setMinecraftSoundVolume(Number.NaN);
    setMinecraftSoundVolume(Infinity);
    expect(getMinecraftSoundVolume()).toBe(0.4);
  } finally {
    setMinecraftSoundVolume(1);
  }
});

for (const [key, value] of [
  ["Home", "0"],
  ["End", "100"],
] as const)
  test(`Clicking the visible Volume thumb preserves endpoint ${value}`, async ({
    page,
  }) => {
    await page.goto(`${origin}#slider`);
    const volume = page.getByRole("slider", { name: "Volume", exact: true });
    await volume.focus();
    await page.keyboard.press(key);
    await expect(volume).toHaveAttribute("aria-valuenow", value);
    await page
      .locator('[data-slot="slider-thumb"]')
      .filter({ has: volume })
      .click();
    await expect(volume).toHaveAttribute("aria-valuenow", value);
  });

test("Preview Volume controls button, checkbox and slider sounds across pages", async ({
  page,
}) => {
  await page.goto(`${origin}#slider`);
  // Isolate demo control audio from the navigation buttons.
  const navigate = async (name: string) => {
    const previous = await voices(page);
    await page
      .getByRole("navigation", { name: "Components", exact: true })
      .getByRole("link", { name, exact: true })
      .click();
    await page.evaluate((previous) => {
      (window as any).__previewVoices = previous;
    }, previous);
  };
  const volume = page.getByRole("slider", { name: "Volume", exact: true });
  const button = page
    .locator('#component-button [data-stage="button"] [data-slot="button"]')
    .first();
  const checkbox = page.getByRole("checkbox", {
    name: "Enable shadows",
    exact: true,
  });
  await expect(volume).toHaveAttribute("aria-valuenow", "50");
  await navigate("Button");
  await button.click();
  expect(await voices(page)).toEqual([
    { source: minecraftClickSound, volume: 0.125, rate: 1 },
  ]);
  await clearVoices(page);
  await navigate("Slider");
  await volume.focus();
  await page.keyboard.press("Home");
  await expect(volume).toHaveAttribute("aria-valuenow", "0");
  await navigate("Button");
  await button.click();
  await navigate("Checkbox");
  await checkbox.check();
  await navigate("Slider");
  await page
    .locator('[data-slot="slider-thumb"]')
    .filter({ has: volume })
    .click();
  expect(await voices(page)).toEqual([]);
  await volume.focus();
  await page.keyboard.press("End");
  await expect(volume).toHaveAttribute("aria-valuenow", "100");
  await page
    .locator('[data-slot="slider-thumb"]')
    .filter({ has: volume })
    .click();
  await navigate("Button");
  await button.click();
  await navigate("Checkbox");
  await checkbox.check();
  const audible = await voices(page);
  expect(audible).toHaveLength(3);
  for (const voice of audible)
    expect(voice).toEqual({
      source: minecraftClickSound,
      volume: 0.25,
      rate: 1,
    });
});

test("Keyboard volume changes persist when the slider demo is filtered out", async ({
  page,
}) => {
  await page.goto(`${origin}#slider`);
  const volume = page.getByRole("slider", { name: "Volume", exact: true });
  await volume.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Slider value", { exact: true })).toHaveText(
    "51%"
  );
  await page
    .getByRole("navigation", { name: "Components", exact: true })
    .getByRole("link", { name: "Button", exact: true })
    .click();
  await clearVoices(page);
  await page
    .locator('#component-button [data-stage="button"] [data-slot="button"]')
    .first()
    .click();
  const played = await voices(page);
  expect(played).toHaveLength(1);
  expect(played[0].volume).toBeCloseTo(0.1275);
  expect(played[0].source).toBe(minecraftClickSound);
  expect(played[0].rate).toBe(1);
  await page
    .getByRole("navigation", { name: "Components", exact: true })
    .getByRole("link", { name: "Slider", exact: true })
    .click();
  await expect(volume).toHaveAttribute("aria-valuenow", "51");
  await expect(page.getByLabel("Slider value", { exact: true })).toHaveText(
    "51%"
  );
});
