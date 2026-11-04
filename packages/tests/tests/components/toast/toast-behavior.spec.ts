import { createHash } from "node:crypto";

import { test, expect } from "@grasscn/tests/test";
import { minecraftClickSound } from "@grasscn/web/ui/minecraft-sound-assets";
import { minecraftToastSounds } from "@grasscn/web/ui/minecraft-toast-sound-assets";
import type { Page } from "@playwright/test";

interface ToastSoundPlayback {
  kind: "in" | "out" | "click" | "other";
  rate: number;
  volume: number;
}

interface ToastPlaybackWindow extends Window {
  sounds: ToastSoundPlayback[];
}

interface StrictToastSoundWindow extends Window {
  sounds: ("in" | "out" | "other")[];
}

const ready = async (page: Page) => {
  await expect(
    page.locator('[data-mc-toast-ready="true"]').first()
  ).toBeVisible();
};

test("Sonner preserves its original global create/update/dismiss API and CJK", async ({
  page,
}) => {
  await page.goto("/?component=sonner&closed=1");
  await page.locator("#open").click();
  await ready(page);
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(1);
  await page.locator("#update").click();
  await expect(page.locator("[data-title]")).toHaveText("Updated 世界");
  await expect(page.locator("[data-description]")).toHaveText("こんにちは");
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(1);
  await page.locator("#close").click();
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
  await expect(page.locator("[data-mc-sonner-ghost]")).toHaveCount(0);
});

test("Sonner keeps action events, cancellation and rich HTML", async ({
  page,
}) => {
  await page.goto("/?component=sonner&actions=1&cancelAction=1");
  await ready(page);
  await page.getByRole("button", { exact: true, name: "Undo" }).click();
  await expect(page.locator("#actions")).toHaveText("1");
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(1);
  await page.goto("/?component=sonner&actions=1");
  await ready(page);
  await page.getByRole("button", { exact: true, name: "Undo" }).click();
  await expect(page.locator("#actions")).toHaveText("1");
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
  await page.goto("/?component=sonner&rich=1");
  await expect(page.locator("[data-title] strong")).toHaveText("World saved");
  await expect(page.locator("[data-sonner-toast]")).toHaveAttribute(
    "data-mc-toast-rich",
    "true"
  );
});

test("Sonner retains its promise notification API", async ({ page }) => {
  await page.goto("/?component=sonner&closed=1");
  await page.locator("#promise").click();
  await expect(page.locator("[data-title]")).toHaveText("World saved");
  await expect(page.locator("[data-sonner-toast]")).toHaveAttribute(
    "data-type",
    "success"
  );
});

test("Toast sounds use byte-identical original assets and decode in the browser", async ({
  page,
}) => {
  for (const [kind, pin] of Object.entries({
    in: "71fcf933a29e83940c2b896585b1c9de846d4b5fb3e934b7ef642bd11733b884",
    out: "78f870f75914fd6784b9cf6862887369a7e8604bd04eb4944562196bc3cdcaa1",
  })) {
    expect(
      createHash("sha256")
        .update(
          Buffer.from(
            minecraftToastSounds[kind as "in" | "out"].split(",")[1],
            "base64"
          )
        )
        .digest("hex")
    ).toBe(pin);
  }

  await page.goto("/?component=sonner&closed=1");

  const decoded = await page.evaluate(async (sounds) => {
    const context = new AudioContext();
    const out = [];

    const decodedResults = await Promise.allSettled(
      Object.values(sounds).map(async (src) => {
        const data = Uint8Array.from(
          atob(src.split(",")[1]),
          (c) => c.codePointAt(0) ?? Number.NaN
        );

        const audio = await context.decodeAudioData(data.buffer);

        return { channels: audio.numberOfChannels, duration: audio.duration };
      })
    );

    for (const decodedResult of decodedResults) {
      if (decodedResult.status === "rejected") {
        throw decodedResult.reason;
      }

      out.push(decodedResult.value);
    }

    await context.close();

    return out;
  }, minecraftToastSounds);

  expect(decoded).toHaveLength(2);

  for (const sound of decoded) {
    expect(sound.duration).toBeGreaterThan(0.05);
    expect(sound.channels).toBeGreaterThan(0);
  }
});

