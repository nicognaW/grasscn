import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { expectNotNull } from "@grasscn/tests/assertions";
import { test, expect } from "@grasscn/tests/test";
import { tradingSounds as clips } from "@grasscn/web/ui/minecraft-trading-sound-assets";
import { referenceFile } from "@tests/paths";

import type TradingSoundReference from "../../../fixtures/reference/native-expansion/trading-sound-provenance.json";

interface TradingAudioPlayback {
  pitch: number;
  src: string;
  volume: number;
}

interface TradingAudioWindow extends Window {
  tradeAudio: TradingAudioPlayback[];
}

const base =
  process.env.GRASSCN_EXPANSION_URL ?? "http://127.0.0.1:5174/adventure.html";

const url = (sample: object = {}) =>
  `${base}?scale=2&case=${encodeURIComponent(JSON.stringify({ element: "trading", value: 0, ...sample }))}`;

test("trading original sound bytes decode in the browser", async ({ page }) => {
  // SAFETY: this exact retained producer file defines the parsed sound provenance; keep its fresh read and all existing asset checks.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact sound-provenance JSON producer boundary.
  const provenance = JSON.parse(
    readFileSync(
      referenceFile("native-expansion/trading-sound-provenance.json"),
      "utf-8"
    )
  ) as typeof TradingSoundReference;
  // oxlint-enable typescript/no-unsafe-type-assertion

  expect(clips).toHaveLength(3);

  for (const [i, clip] of clips.entries()) {
    expect(
      createHash("sha256")
        .update(Buffer.from(clip.src.split(",")[1], "base64"))
        .digest("hex")
    ).toBe(provenance.clips[i].sha256);
    expect(clip.volume).toBe(1);
    expect(clip.pitch).toBe(1);
  }

  await page.goto(url());

  const durations = await page.evaluate(async (audioClips) => {
    const context = new AudioContext();

    try {
      return await Promise.all(
        audioClips.map(async (clip) => {
          const awaitedDecodeAudioData1 = await context.decodeAudioData(
            await (await fetch(clip.src)).arrayBuffer()
          );

          return awaitedDecodeAudioData1.duration;
        })
      );
    } finally {
      await context.close();
    }
  }, clips);

  expect(durations.every((d) => d > 0)).toBe(true);
});

test("trading selection, result feedback and native scrollbar controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // SAFETY: this initScript initializes the exact test-owned pitch/source/volume log here.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    (window as typeof window & TradingAudioWindow).tradeAudio = [];

    class RecordedAudio {
      src: string;
      volume = 1;
      playbackRate = 1;
      constructor(src: string) {
        this.src = src;
      }
      play() {
        // SAFETY: this class method writes its own playbackRate, src and volume to the log initialized above.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        (window as typeof window & TradingAudioWindow).tradeAudio.push({
          pitch: this.playbackRate,
          src: this.src,
          volume: this.volume,
        });
      }
    }

    Object.defineProperty(window, "Audio", { value: RecordedAudio });
  });
  await page.goto(url());
  await expect
    .poll(
      async () =>
        await page.evaluate(() => document.documentElement.dataset.tradingRef)
    )
    .toBe("trading");
  await page.getByRole("button", { exact: true, name: "Offer 2" }).click();
  await expect(
    page.getByRole("button", { exact: true, name: "Offer 2" })
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { exact: true, name: "Trade for Reward 2" })
    .click();

  let calls = await page.evaluate(
    () =>
      // SAFETY: this test's initScript initializes this precise playback log before navigation.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      (window as typeof window & TradingAudioWindow).tradeAudio
  );

  expect(calls.map((c) => c.volume)).toEqual([0.25, 1]);
  expect(calls[1].pitch).toBe(1);
  expect(clips.some((c) => c.src === calls[1].src)).toBe(true);
  const scroll = page.getByRole("scrollbar", { name: "Trade offers scroll" });
  await scroll.focus();
  await scroll.press("End");
  await expect(scroll).toHaveAttribute("aria-valuenow", "2");
  await expect(
    page.getByRole("button", { exact: true, name: "Offer 1" })
  ).toHaveCount(0);
  await page.getByRole("button", { exact: true, name: "Offer 9" }).click();

  const disabled = page.getByRole("button", {
    exact: true,
    name: "Trade for Reward 9",
  });

  await expect(disabled).toBeDisabled();
  calls = await page.evaluate(
    () =>
      // SAFETY: this test's initScript initializes this precise playback log before navigation.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      (window as typeof window & TradingAudioWindow).tradeAudio
  );
  expect(calls).toHaveLength(3);
  await disabled.hover({ force: true });
  expect(
    await page.evaluate(
      () =>
        // SAFETY: this test's initScript initializes this precise playback log before navigation.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        (window as typeof window & TradingAudioWindow).tradeAudio.length
    )
  ).toBe(3);
  await scroll.focus();
  await scroll.press("Home");
  await expect(scroll).toHaveAttribute("aria-valuenow", "0");
  await scroll.hover();
  await page.mouse.wheel(0, 100);
  await expect(scroll).toHaveAttribute("aria-valuenow", "1");
  const box = await scroll.boundingBox();
  expectNotNull(box, "Missing required bounding box: box");
  await page.mouse.move(box.x + 3, box.y + box.height - 8);
  await page.mouse.down();
  await page.mouse.move(box.x + 3, box.y + box.height - 2);
  await page.mouse.up();
  await expect(scroll).toHaveAttribute("aria-valuenow", "2");
  await page.goto(url({ muted: true }));
  await page.getByRole("button", { exact: true, name: "Offer 2" }).click();
  await page
    .getByRole("button", { exact: true, name: "Trade for Reward 2" })
    .click();
  expect(
    await page.evaluate(
      () =>
        // SAFETY: this test's initScript initializes this precise playback log before navigation.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        (window as typeof window & TradingAudioWindow).tradeAudio
    )
  ).toEqual([]);
});
