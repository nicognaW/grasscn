import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { test, expect, type Page } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";
import { resolveRepositoryPath, testRoot } from "@tests/paths";

const provenance = JSON.parse(
  readFileSync(
    resolveRepositoryPath("tests/reference/sound-provenance.json", testRoot),
    "utf8"
  )
);
const voices = (page: Page) =>
  page.evaluate(
    () =>
      (window as any).__soundVoices as {
        volume: number;
        rate: number;
        source: string;
      }[]
  );
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__soundVoices = [];
    HTMLMediaElement.prototype.play = function () {
      (window as any).__soundVoices.push({
        source: this.src,
        volume: this.volume,
        rate: this.playbackRate,
      });
      return Promise.resolve();
    };
  });
});
test("Click sound contains the exact original OGG and decodes in the browser", async ({
  page,
}) => {
  const bytes = Buffer.from(minecraftClickSound.split(",")[1], "base64");
  expect(bytes.length).toBe(provenance.size);
  expect(createHash("sha1").update(bytes).digest("hex")).toBe(provenance.sha1);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    provenance.sha256
  );
  await page.goto("/");
  const result = await page.evaluate(async (source) => {
    const context = new AudioContext();
    try {
      const audio = await context.decodeAudioData(
        await (await fetch(source)).arrayBuffer()
      );
      return { channels: audio.numberOfChannels, duration: audio.duration };
    } finally {
      await context.close();
    }
  }, minecraftClickSound);
  expect(result.channels).toBe(2);
  expect(result.duration).toBeGreaterThan(0);
});
for (const component of ["button", "checkbox"])
  test(`${component} plays once per activation, with native pitch and volume`, async ({
    page,
  }) => {
    await page.goto(`/?component=${component}`);
    const control = page.locator("[data-subject]");
    await control.hover();
    expect(await voices(page)).toHaveLength(0);
    await control.click();
    expect(await voices(page)).toEqual([
      { source: minecraftClickSound, volume: 0.25, rate: 1 },
    ]);
    await page.keyboard.press("Space");
    expect(await voices(page)).toHaveLength(2);
    await page.goto(`/?component=${component}&state=disabled`);
    await page.locator("[data-subject]").dispatchEvent("click");
    expect(await voices(page)).toHaveLength(0);
  });
test("Slider plays on pointer release, with no press, drag or keyboard tick sound", async ({
  page,
}) => {
  await page.goto("/?component=slider");
  const bounds = (await page.locator("[data-subject]").boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.75,
    bounds.y + bounds.height / 2
  );
  expect(await voices(page)).toHaveLength(0);
  await page.mouse.up();
  expect(await voices(page)).toHaveLength(1);
  await page.getByRole("slider").focus();
  await page.keyboard.press("ArrowRight");
  expect(await voices(page)).toHaveLength(1);
});
test("Input focus, selection and typing remain silent", async ({ page }) => {
  await page.goto("/?component=input");
  await page.locator("[data-subject]").fill("Silent");
  await page.keyboard.press("Control+A");
  expect(await voices(page)).toHaveLength(0);
});
