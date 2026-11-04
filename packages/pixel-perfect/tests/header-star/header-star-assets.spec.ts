// Reference integrity of the header star textures: the Redstone Lamp,
// nether star and firework textures embedded in the UI ports are the
// original Minecraft Java Edition 26.2 JAR members. The sound provenance of
// the same record stays with the non-PPT sound tests in packages/tests.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { referenceFile } from "@grasscn/tests/paths";
import { netherStarTextures } from "@grasscn/web/lib/minecraft-nether-star-assets";
import { fireworkTextures } from "@grasscn/web/ui/minecraft-firework-assets";
import { redstoneLampTextures } from "@grasscn/web/ui/minecraft-redstone-lamp-assets";
import { z } from "zod";

const provenance = z
  .object({
    files: z.array(
      z.object({
        export: z.string(),
        key: z.tuple([z.string()], z.number()),
        member: z.string().optional(),
        sha256: z.string(),
        size: z.number(),
      })
    ),
    sourceJarSha256: z.string(),
  })
  .parse(
    JSON.parse(
      readFileSync(referenceFile("header-star/asset-provenance.json"), "utf-8")
    )
  );

const textureFiles = provenance.files.filter(
  (record) => record.member !== undefined
);

// Every embedded texture data URI per exported constant, addressed by its key path.
const embedded = new Map<string, Map<string, string>>(
  Object.entries({
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

const PNG_DATA_URI = /^data:image\/png;base64,(?<data>[A-Za-z0-9+/=]+)$/u;

test("every embedded header star texture matches its recorded provenance", () => {
  for (const record of textureFiles) {
    const uri = embedded.get(record.export)?.get(record.key.join("/")) ?? "";
    const data = PNG_DATA_URI.exec(uri)?.groups?.data;

    expect(data, record.member).toBeDefined();

    const bytes = Buffer.from(data ?? "", "base64");
    expect(bytes.length, record.member).toBe(record.size);
    expect(
      createHash("sha256").update(bytes).digest("hex"),
      record.member
    ).toBe(record.sha256);
  }

  for (const [name, uris] of embedded) {
    expect(
      textureFiles.filter((record) => record.export === name).length,
      `${name} embeds a texture without provenance`
    ).toBe(uris.size);
  }
});

test("header star texture provenance names the original 26.2 JAR members", () => {
  // Pins computed independently with Python zipfile and sha256.
  expect(provenance.sourceJarSha256).toBe(
    "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290"
  );

  expect(
    Object.fromEntries(
      textureFiles.map((record) => [record.member, record.sha256])
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
});
