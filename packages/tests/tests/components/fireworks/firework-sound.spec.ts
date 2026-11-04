// Firework sounds: the embedded near-variant OGGs are the original bytes and
// decode in the browser, and one launch plays each native sound once, on
// its native tick, with the native pitch, through the shared master volume.
// Expected calls come from the native record (the read-only SoundManager
// hook, fixtures/reference/firework-sounds), heard by
// the declared listener within 10 blocks of the explosion.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { test, expect } from "@grasscn/tests/test";
import type { Page } from "@grasscn/tests/test";
import { fireworkSounds } from "@grasscn/web/ui/minecraft-firework-sound-assets";
import { referenceFile } from "@tests/paths";
import { z } from "zod";

const provenance = z
  .object({
    files: z.array(
      z.object({
        export: z.string(),
        key: z.tuple([z.string()], z.number()),
        resource: z.string().optional(),
        sha1: z.string().optional(),
        sha256: z.string(),
        size: z.number(),
      })
    ),
    soundEvents: z.record(z.string(), z.object({ key: z.string() })),
  })
  .parse(
    JSON.parse(
      readFileSync(referenceFile("header-star/asset-provenance.json"), "utf-8")
    )
  );

const nativeNear = z
  .object({
    listeners: z.array(
      z.object({
        name: z.string(),
        sounds: z.array(
          z.object({
            delayTicks: z.number(),
            // The SoundInstance pitch float, as raw IEEE 754 bits.
            pitchBits: z.number().int(),
            sound: z.string(),
            tick: z.number(),
          })
        ),
      })
    ),
  })
  .parse(
    JSON.parse(
      readFileSync(referenceFile("firework-sounds/manifest.json"), "utf-8")
    )
  )
  .listeners.find((listener) => listener.name === "near");

const floatFromBits = (bits: number) => {
  const view = new DataView(new ArrayBuffer(4));
  view.setInt32(0, bits);

  return view.getFloat32(0);
};

type ClipKey = keyof typeof fireworkSounds;

const isClipKey = (key: string): key is ClipKey => key in fireworkSounds;

const clip = (event: string) => {
  const key = provenance.soundEvents[event.replace(/^minecraft:/u, "")]?.key;

  if (key === undefined || !isClipKey(key)) {
    throw new Error(`No embedded clip for ${event}`);
  }

  return fireworkSounds[key][0];
};

interface Voice {
  preservesPitch: boolean;
  rate: number;
  source: string;
  tick: number;
  volume: number;
}

declare global {
  interface Window {
    __soundVoices: Voice[];
  }
}

const launch = async (page: Page, volume: number) => {
  await page.goto(`/firework-sound.html?volume=${volume}`);
  await page.getByRole("button", { name: "Launch fireworks" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-done", "true", {
    timeout: 15_000,
  });

  return await page.evaluate(() => window.__soundVoices);
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const voices: Voice[] = [];
    window.__soundVoices = voices;
    // oxlint-disable-next-line require-await -- HTMLMediaElement.play resolves once playback starts; the stub records the voice and resolves at once.
    HTMLMediaElement.prototype.play = async function play() {
      voices.push({
        preservesPitch: this.preservesPitch,
        rate: this.playbackRate,
        source: this.src,
        tick: Number(document.body.dataset.tick),
        volume: this.volume,
      });
    };
  });
});

test("Firework sounds embed the original near-variant OGGs, which decode in the browser", async ({
  page,
}) => {
  const files = provenance.files.filter(
    (file) => file.export === "fireworkSounds"
  );

  expect(files.map((file) => file.resource)).toEqual([
    "minecraft/sounds/fireworks/launch1.ogg",
    "minecraft/sounds/fireworks/blast1.ogg",
    "minecraft/sounds/fireworks/largeblast1.ogg",
    "minecraft/sounds/fireworks/twinkle1.ogg",
  ]);
  await page.goto("/firework-sound.html");

  for (const file of files) {
    const [key, index = 0] = file.key;
    const source = isClipKey(key) ? fireworkSounds[key][index] : undefined;

    if (source === undefined) {
      throw new Error(`Missing embedded clip ${key}[${index}]`);
    }

    const bytes = Buffer.from(source.split(",")[1] ?? "", "base64");
    expect(bytes.length).toBe(file.size);
    expect(createHash("sha1").update(bytes).digest("hex")).toBe(file.sha1);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(file.sha256);

    // oxlint-disable-next-line no-await-in-loop -- One decode per clip, in provenance order.
    const duration = await page.evaluate(async (data) => {
      const context = new AudioContext();

      try {
        const response = await fetch(data);

        const audio = await context.decodeAudioData(
          await response.arrayBuffer()
        );

        return audio.duration;
      } finally {
        await context.close();
      }
    }, source);

    expect(duration).toBeGreaterThan(0);
  }
});

test("One launch plays each native near sound once, on its tick, at native pitch and the master volume", async ({
  page,
}) => {
  if (nativeNear === undefined) {
    throw new Error("Native near listener record missing");
  }

  expect(nativeNear.sounds.map((sound) => sound.sound)).toEqual([
    "minecraft:entity.firework_rocket.launch",
    "minecraft:entity.firework_rocket.large_blast",
    "minecraft:entity.firework_rocket.twinkle",
  ]);

  const voices = await launch(page, 0.5);

  expect(voices).toEqual(
    nativeNear.sounds.map((sound) => ({
      // OpenAL pitch resamples: the playback rate also shifts the pitch.
      preservesPitch: false,
      rate: floatFromBits(sound.pitchBits),
      source: clip(sound.sound),
      tick: sound.tick + sound.delayTicks,
      // SoundEngine.calculateVolume clamps the instance volume (3 and 20) to
      // 1, then scales it by the category volume: here the master volume.
      volume: 0.5,
    }))
  );
});

test("Firework sounds follow the master volume, and are silent when it is 0", async ({
  page,
}) => {
  const full = await launch(page, 1);

  expect(full.map((voice) => voice.volume)).toEqual([1, 1, 1]);
  expect(await launch(page, 0)).toEqual([]);
});
