import { expectNotNull } from "@grasscn/tests/assertions";
import { test, expect } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";
import type { RecordedAudioPlayback } from "@tests/harness/audio-playback";

interface OverlayPlaybackState {
  sounds: RecordedAudioPlayback[];
}

for (const component of ["sheet", "drawer"]) {
  test(`${component} preserves keyboard dismissal, accessible text, CJK input and close focus`, async ({
    page,
  }) => {
    await page.goto(`/?component=${component}`);

    const trigger = page.getByRole("button", {
      exact: true,
      name: "Open panel",
    });

    await trigger.focus();
    await page.keyboard.press("Enter");

    const panel = page.getByRole("dialog", {
      exact: true,
      name: "World settings 世界",
    });

    await expect(panel).toBeVisible();
    await expect(panel).toHaveAccessibleDescription("Settings 第二行");

    const readOnlyItems18 = await panel
      .locator("[data-mc-label-layout-ready]")
      .all();

    const readOnlyResults18 = await Promise.allSettled(
      readOnlyItems18.map(async (text) => {
        await expect(text).toHaveAttribute(
          "data-mc-label-layout-ready",
          "true"
        );
      })
    );

    for (const readOnlyResult18 of readOnlyResults18) {
      if (readOnlyResult18.status === "rejected") {
        throw readOnlyResult18.reason;
      }
    }

    const input = panel.getByRole("textbox", {
      exact: true,
      name: "World name",
    });

    await input.fill("你好，世界");
    await expect(input).toHaveValue("你好，世界");
    await expect(input).toHaveAttribute("spellcheck", "false");
    await panel.getByRole("button", { exact: true, name: "Save" }).click();
    await expect(page.locator("#count")).toHaveText("1");
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await panel.getByRole("button", { exact: true, name: "Cancel" }).click();
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
  test(`${component} supports every viewport edge`, async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });

    for (const side of ["top", "right", "bottom", "left"]) {
      await page.goto(`/?component=${component}&side=${side}&open=1`);
      const panel = page.getByRole("dialog");
      await expect(panel).toBeVisible();
      let selectedFixtureBranch2: 900 | 1280 | 0;

      if (side === "bottom") {
        selectedFixtureBranch2 = 900;
      } else {
        selectedFixtureBranch2 = side === "right" ? 1280 : 0;
      }

      await expect
        .poll(async () => {
          const r = await panel.boundingBox();
          expectNotNull(r, "Missing required bounding box: r");

          let selectedFixtureBranch1: number | undefined;

          if (side === "top") {
            selectedFixtureBranch1 = r.y;
          } else if (side === "bottom") {
            selectedFixtureBranch1 = r.y + r.height;
          } else {
            selectedFixtureBranch1 = side === "left" ? r.x : r.x + r.width;
          }

          return Math.round(selectedFixtureBranch1);
        })
        .toBe(selectedFixtureBranch2);
    }
  });
  test(`${component} retains controlled state, disabled trigger and forwarded ref`, async ({
    page,
  }) => {
    await page.goto(`/?component=${component}&controlled=1&asChild=1`);
    await page.getByRole("button", { exact: true, name: "Open panel" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.locator("#read-ref").evaluate((n: HTMLButtonElement) => {
      n.click();
    });
    await expect(page.locator("#ref-tag")).toHaveText("DIV");
    await page.locator("#external").evaluate((n: HTMLButtonElement) => {
      n.click();
    });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goto(`/?component=${component}&disabled=1`);
    await expect(
      page.getByRole("button", { exact: true, name: "Open panel" })
    ).toBeDisabled();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
  test(`${component} traps modal focus and allows content scrolling`, async ({
    page,
  }) => {
    await page.goto(`/?component=${component}&open=1&scroll=1`);
    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();
    await panel.getByRole("textbox").focus();

    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press("Tab");
      // Base UI wraps through an external focus guard, then queues the internal target on the next animation frame.
      await expect
        .poll(
          async () =>
            await panel.evaluate((n) => n.contains(document.activeElement))
        )
        .toBe(true);
    }

    expect(await panel.evaluate((n) => n.scrollHeight > n.clientHeight)).toBe(
      true
    );
    await panel.evaluate((n) => (n.scrollTop = 100));
    expect(await panel.evaluate((n) => n.scrollTop)).toBeGreaterThan(0);
  });
  test(`${component} uses original click audio for native actions and stays silent on hover`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // SAFETY: This Overlay initScript creates sounds as an empty playback trace before navigation and playback.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
      (window as typeof window & OverlayPlaybackState).sounds = [];
      // oxlint-disable-next-line typescript/promise-function-async -- This browser API stub records synchronously and returns its original fulfilled Promise; async would change throw and Promise-adoption timing.
      HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
        // SAFETY: The paired Overlay initializer owns sounds; this unchanged native play mock appends only rate, source and volume.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
        (window as typeof window & OverlayPlaybackState).sounds.push({
          rate: this.playbackRate,
          source: this.src,
          volume: this.volume,
        });

        return Promise.resolve();
      };
    });
    await page.goto(`/?component=${component}`);

    const trigger = page.getByRole("button", {
      exact: true,
      name: "Open panel",
    });

    await trigger.hover();
    expect(
      await page.evaluate(
        () =>
          // SAFETY: This Overlay reader follows navigation initialized with the exact paired sounds producer.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
          (window as typeof window & OverlayPlaybackState).sounds
      )
    ).toEqual([]);
    await trigger.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { exact: true, name: "Cancel" })
      .click();
    expect(
      await page.evaluate(
        () =>
          // SAFETY: This Overlay reader follows navigation initialized with the exact paired sounds producer.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact test-owned media state initialized by the paired addInitScript.
          (window as typeof window & OverlayPlaybackState).sounds
      )
    ).toEqual(
      Array.from({ length: 2 }, () => ({
        rate: 1,
        source: minecraftClickSound,
        volume: 0.25,
      }))
    );
  });
}

test("Drawer dismisses through Base UI swipe details", async ({ page }) => {
  await page.goto("/?component=drawer&side=bottom&open=1");
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();

  const bounds = await panel.boundingBox();
  expectNotNull(bounds, "Missing required bounding box: bounds");
  await page.mouse.move(bounds.x + 8, bounds.y + 8);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 8, bounds.y + bounds.height * 0.8, {
    steps: 12,
  });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await page.locator("#drags").textContent()))
    .toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await page.locator("#releases").textContent()))
    .toBeGreaterThan(0);
  await expect(panel).toHaveCount(0);
});

test("Drawer supports controlled Base UI snap points", async ({ page }) => {
  await page.goto("/?component=drawer&side=bottom&open=1&snap=1");
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  await expect(page.locator("#snap")).toHaveText("0.5");
  await expect
    .poll(async () => Math.round((await panel.boundingBox())!.y))
    .toBe(450);
  await panel.locator("#snap-next").evaluate((node: HTMLButtonElement) => {
    node.click();
  });
  await expect(page.locator("#snap")).toHaveText("1");
  await expect
    .poll(async () => Math.round((await panel.boundingBox())!.y))
    .toBe(0);
});
