import { writeFileSync } from "node:fs";

import { test, expect } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";
import {
  recordPitchedPlayback,
  recordedPitchedPlayback,
} from "@tests/harness/audio-playback";

const runtimeErrors = new WeakMap<object, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});

test.afterEach(({ page, browser }, info) => {
  writeFileSync(
    info.outputPath("runtime.json"),
    JSON.stringify({
      browser: browser.version(),
      pageErrors: runtimeErrors.get(page) ?? [],
    })
  );
  expect(runtimeErrors.get(page)).toEqual([]);
});

test("Carousel preserves regions, slides, disabled boundary navigation and public API", async ({
  page,
}) => {
  await page.goto("/?component=carousel");
  await expect(
    page.getByRole("region", { name: "Saved worlds" })
  ).toBeVisible();
  await expect(page.getByRole("group")).toHaveCount(3);
  await expect(page.locator("#previous")).toBeDisabled();
  await page.locator("#next").click();
  await expect(page.locator("#index")).toHaveText("1");
  await page.locator("#next").click();
  await expect(page.locator("#index")).toHaveText("2");
  await expect(page.locator("#next")).toBeDisabled();
  await page.locator("#previous").click();
  await expect(page.locator("#index")).toHaveText("1");
  await page.locator("#api").click();
  await expect(page.locator("#index")).toHaveText("2");
});

test("Carousel keyboard navigation respects axis and editable fields", async ({
  page,
}) => {
  await page.goto("/?component=carousel");
  await page.locator("#next").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#index")).toHaveText("1");
  await page.getByRole("textbox", { name: "World 2 name" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#index")).toHaveText("1");
  await page.locator("#previous").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#index")).toHaveText("0");
  await page.goto("/?component=carousel&vertical=1");
  await page.locator("#next").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#index")).toHaveText("1");
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("#index")).toHaveText("0");
  expect(
    await page.locator("#next").evaluate((n) => getComputedStyle(n).transform)
  ).toContain("matrix(0, 1, -1, 0,");
});

test("Carousel honors RTL keyboard direction, loop and consumer cancellation", async ({
  page,
}) => {
  await page.goto("/?component=carousel&rtl=1");
  await page.locator("#next").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#index")).toHaveText("1");
  await page.goto("/?component=carousel&loop=1");
  await expect(page.locator("#previous")).toBeEnabled();
  await page.locator("#previous").click();
  await expect(page.locator("#index")).toHaveText("2");
  await page.goto("/?component=carousel&cancel=1");
  await page.locator("#next").click();
  await expect(page.locator("#events")).toHaveText("1");
  await expect(page.locator("#index")).toHaveText("0");
  await page.goto("/?component=carousel&cancelKeys=1");
  await page.locator("#next").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#index")).toHaveText("0");
});

test("Carousel supports pointer dragging and reinitialization after dynamic slides", async ({
  page,
}) => {
  await page.goto("/?component=carousel");
  const b = (await page.locator("[data-slot=carousel-content]").boundingBox())!;
  await page.mouse.move(b.x + b.width - 20, b.y + 30);
  await page.mouse.down();
  await page.mouse.move(b.x + 20, b.y + 30, { steps: 20 });
  await page.mouse.up();
  await expect(page.locator("#index")).toHaveText("1");
  await page.locator("#add").click();
  await page.locator("#reinit").click();
  await expect(page.getByRole("group")).toHaveCount(4);
  await page.locator("#api").click();
  await expect(page.locator("#index")).toHaveText("2");
  await expect(page.locator("#next")).toBeEnabled();
});

test("Carousel native arrow activations play original asset once and canceled actions remain silent", async ({
  page,
}) => {
  await recordPitchedPlayback(page);
  await page.goto("/?component=carousel");
  await page.locator("#next").hover();
  expect(await recordedPitchedPlayback(page)).toEqual([]);
  await page.locator("#next").click();
  expect(await recordedPitchedPlayback(page)).toEqual([
    { pitch: 1, source: minecraftClickSound, volume: 0.25 },
  ]);
  await page.goto("/?component=carousel&cancel=1");
  await page.locator("#next").click();
  expect(await recordedPitchedPlayback(page)).toEqual([]);
});
