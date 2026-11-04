// Recovers the original Minecraft Java Edition 26.2 bytes for the header star
// button UI ports (Redstone Lamp display, nether star, fireworks) and records
// their provenance.
//
// Usage: bun generate-header-star-assets.ts <26.2.jar> [assets directory]
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

import { repositoryFile, webFile } from "@grasscn/tests/paths";
import { z } from "zod";

const pins = Object.freeze({
  // Mojang publishes the SHA-1; the SHA-256 was computed from the same local
  // bytes. The repository's older assetIndexSha256 record (957fc71…) does not
  // match these bytes, although every object SHA-1 it lists does.
  assetIndexSha1: "56a546ca1ea01548679d6b4269363d0c6697a454",
  assetIndexSha256:
    "4cfec4ed901a85a5d532ff210cf4f1ff35e954b5d1c71c3ad2fa7b96b826c2d1",
  jarSha256: "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290",
});

const provenancePath =
  "packages/tests/fixtures/reference/header-star/asset-provenance.json";

const [jarPath, assetsArgument] = process.argv.slice(2);

if (jarPath === undefined) {
  throw new Error(
    "Usage: bun generate-header-star-assets.ts <26.2.jar> [assets directory]"
  );
}

const assetsRoot =
  assetsArgument ?? path.resolve(path.dirname(jarPath), "../../assets");

const hash = (bytes: Uint8Array, algorithm = "sha256") =>
  createHash(algorithm).update(bytes).digest("hex");

const jar = await readFile(jarPath);
const indexBytes = await readFile(path.join(assetsRoot, "indexes/32.json"));

const jarSha256 = hash(jar);
const indexSha1 = hash(indexBytes, "sha1");
const indexSha256 = hash(indexBytes);

const refusals = [
  jarSha256 === pins.jarSha256
    ? undefined
    : `Unexpected Minecraft JAR: sha256 ${jarSha256}, expected ${pins.jarSha256}`,
  indexSha1 === pins.assetIndexSha1 && indexSha256 === pins.assetIndexSha256
    ? undefined
    : `Unexpected asset index 32: sha1 ${indexSha1}, expected ${pins.assetIndexSha1}`,
].filter((refusal) => refusal !== undefined);

if (refusals.length > 0) {
  console.error(refusals.join("\n"));
  process.exit(1);
}

interface JarMember {
  compressedSize: number;
  local: number;
  method: number;
  size: number;
}

const END_OF_CENTRAL_DIRECTORY = 0x06_05_4b_50;
const CENTRAL_DIRECTORY_ENTRY = 0x02_01_4b_50;

const readJarMembers = (zip: Buffer) => {
  let end = zip.length - 22;

  while (end >= 0 && zip.readUInt32LE(end) !== END_OF_CENTRAL_DIRECTORY) {
    end -= 1;
  }

  assert.ok(end >= 0, "JAR central directory missing");

  const entries = new Map<string, JarMember>();
  let position = zip.readUInt32LE(end + 16);

  while (zip.readUInt32LE(position) === CENTRAL_DIRECTORY_ENTRY) {
    const nameLength = zip.readUInt16LE(position + 28);

    const name = zip.toString(
      "utf-8",
      position + 46,
      position + 46 + nameLength
    );

    entries.set(name, {
      compressedSize: zip.readUInt32LE(position + 20),
      local: zip.readUInt32LE(position + 42),
      method: zip.readUInt16LE(position + 10),
      size: zip.readUInt32LE(position + 24),
    });

    position +=
      46 +
      nameLength +
      zip.readUInt16LE(position + 30) +
      zip.readUInt16LE(position + 32);
  }

  return entries;
};

const members = readJarMembers(jar);

const member = (name: string) => {
  const entry = members.get(name);
  assert.ok(entry, `Missing JAR member: ${name}`);
  assert.ok([0, 8].includes(entry.method), `Unexpected compression: ${name}`);

  const start =
    entry.local +
    30 +
    jar.readUInt16LE(entry.local + 26) +
    jar.readUInt16LE(entry.local + 28);

  const stored = jar.subarray(start, start + entry.compressedSize);

  const bytes = Buffer.from(
    entry.method === 8 ? inflateRawSync(stored) : stored
  );

  assert.equal(bytes.length, entry.size, `Unexpected size: ${name}`);

  return bytes;
};

const indexSchema = z.object({
  objects: z.record(
    z.string(),
    z.object({ hash: z.string(), size: z.number() })
  ),
});