for (const component of ["sonner"]) {
  test(`${component} uses native sound gain, pitch and master volume; hover remains silent`, async ({
    page,
  }) => {
    await page.addInitScript(
      ({ sounds, click }) => {
        // SAFETY: this initScript initializes the exact test-owned gain/pitch sound log here.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        (window as typeof window & ToastPlaybackWindow).sounds = [];
        // oxlint-disable-next-line typescript/promise-function-async -- This browser API stub records synchronously and returns its original fulfilled Promise; async would change throw and Promise-adoption timing.
        HTMLMediaElement.prototype.play = function play(
          this: HTMLMediaElement
        ) {
          let selectedFixtureBranch1: "in" | "out" | "click" | "other";

          if (this.src === sounds.in) {
            selectedFixtureBranch1 = "in";
          } else if (this.src === sounds.out) {
            selectedFixtureBranch1 = "out";
          } else {
            selectedFixtureBranch1 = this.src === click ? "click" : "other";
          }

          // SAFETY: this play mock writes only kind, playbackRate and volume to the log initialized above.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          (window as typeof window & ToastPlaybackWindow).sounds.push({
            kind: selectedFixtureBranch1,
            rate: this.playbackRate,
            volume: this.volume,
          });

          return Promise.resolve();
        };
      },
      { click: minecraftClickSound, sounds: minecraftToastSounds }
    );
    await page.goto(`/?component=${component}&actions=1&volume=.5`);
    await ready(page);
    await expect
      .poll(
        async () =>
          await page.evaluate(
            () =>
              // SAFETY: this test's initScript initializes this precise playback log before navigation.
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion
              (window as typeof window & ToastPlaybackWindow).sounds
          )
      )
      .toEqual([{ kind: "in", rate: 1, volume: 0.2 }]);
    await page
      .locator(
        component === "toast" ? '[data-slot="toast"]' : "[data-sonner-toast]"
      )
      .hover();
    expect(
      await page.evaluate(
        () =>
          // SAFETY: this test's initScript initializes this precise playback log before navigation.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          (window as typeof window & ToastPlaybackWindow).sounds
      )
    ).toHaveLength(1);
    await page.getByRole("button", { exact: true, name: "Undo" }).click();
    await expect
      .poll(
        async () =>
          await page.evaluate(
            () =>
              // SAFETY: this test's initScript initializes this precise playback log before navigation.
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion
              (window as typeof window & ToastPlaybackWindow).sounds.length
          )
      )
      .toBe(3);

    const sounds = await page.evaluate(
      () =>
        // SAFETY: this test's initScript initializes this precise playback log before navigation.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        (window as typeof window & ToastPlaybackWindow).sounds
    );

    expect(sounds.filter((s) => s.kind === "click")).toEqual([
      { kind: "click", rate: 1, volume: 0.125 },
    ]);
    expect(sounds.filter((s) => s.kind === "out")).toEqual([
      { kind: "out", rate: 1, volume: 0.2 },
    ]);
  });
}

for (const component of ["sonner"]) {
  test(`${component} plays one entry sound under React StrictMode`, async ({
    page,
  }) => {
    await page.addInitScript(
      ({ sounds }) => {
        // SAFETY: this separate initScript initializes its own string-only StrictMode sound log.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        (window as typeof window & StrictToastSoundWindow).sounds = [];
        // oxlint-disable-next-line typescript/promise-function-async -- This browser API stub records synchronously and returns its original fulfilled Promise; async would change throw and Promise-adoption timing.
        HTMLMediaElement.prototype.play = function play(
          this: HTMLMediaElement
        ) {
          let selectedFixtureBranch2: "in" | "out" | "other";

          if (this.src === sounds.in) {
            selectedFixtureBranch2 = "in";
          } else {
            selectedFixtureBranch2 = this.src === sounds.out ? "out" : "other";
          }

          // SAFETY: this play mock appends only the three string tags to the log initialized above.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          (window as typeof window & StrictToastSoundWindow).sounds.push(
            selectedFixtureBranch2
          );

          return Promise.resolve();
        };
      },
      { sounds: minecraftToastSounds }
    );
    await page.goto(`/?component=${component}-strict`);

    if (component === "sonner") {
      await page.locator("#show").click();
      await page.locator("#read-ref").click();
      await expect(page.locator("#ref-tag")).toHaveText("SECTION");
    }

    await ready(page);
    await expect
      .poll(
        async () =>
          await page.evaluate(
            () =>
              // SAFETY: the separate StrictMode initScript initializes this string-only log before navigation.
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion
              (window as typeof window & StrictToastSoundWindow).sounds
          )
      )
      .toEqual(["in"]);
  });
}
