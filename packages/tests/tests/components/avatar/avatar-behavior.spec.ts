import { test, expect } from "@grasscn/tests/test";

test("Avatar uses original player face, image events and forwarded image ref", async ({
  page,
}) => {
  await page.goto("/?component=avatar");
  await expect(page.locator("#status")).toHaveText("loaded");
  await expect(page.locator("#loaded img")).toHaveAttribute("alt", "Steve");
  await expect(page.locator("#loaded [data-mc-avatar-face]")).toHaveAttribute(
    "data-ready",
    "true"
  );
  expect(
    await page.evaluate(() => (window as any).avatarImageRef?.tagName)
  ).toBe("IMG");
  await expect(page.locator("#loaded [data-slot=avatar-fallback]")).toHaveCount(
    0
  );
});

test("Avatar error fallback renders CJK glyphs and preserves real text", async ({
  page,
}) => {
  await page.goto("/?component=avatar");
  const fallback = page.locator("#failed [data-slot=avatar-fallback]");
  await expect(fallback).toContainText("玩家中文");
  await expect(
    fallback.locator("[data-mc-label-layout-ready]")
  ).toHaveAttribute("data-mc-label-layout-ready", "true");
  await expect(fallback.locator("canvas")).toHaveCount(1);
});

test("Avatar fallback delay, native default face and rich custom fallback remain visible", async ({
  page,
}) => {
  const clockTime = new Date("2030-01-01T00:00:00Z");
  await page.clock.install({ time: clockTime });
  await page.clock.pauseAt(new Date(clockTime.getTime() + 60_000));
  await page.goto("/?component=avatar");
  await expect(
    page.locator("#delayed [data-slot=avatar-fallback]")
  ).toHaveCount(0);
  await page.clock.fastForward(301);
  await expect(page.locator("#delayed")).toContainText("Later");
  await expect(page.locator("#default [data-mc-avatar-face]")).toHaveAttribute(
    "data-ready",
    "true"
  );
  await expect(page.locator("#linked strong")).toHaveText("Player");
  await page.locator("#linked").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#player$/);
});

test("Avatar badge/group/count preserve composition and semantics", async ({
  page,
}) => {
  await page.goto("/?component=avatar");
  await expect(page.getByLabel("online")).toHaveText("!");
  await expect(
    page.getByLabel("Players").locator("[data-slot=avatar]")
  ).toHaveAttribute("data-size", "sm");
  await expect(page.locator("[data-slot=avatar-group-count]")).toContainText(
    "+2"
  );
});