const index = new Map(
  Object.entries(
    indexSchema.parse(JSON.parse(indexBytes.toString("utf-8"))).objects
  )
);

const indexed = async (resource: string) => {
  const entry = index.get(resource);
  assert.ok(entry, `Missing indexed resource: ${resource}`);

  const bytes = await readFile(
    path.join(assetsRoot, "objects", entry.hash.slice(0, 2), entry.hash)
  );

  assert.equal(bytes.length, entry.size, `Unexpected size: ${resource}`);
  assert.equal(
    hash(bytes, "sha1"),
    entry.hash,
    `Unexpected SHA-1: ${resource}`
  );

  return bytes;
};

const textureMember = (name: string) => `assets/minecraft/textures/${name}.png`;

const pngUrl = (bytes: Buffer) =>
  `data:image/png;base64,${bytes.toString("base64")}`;

const oggUrl = (bytes: Buffer) =>
  `data:audio/ogg;base64,${bytes.toString("base64")}`;

// A key is the property path of the data URI inside its exported constant.
type Key = readonly [string] | readonly [string, number];

interface TextureModule {
  exportName: string;
  module: string;
  textures: readonly (readonly [Key, string])[];
}

const textureModules: readonly TextureModule[] = [
  {
    exportName: "redstoneLampTextures",
    module: "registry/ui/minecraft-redstone-lamp-assets.ts",
    textures: [
      [["lit"], "block/redstone_lamp_on"],
      [["unlit"], "block/redstone_lamp"],
    ],
  },
  {
    exportName: "netherStarTextures",
    module: "lib/minecraft-nether-star-assets.ts",
    textures: [
      [["item"], "item/nether_star"],
      [["glint"], "misc/enchanted_glint_item"],
    ],
  },
  {
    exportName: "fireworkTextures",
    module: "registry/ui/minecraft-firework-assets.ts",
    textures: [
      [["rocket"], "item/firework_rocket"],
      [["flash"], "particle/flash"],
      ...Array.from(
        { length: 8 },
        (_, frame) => [["spark", frame], `particle/spark_${frame}`] as const
      ),
    ],
  },
];

const soundEvents = [
  ["launch", "entity.firework_rocket.launch"],
  ["blast", "entity.firework_rocket.blast"],
  ["largeBlast", "entity.firework_rocket.large_blast"],
  ["twinkle", "entity.firework_rocket.twinkle"],
] as const;

type Embedded = Record<string, string | string[]>;

const assign = (target: Embedded, key: Key, value: string) => {
  const [name, position] = key;

  if (position === undefined) {
    target[name] = value;

    return;
  }

  const list = target[name];
  const values = Array.isArray(list) ? list : [];
  values[position] = value;
  target[name] = values;
};

const header = (description: string) =>
  `// Unmodified Minecraft Java Edition 26.2 ${description}; provenance in ${provenancePath}.\n`;

const metadataSchema = z.json();

interface TextureRecord {
  export: string;
  height: number;
  key: Key;
  member: string;
  metadata?: z.infer<typeof metadataSchema>;
  metadataMember?: string;
  metadataSha256?: string;
  module: string;
  sha256: string;
  size: number;
  width: number;
}

interface SoundRecord {
  export: string;
  key: Key;
  module: string;
  resource: string;
  sha1: string;
  sha256: string;
  size: number;
}

const files: (TextureRecord | SoundRecord)[] = [];
const outputs: (readonly [string, string])[] = [];

for (const { exportName, module, textures } of textureModules) {
  const value: Embedded = {};

  for (const [key, texture] of textures) {
    const name = textureMember(texture);
    const bytes = member(name);
    const metadataName = `${name}.mcmeta`;

    assign(value, key, pngUrl(bytes));

    const record: TextureRecord = {
      export: exportName,
      height: bytes.readUInt32BE(20),
      key,
      member: name,
      module,
      sha256: hash(bytes),
      size: bytes.length,
      width: bytes.readUInt32BE(16),
    };

    if (members.has(metadataName)) {
      const metadata = member(metadataName);

      record.metadata = metadataSchema.parse(
        JSON.parse(metadata.toString("utf-8"))
      );
      record.metadataMember = metadataName;
      record.metadataSha256 = hash(metadata);
    }

    files.push(record);
  }

  outputs.push([
    module,
    `${header("textures")}export const ${exportName} = ${JSON.stringify(value)} as const\n`,
  ]);
}

