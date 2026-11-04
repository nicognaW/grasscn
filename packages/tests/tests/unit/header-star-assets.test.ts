import { test, expect } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { referenceFile } from "@grasscn/tests/paths";
import { fireworkSounds } from "@grasscn/web/ui/minecraft-firework-sound-assets";
import { z } from "zod";

const fileSchema = z.object({
  export: z.string(),
  key: z.tuple([z.string()], z.number()),
  resource: z.string().optional(),
  sha1: z.string().optional(),
  sha256: z.string(),
  size: z.number(),
});

const provenance = z
  .object({
    assetIndex: z.object({ sha1: z.string() }),
    files: z.array(fileSchema),
    soundDefinitions: z.object({ sha1: z.string() }),
    soundEvents: z.record(
      z.string(),
      z.object({
        definition: z.json(),
        variants: z.array(
          z.object({
            name: z.string(),
            pitch: z.number(),
            volume: z.number(),
            weight: z.number(),
          })
        ),
      })
    ),
  })
  .parse(
    JSON.parse(
      readFileSync(referenceFile("header-star/asset-provenance.json"), "utf-8")
    )
  );

// Texture provenance of the same record is a PPT reference-integrity check
// (packages/pixel-perfect/tests/header-star/header-star-assets.spec.ts); the
// sounds stay here with the other non-PPT sound tests.
const soundFiles = provenance.files.filter(
  (record) => record.resource !== undefined
);

// Every embedded sound data URI, addressed by its key path.
const embedded = new Map<string, string>(
  Object.entries(fireworkSounds).flatMap(([name, clips]) =>
    clips.map((clip, position) => [`${name}/${position}`, clip])
  )
);

const hash = (bytes: Uint8Array, algorithm = "sha256") =>
  createHash(algorithm).update(bytes).digest("hex");

const OGG_DATA_URI = /^data:audio\/ogg;base64,(?<data>[A-Za-z0-9+/=]+)$/u;

test("every embedded header star sound matches its recorded provenance", () => {
  for (const record of soundFiles) {
    const label = record.resource;
    const uri = embedded.get(record.key.join("/")) ?? "";
    const data = OGG_DATA_URI.exec(uri)?.groups?.data;

    expect(record.export, label).toBe("fireworkSounds");
    expect(data, label).toBeDefined();

    const bytes = Buffer.from(data ?? "", "base64");
    expect(bytes.length, label).toBe(record.size);
    expect(hash(bytes), label).toBe(record.sha256);
    expect(hash(bytes, "sha1"), label).toBe(record.sha1 ?? "");
  }

  expect(
    provenance.files.filter((record) => record.export === "fireworkSounds")
      .length,
    "fireworkSounds embeds a file without provenance"
  ).toBe(embedded.size);
});

test("header star sound provenance names the asset index 32 resources", () => {
  // Pins computed independently: sound SHA-1s from Mojang's asset index 32.
  expect(provenance.assetIndex.sha1).toBe(
    "56a546ca1ea01548679d6b4269363d0c6697a454"
  );
  expect(provenance.soundDefinitions.sha1).toBe(
    "9ac006d5537ed0fa4a7bcd1eccfc505155847686"
  );

  expect(
    Object.fromEntries(
      soundFiles.map((record) => [record.resource, record.sha1])
    )
  ).toEqual({
    "minecraft/sounds/fireworks/blast1.ogg":
      "71d9ad77da5febc1b2b7bd5916ca730c2b9ab6a8",
    "minecraft/sounds/fireworks/largeblast1.ogg":
      "62b284afd1c5805c6300c41e80c3f27e1994b2e3",
    "minecraft/sounds/fireworks/launch1.ogg":
      "9d1ba828a27b2a6b5be6b97e4d6b554db885cb08",
    "minecraft/sounds/fireworks/twinkle1.ogg":
      "cfa1c4fcdb9c70534b54249266f877ad2fac7a9f",
  });
});

test("firework sound events record their sounds.json variants, weights, pitch and volume", () => {
  // Expected values come from the 26.2 sounds.json definitions, which list one
  // bare name per near event, so SoundEventRegistrationSerializer defaults apply.
  const defaults = { pitch: 1, volume: 1, weight: 1 };

  expect(
    Object.fromEntries(
      Object.entries(provenance.soundEvents).map(([event, entry]) => [
        event,
        entry.variants.map(({ name, pitch, volume, weight }) => ({
          name,
          pitch,
          volume,
          weight,
        })),
      ])
    )
  ).toEqual({
    "entity.firework_rocket.blast": [{ ...defaults, name: "fireworks/blast1" }],
    "entity.firework_rocket.large_blast": [
      { ...defaults, name: "fireworks/largeblast1" },
    ],
    "entity.firework_rocket.launch": [
      { ...defaults, name: "fireworks/launch1" },
    ],
    "entity.firework_rocket.twinkle": [
      { ...defaults, name: "fireworks/twinkle1" },
    ],
  });

  expect(
    provenance.soundEvents["entity.firework_rocket.launch"]?.definition
  ).toEqual({
    sounds: ["fireworks/launch1"],
    subtitle: "subtitles.entity.firework_rocket.launch",
  });
});
