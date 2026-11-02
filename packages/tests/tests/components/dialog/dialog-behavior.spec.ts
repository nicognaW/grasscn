import { test, expect } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";
import type { RecordedAudioPlayback } from "@tests/harness/audio-playback";

interface DialogAudioState {
  __dialogSounds: RecordedAudioPlayback[];
}

test("Dialog opens, traps keyboard focus, closes with Escape and restores its trigger", async ({
  page,
}) => {
  await page.goto("/?component=dialog");

  const trigger = page.getByRole("button", {
    exact: true,
    name: "Open dialog",
  });

  const dialog = page.getByRole("dialog");

  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button").first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("Dialog footer actions and close preserve their public behavior", async ({
  page,
}) => {
  await page.goto("/?component=dialog&open");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { exact: true, name: "Continue" }).click();
  await expect(page.getByLabel("Dialog actions")).toHaveText("1");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { exact: true, name: "Done" }).click();
  await expect(dialog).toHaveCount(0);
});

test("Dialog disabled footer action remains inert and keyboard skips it", async ({
  page,
}) => {
  await page.goto("/?component=dialog&open&disabledIndex=0");
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { exact: true, name: "Cancel" })
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { exact: true, name: "Continue" })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Dialog actions")).toHaveText("1");
});

test("Dialog dismisses on outside pointer interaction", async ({ page }) => {
  await page.goto("/?component=dialog&open");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Dialog consumers can prevent Escape and outside dismissal", async ({
  page,
}) => {
  await page.goto("/?component=dialog&open&preventEscape&preventOutside");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { exact: true, name: "Done" }).click();
  await expect(dialog).toHaveCount(0);
});

test("Dialog controlled state can reject and accept open changes", async ({
  page,
}) => {
  await page.goto("/?component=dialog&controlled&reject");
  await page.getByRole("button", { exact: true, name: "Open dialog" }).click();
  await expect(page.getByLabel("Dialog changes")).toHaveText("1");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/?component=dialog&controlled");
  await page
    .getByRole("button", { exact: true, name: "Change dialog externally" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Dialog exposes its title and description through accessible relationships", async ({
  page,
}) => {
  await page.goto("/?component=dialog&open");

  const dialog = page.getByRole("dialog", {
    exact: true,
    name: "World settings",
  });

  await expect(dialog).toHaveAccessibleDescription("A helpful description.");
  await expect(dialog.locator('button[aria-label="Close"]')).toHaveCount(0);
});

test("Dialog keeps long content and its close action reachable in a short viewport", async ({
  page,
}) => {
  await page.setViewportSize({ height: 400, width: 800 });
  await page.goto(
    `/?${new URLSearchParams({ component: "dialog", open: "1", text: Array.from({ length: 40 }, () => "A helpful description.").join("\n") })}`
  );
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const dimensions = await dialog.evaluate((n) => ({
    bottom: n.getBoundingClientRect().bottom,
    height: n.clientHeight,
    scroll: n.scrollHeight,
    top: n.getBoundingClientRect().top,
  }));

  expect(dimensions.scroll).toBeGreaterThan(dimensions.height);
  expect(dimensions.top).toBeGreaterThanOrEqual(0);
  expect(dimensions.bottom).toBeLessThanOrEqual(400);
  await dialog.getByRole("button", { exact: true, name: "Done" }).click();
  await expect(dialog).toHaveCount(0);
});

test("Dialog composes custom elements, forwards refs and preserves nested form submission", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?component=dialog-composition");

  const trigger = page.getByRole("button", {
    exact: true,
    name: "Composed trigger",
  });

  await trigger.click();

  const dialog = page.getByRole("dialog", {
    exact: true,
    name: "Composed title",
  });

  await expect(dialog).toHaveAccessibleDescription("Composed description");
  expect(await dialog.evaluate((n) => n.tagName)).toBe("SECTION");
  await dialog
    .getByRole("button", { exact: true, name: "Inspect refs" })
    .click();
  await expect(page.getByLabel("Dialog composed refs")).toHaveText(
    "BUTTON,SECTION,ASIDE"
  );
  await dialog
    .getByRole("textbox", { exact: true, name: "Dialog form input" })
    .fill("World");
  await dialog.getByRole("textbox").press("Enter");
  await expect(page.getByLabel("Dialog submissions")).toHaveText("1");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { exact: true, name: "Composed close" })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test("Dialog buttons play the original click once; hover and Escape remain silent", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // SAFETY: This addInitScript owns __dialogSounds, creating its empty audio trace before navigation and playback.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned audio state initialized by the paired addInitScript.
    (window as typeof window & DialogAudioState).__dialogSounds = [];
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      // SAFETY: The init script creates __dialogSounds; this unchanged media play mock records only rate, source and volume.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned audio state initialized by the paired addInitScript.
      (window as typeof window & DialogAudioState).__dialogSounds.push({
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
        // SAFETY: This paired reader runs after navigation's init script creates __dialogSounds with the recorded audio contract.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned audio state initialized by the paired addInitScript.
        (window as typeof window & DialogAudioState).__dialogSounds
    );

  await page.goto("/?component=dialog");

  const trigger = page.getByRole("button", {
    exact: true,
    name: "Open dialog",
  });

  await trigger.hover();
  expect(await voices()).toEqual([]);
  await trigger.click();
  expect(await voices()).toEqual([
    { rate: 1, source: minecraftClickSound, volume: 0.25 },
  ]);
  await page.keyboard.press("Escape");
  expect(await voices()).toHaveLength(1);
  await trigger.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { exact: true, name: "Done" })
    .click();
  expect(await voices()).toHaveLength(3);
});
