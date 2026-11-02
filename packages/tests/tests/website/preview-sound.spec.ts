import { test, expect } from "@grasscn/tests/test";
import type { Page } from "@grasscn/tests/test";
import {
  getMinecraftSoundVolume,
  setMinecraftSoundVolume,
} from "@grasscn/web/ui/minecraft-sound";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";

interface Voice {
  source: string;
  volume: number;
  rate: number;
}

const voices = async (page: Page) =>
  page.evaluate(() => (window as any).__previewVoices as Voice[]);

const clearVoices = async (page: Page) =>
  page.evaluate(() => {
    (window as any).__previewVoices = [];
  });

const origin = (
  process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/"
).replace(/\/?$/u, "/");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__previewVoices = [];
    HTMLMediaElement.prototype.play = function play() {
      (window as any).__previewVoices.push({
        rate: this.playbackRate,
        source: this.src,
        volume: this.volume,
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
] as const) {
  test(`Clicking the visible Volume thumb preserves endpoint ${value}`, async ({
    page,
  }) => {
    await page.goto(`${origin}docs/components/slider`);
    const volume = page
      .locator(".documentation-playground")
      .getByRole("slider", { exact: true, name: "Volume" });
    await volume.focus();
    await page.keyboard.press(key);
    await expect(volume).toHaveAttribute("aria-valuenow", value);
    await page
      .locator('.documentation-playground [data-slot="slider-thumb"]')
      .filter({
        has: page.getByRole("slider", { exact: true, name: "Volume" }),
      })
      .click();
    await expect(volume).toHaveAttribute("aria-valuenow", value);
  });
}

test("Preview Volume controls button, checkbox and slider sounds across pages", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/slider`);
  // Isolate demo control audio from the navigation buttons.
  const navigate = async (name: string) => {
    const previous = await voices(page);
    await page
      .getByRole("navigation", { exact: true, name: "Documentation" })
      .getByRole("link", { exact: true, name })
      .click();
    await page.evaluate((previousVoices) => {
      (window as any).__previewVoices = previousVoices;
    }, previous);
  };
  const volume = page
    .locator(".documentation-playground")
    .getByRole("slider", { exact: true, name: "Volume" });

  const button = page
    .locator(
      '.documentation-playground [data-stage="button"] [data-slot="button"]'
    )
    .first();

  const checkbox = page
    .locator(".documentation-playground")
    .getByRole("checkbox", {
      name: "Enable shadows",
    });
  await expect(volume).toHaveAttribute("aria-valuenow", "50");
  await navigate("Button");
  await button.click();
  expect(await voices(page)).toEqual([
    { rate: 1, source: minecraftClickSound, volume: 0.125 },
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
    .locator('.documentation-playground [data-slot="slider-thumb"]')
    .filter({ has: page.getByRole("slider", { exact: true, name: "Volume" }) })
    .click();
  expect(await voices(page)).toEqual([]);
  await volume.focus();
  await page.keyboard.press("End");
  await expect(volume).toHaveAttribute("aria-valuenow", "100");
  await page
    .locator('.documentation-playground [data-slot="slider-thumb"]')
    .filter({ has: page.getByRole("slider", { exact: true, name: "Volume" }) })
    .click();
  await navigate("Button");
  await button.click();
  await navigate("Checkbox");
  await checkbox.check();
  const audible = await voices(page);
  expect(audible).toHaveLength(3);

  for (const voice of audible) {
    expect(voice).toEqual({
      rate: 1,
      source: minecraftClickSound,
      volume: 0.25,
    });
  }
});

test("Keyboard volume changes persist when the slider demo is filtered out", async ({
  page,
}) => {
  await page.goto(`${origin}docs/components/slider`);

  const volume = page
    .locator(".documentation-playground")
    .getByRole("slider", { exact: true, name: "Volume" });
  await volume.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Slider value", { exact: true })).toHaveText(
    "51%"
  );
  await page
    .getByRole("navigation", { exact: true, name: "Documentation" })
    .getByRole("link", { exact: true, name: "Button" })
    .click();
  await clearVoices(page);
  await page
    .locator(
      '.documentation-playground [data-stage="button"] [data-slot="button"]'
    )
    .first()
    .click();
  const played = await voices(page);
  expect(played).toHaveLength(1);
  expect(played[0].volume).toBeCloseTo(0.1275);
  expect(played[0].source).toBe(minecraftClickSound);
  expect(played[0].rate).toBe(1);
  await page
    .getByRole("navigation", { exact: true, name: "Documentation" })
    .getByRole("link", { exact: true, name: "Slider" })
    .click();
  await expect(volume).toHaveAttribute("aria-valuenow", "51");
  await expect(page.getByLabel("Slider value", { exact: true })).toHaveText(
    "51%"
  );
});