// Defaults applied by SoundEventRegistrationSerializer.getSound for omitted
// fields; a bare string names a file variant with every default.
const variantSchema = z
  .union([z.string().transform((name) => ({ name })), z.looseObject({})])
  .pipe(
    z.object({
      attenuation_distance: z.number().default(16),
      name: z.string(),
      pitch: z.number().default(1),
      preload: z.boolean().default(false),
      stream: z.boolean().default(false),
      type: z.string().default("file"),
      volume: z.number().default(1),
      weight: z.number().default(1),
    })
  );

const definitionSchema = z.looseObject({ sounds: z.array(z.json()) });

const definitionsResource = "minecraft/sounds.json";
const definitionsBytes = await indexed(definitionsResource);

const definitions = new Map(
  Object.entries(
    z
      .record(z.string(), definitionSchema)
      .parse(JSON.parse(definitionsBytes.toString("utf-8")))
  )
);

interface ResolvedVariant {
  attenuationDistance: number;
  name: string;
  pitch: number;
  preload: boolean;
  resource: string;
  stream: boolean;
  type: string;
  volume: number;
  weight: number;
}

interface ResolvedEvent {
  definition: z.infer<typeof definitionSchema>;
  key: string;
  variants: ResolvedVariant[];
}

const soundModule = "registry/ui/minecraft-firework-sound-assets.ts";
const sounds: Record<string, string[]> = {};
const resolvedEvents: Record<string, ResolvedEvent> = {};

for (const [key, event] of soundEvents) {
  const definition = definitions.get(event);
  assert.ok(definition, `Missing sound event: ${event}`);

  const variants = definition.sounds.map((entry): ResolvedVariant => {
    const variant = variantSchema.parse(entry);

    return {
      attenuationDistance: variant.attenuation_distance,
      name: variant.name,
      pitch: variant.pitch,
      preload: variant.preload,
      resource: `minecraft/sounds/${variant.name}.ogg`,
      stream: variant.stream,
      type: variant.type,
      volume: variant.volume,
      weight: variant.weight,
    };
  });

  assert.ok(
    variants.every((variant) => variant.type === "file"),
    `Event references are not supported: ${event}`
  );

  const clips: string[] = [];

  for (const [position, variant] of variants.entries()) {
    // oxlint-disable-next-line no-await-in-loop -- few small local reads; order is load-bearing.
    const bytes = await indexed(variant.resource);
    clips.push(oggUrl(bytes));
    files.push({
      export: "fireworkSounds",
      key: [key, position],
      module: soundModule,
      resource: variant.resource,
      sha1: hash(bytes, "sha1"),
      sha256: hash(bytes),
      size: bytes.length,
    });
  }

  sounds[key] = clips;
  resolvedEvents[event] = { definition, key, variants };
}

outputs.push([
  soundModule,
  `${header("firework sounds from asset index 32 (near variants only)")}export const fireworkSounds = ${JSON.stringify(sounds)} as const\n`,
]);

const provenance = {
  assetIndex: {
    id: "32",
    note: "Pinned by the local index bytes, whose SHA-1 matches Mojang's published value. The older repository record 957fc71aae47d44099285bfd32ea9f2896bfff1b1ff7b3f6a74abdbe0ffb8973 does not match these bytes; every object SHA-1 it lists does.",
    sha1: indexSha1,
    sha256: indexSha256,
  },
  embeddedBytes: "unchanged",
  files,
  generator:
    "packages/pixel-perfect/src/native/generate/generate-header-star-assets.ts",
  minecraftVersion: "26.2",
  soundDefinitions: {
    resource: definitionsResource,
    sha1: hash(definitionsBytes, "sha1"),
    sha256: hash(definitionsBytes),
    size: definitionsBytes.length,
  },
  soundEvents: resolvedEvents,
  sourceJarSha256: jarSha256,
};

for (const [module, source] of outputs) {
  // oxlint-disable-next-line no-await-in-loop -- sequential writes keep failures attributable.
  await writeFile(webFile(module), source);
}

const provenanceFile = repositoryFile(provenancePath);

await mkdir(path.dirname(provenanceFile), { recursive: true });

await writeFile(provenanceFile, `${JSON.stringify(provenance, null, 2)}\n`);

console.log(
  `Recovered ${files.length} original files for ${soundEvents.length} sound events and ${textureModules.length} texture modules.`
);
