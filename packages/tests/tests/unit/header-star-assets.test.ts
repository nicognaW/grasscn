import { test, expect } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { referenceFile } from "@grasscn/tests/paths";
import { netherStarTextures } from "@grasscn/web/lib/minecraft-nether-star-assets";
import { fireworkTextures } from "@grasscn/web/ui/minecraft-firework-assets";
import { fireworkSounds } from "@grasscn/web/ui/minecraft-firework-sound-assets";
import { redstoneLampTextures } from "@grasscn/web/ui/minecraft-redstone-lamp-assets";
import { z } from "zod";

const fileSchema = z.object({
  export: z.string(),
  key: z.tuple([z.string()], z.number()),
  member: z.string().optional(),
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
    sourceJarSha256: z.string(),
  })
  .parse(
    JSON.parse(
      readFileSync(referenceFile("header-star/asset-provenance.json"), "utf-8")
    )
  );

// Every embedded data URI per exported constant, addressed by its key path.
const embedded = new Map<string, Map<string, string>>(
  Object.entries({
    fireworkSounds: Object.fromEntries(
      Object.entries(fireworkSounds).flatMap(([name, clips]) =>
        clips.map((clip, position) => [`${name}/${position}`, clip])
      )
    ),
    fireworkTextures: {
      flash: fireworkTextures.flash,
      rocket: fireworkTextures.rocket,
      ...Object.fromEntries(
        fireworkTextures.spark.map((spark, frame) => [`spark/${frame}`, spark])
      ),
    },
    netherStarTextures,
    redstoneLampTextures,
  }).map(([name, uris]) => [name, new Map(Object.entries(uris))])
);

const hash = (bytes: Uint8Array, algorithm = "sha256") =>
  createHash(algorithm).update(bytes).digest("hex");

const DATA_URI =
  /^data:(?<type>image\/png|audio\/ogg);base64,(?<data>[A-Za-z0-9+/=]+)$/u;

const decode = (uri: string | undefined) => {
  const groups = DATA_URI.exec(uri ?? "")?.groups;

  return {
    bytes: Buffer.from(groups?.data ?? "", "base64"),
    type: groups?.type,
  };
};

test("every embedded header star asset matches its recorded provenance", () => {
  for (const record of provenance.files) {
    const label = record.member ?? record.resource;

    const { bytes, type } = decode(
      embedded.get(record.export)?.get(record.key.join("/"))
    );

    expect(type, label).toBe(
      record.member === undefined ? "audio/ogg" : "image/png"
    );
    expect(bytes.length, label).toBe(record.size);
    expect(hash(bytes), label).toBe(record.sha256);

    if (record.resource !== undefined) {
      expect(hash(bytes, "sha1"), label).toBe(record.sha1 ?? "");
    }
  }

  for (const [name, uris] of embedded) {
    expect(
      provenance.files.filter((record) => record.export === name).length,
      `${name} embeds a file without provenance`
    ).toBe(uris.size);
  }
});

test("header star provenance names the original 26.2 JAR members and asset index 32 resources", () => {
  // Pins computed independently: JAR members with Python zipfile and sha256,
  // sound SHA-1s from Mojang's asset index 32.
  expect(provenance.sourceJarSha256).toBe(
    "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290"
  );
  expect(provenance.assetIndex.sha1).toBe(
    "56a546ca1ea01548679d6b4269363d0c6697a454"
  );
  expect(provenance.soundDefinitions.sha1).toBe(
    "9ac006d5537ed0fa4a7bcd1eccfc505155847686"
  );

  expect(
    Object.fromEntries(
      provenance.files.flatMap((record) =>
        record.member === undefined ? [] : [[record.member, record.sha256]]
      )
    )
  ).toEqual({
    "assets/minecraft/textures/block/redstone_lamp.png":
      "60d43bc037630fdf7a770f31e10a59312609f084fcabe73725030036611de84a",
    "assets/minecraft/textures/block/redstone_lamp_on.png":
      "7a1179a50639369b828de16d24c37102be44d81d73205a0950e4549f2c53c899",
    "assets/minecraft/textures/item/firework_rocket.png":
      "661a46e05516554d8ab2df91bd34dfa18dec1728e77a2d369270c429dedc208b",
    "assets/minecraft/textures/item/nether_star.png":
      "1378e77a3ff64e219a3fa7d5812340a4b4c96c7b2066b728df1940a4f61b89f1",
    "assets/minecraft/textures/misc/enchanted_glint_item.png":
      "23831803126a3b75e74deeb5a5e39df9a26c94872d20533f444eb5072b417fb5",
    "assets/minecraft/textures/particle/flash.png":
      "fb43dd3a354fb84f31b00a1d286a4dcd8beeb5daba75986ca1a5d18594500f30",
    "assets/minecraft/textures/particle/spark_0.png":
      "be91dc02f3de33dd060b4d2d4e4987bd0853c4721b8db94c86f72e8d111ed9d9",
    "assets/minecraft/textures/particle/spark_1.png":
      "35dae570734d89e8d5c5ea6beacc61014da7b51103f3692ec89684f8f5b09078",
    "assets/minecraft/textures/particle/spark_2.png":
      "159017b370afa4e9cdca2fe4c95cb650d13b3743baa43ed49ca750564a83a3b8",
    "assets/minecraft/textures/particle/spark_3.png":
      "05a3815096149e8f65ed07957cbcc9abf607675393021b998a8e87d5d9bdac8b",
    "assets/minecraft/textures/particle/spark_4.png":
      "0b381533495f88ff21da0f99f3afd86c3608f9b181a3500fd4543abea97c7e52",
    "assets/minecraft/textures/particle/spark_5.png":
      "f9d042e733a39e386d199dbd90e7578f545fe09efd15ab5b1b5d3037b738af97",
    "assets/minecraft/textures/particle/spark_6.png":
      "dd4fd77518077dd6ca227c5499b3aa57c02a998cbe632245cf7680b254a5150b",
    "assets/minecraft/textures/particle/spark_7.png":
      "f9d042e733a39e386d199dbd90e7578f545fe09efd15ab5b1b5d3037b738af97",
  });

  expect(
    Object.fromEntries(
      provenance.files.flatMap((record) =>
        record.resource === undefined ? [] : [[record.resource, record.sha1]]
      )
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
