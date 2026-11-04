// Captures the projected firework rocket references (ADR 0005) from the
// unmodified Minecraft Java Edition 26.2 server and renderer in two
// independent native launches: one rocket from launch to its last spark at
// fixed entity and particle seeds, the integrated server and the client in
// lockstep, one frame per tick at partialTick 0. It then retains the corpus
// beside its case definition, with the native sequence ticks and sounds.
//
// Usage (Linux, under Xvfb):
//   xvfb-run -a -s "-screen 0 1920x1080x24" bun capture-projected-firework-rocket.ts \
//     <versions/26.2 dir> <JDK 25 bin dir> <case dir> <fresh scratch dir>
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { repoRoot } from "@grasscn/tests/paths";
import { PNG } from "pngjs";
import { z } from "zod";

import { deriveGeometryMask } from "../../harness/projected-reference";
import {
  nativeSoundSchema,
  projectedFireworkRocketCaseSchema,
} from "../projected-firework-rocket-case";

const JAR_SHA256 =
  "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290";

const projectedHarness = path.join(
  repoRoot,
  "packages/pixel-perfect/tests/reference/projected"
);

const HARNESS_JAVA = path.join(projectedHarness, "ProjectedReferenceMain.java");
const AGENT_JAVA = path.join(projectedHarness, "ParticleSeedAgent.java");

const LAUNCHER = path.join(
  import.meta.dirname,
  "capture-projected-firework-rocket.ts"
);

const CASE_SCHEMA = path.join(
  import.meta.dirname,
  "../projected-firework-rocket-case.ts"
);

const COMPLETE = "GRASSCN_PROJECTED_REFERENCE_COMPLETE";

// The menu and level-loading backgrounds are near-black; the noon sky is not.
const MINIMUM_SKY_BLUE = 128;

const metadataSchema = z.object({
  assetIndex: z.object({ id: z.string() }),
  libraries: z.array(
    z.object({
      downloads: z
        .object({ artifact: z.object({ path: z.string() }).optional() })
        .optional(),
      name: z.string(),
      rules: z
        .array(
          z.object({
            action: z.string(),
            os: z
              .object({
                arch: z.string().optional(),
                name: z.string().optional(),
              })
              .optional(),
          })
        )
        .optional(),
    })
  ),
});

const rocketStateSchema = z
  .object({
    life: z.number().int(),
    lifetime: z.number().int(),
    movement: z.tuple([z.number(), z.number(), z.number()]),
    old: z.tuple([z.number(), z.number(), z.number()]),
    position: z.tuple([z.number(), z.number(), z.number()]),
  })
  .loose();

const fireworkRunSchema = z.object({
  backdrop: z.string(),
  cameraAtBackdrop: z.object({
    position: z.tuple([z.number(), z.number(), z.number()]),
    rotation: z.tuple([z.number(), z.number()]),
  }),
  clientEntitySeed: z.string(),
  explosion: z.object({
    colors: z.array(z.number().int()),
    fadeColors: z.array(z.number().int()),
  }),
  itemAtlas: z.record(z.string(), z.unknown()),
  kind: z.literal("firework-rocket"),
  lastTick: z.number().int().positive(),
  name: z.string(),
  particleSeed: z.string(),
  seededParticles: z.number().int().positive(),
  serverEntitySeed: z.string(),
  sounds: z.array(nativeSoundSchema),
  spawnedRocket: rocketStateSchema,
  ticks: z.array(
    z.object({
      equalsBackdrop: z.boolean(),
      frame: z.string(),
      particles: z.number().int(),
      rocketPresent: z.boolean(),
      tick: z.number().int().positive(),
    })
  ),
});

const tickStateSchema = z
  .object({
    rocket: rocketStateSchema.nullish(),
    serverRocket: rocketStateSchema.nullish(),
  })
  .loose();

const nativeRunSchema = z.object({
  captures: z.array(fireworkRunSchema).length(1),
  runtime: z.record(z.string(), z.unknown()),
});

const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const [versionArgument, javaArgument, caseArgument, scratchArgument] =
  process.argv.slice(2);

if (
  versionArgument === undefined ||
  javaArgument === undefined ||
  caseArgument === undefined ||
  scratchArgument === undefined
) {
  throw new Error(
    "Usage: bun capture-projected-firework-rocket.ts <version dir> <JDK 25 bin> <case dir> <fresh scratch dir>"
  );
}

const versionDirectory = path.resolve(versionArgument);
const javaBin = path.resolve(javaArgument);
const caseDirectory = path.resolve(caseArgument);
const scratch = path.resolve(scratchArgument);

const assertFresh = async (directory: string) => {
  try {
    const entries = await readdir(directory);
    assert.equal(
      entries.length,
      0,
      `Capture needs a fresh directory: ${directory}`
    );
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "ENOENT")
    ) {
      throw error;
    }
  }
};

await assertFresh(scratch);

const caseBytes = await readFile(path.join(caseDirectory, "case.json"));

const definition = projectedFireworkRocketCaseSchema.parse(
  JSON.parse(caseBytes.toString("utf-8"))
);

const instance = path.basename(versionDirectory);
const minecraftRoot = path.resolve(versionDirectory, "../..");
const jar = path.join(versionDirectory, `${instance}.jar`);
const jarSha256 = hash(await readFile(jar));

assert.equal(jarSha256, JAR_SHA256, "Unexpected Minecraft artifact");

const metadata = metadataSchema.parse(
  JSON.parse(
    await readFile(path.join(versionDirectory, `${instance}.json`), "utf-8")
  )
);

type Library = z.infer<typeof metadataSchema>["libraries"][number];

// Vanilla launcher rule evaluation for linux x86_64.
const permitted = (library: Library) => {
  if (library.rules === undefined) {
    return true;
  }

  let allowed = false;

  for (const rule of library.rules) {
    const osName = rule.os?.name ?? "linux";
    const arch = rule.os?.arch;

    if (osName === "linux" && (arch === undefined || /x86|amd64/u.test(arch))) {
      allowed = rule.action === "allow";
    }
  }

  return allowed;
};

const libraries: string[] = [];

for (const library of metadata.libraries) {
  const relative = library.downloads?.artifact?.path;

  if (
    relative !== undefined &&
    permitted(library) &&
    !/^(?:net\.fabricmc|org\.ow2\.asm|io\.github\.llamalad7):/u.test(
      library.name
    )
  ) {
    libraries.push(path.join(minecraftRoot, "libraries", relative));
  }
}

const options = [
  "guiScale:1",
  "lang:en_us",
  "forceUnicodeFont:false",
  "resourcePacks:[]",
  "highContrast:false",
  "showNowPlayingToast:false",
  "showMusicToast:false",
  "tutorialStep:none",
  "startedCleanly:true",
  "onboardAccessibility:false",
  "pauseOnLostFocus:false",
  "soundCategory_master:0.0",
  "",
].join("\n");

const scene = {
  camera: definition.camera,
  captures: [
    {
      ...definition.rocket,
      kind: "firework-rocket",
    },
  ],
  projection: definition.projection,
  world: definition.world,
};

const quote = (argument: string) =>
  `"${argument.replaceAll("\\", "\\\\").replaceAll('"', String.raw`\"`)}"`;

const runTool = async (
  work: string,
  tool: string,
  args: string[],
  log = tool
) => {
  const argsFile = path.join(work, `${log}.args`);
  await writeFile(argsFile, args.map(quote).join("\n"));

  const result = spawnSync(path.join(javaBin, tool), [`@${argsFile}`], {
    cwd: path.join(work, "game"),
    encoding: "utf-8",
    maxBuffer: 256 * 1024 * 1024,
    timeout: 1_800_000,
  });

  await writeFile(
    path.join(work, `${log}.log`),
    `${result.stdout}\n${result.stderr}`
  );

  if (result.error !== undefined || result.status !== 0) {
    throw new Error(
      `${tool} failed (${result.status}): see ${work}/${log}.log`
    );
  }

  return result.stdout;
};

const readPng = async (file: string) => PNG.sync.read(await readFile(file));

const identity = async (root: string, file: string) => {
  const bytes = await readFile(path.join(root, file));
  const image = PNG.sync.read(bytes);

  return {
    decodedRgbaSha256: hash(image.data),
    file,
    height: image.height,
    sha256: hash(bytes),
    width: image.width,
  };
};

const crop = (
  image: PNG,
  bounds: { height: number; width: number; x: number; y: number }
) => {
  const result = new PNG({ height: bounds.height, width: bounds.width });

  for (let row = 0; row < bounds.height; row += 1) {
    const start = ((bounds.y + row) * image.width + bounds.x) * 4;
    result.data.set(
      image.data.subarray(start, start + bounds.width * 4),
      row * bounds.width * 4
    );
  }

  return result;
};

const sameRgba = (a: PNG, b: PNG) =>
  a.width === b.width && a.height === b.height && a.data.equals(b.data);

type FireworkRun = z.infer<typeof fireworkRunSchema>;

type TickRecord = FireworkRun["ticks"][number];

/** Derives, validates and writes the geometry mask and reference of one tick frame. */
const retainTick = async (output: string, backdrop: PNG, tick: TickRecord) => {
  const sceneFrame = await readPng(path.join(output, tick.frame));

  if (sameRgba(sceneFrame, backdrop)) {
    assert.ok(tick.equalsBackdrop, `tick ${tick.tick}: backdrop flag`);

    return { empty: true as const, tick: tick.tick };
  }

  const mask = deriveGeometryMask(
    sceneFrame.data,
    backdrop.data,
    sceneFrame.width,
    sceneFrame.height
  );

  const [sentinelX, sentinelY] = definition.sentinel.at;
  const sentinelOffset = (sentinelY * sceneFrame.width + sentinelX) * 4;
  assert.equal(
    mask.covered[sentinelY * sceneFrame.width + sentinelX],
    0,
    `tick ${tick.tick}: sentinel lies on geometry`
  );

  const sentinel = [
    ...sceneFrame.data.subarray(sentinelOffset, sentinelOffset + 4),
  ];

  assert.ok(
    sentinel[3] === 255 &&
      (sentinel[2] ?? 0) >= MINIMUM_SKY_BLUE &&
      (sentinel[2] ?? 0) > (sentinel[0] ?? 0),
    `tick ${tick.tick}: sentinel ${sentinel.join(",")} is not open sky`
  );

  const fullMask = new PNG({
    height: sceneFrame.height,
    width: sceneFrame.width,
  });

  for (const [pixel, covered] of mask.covered.entries()) {
    fullMask.data.fill(covered ? 255 : 0, pixel * 4, pixel * 4 + 4);
  }

  const name = `${definition.rocket.name}.tick-${String(tick.tick).padStart(3, "0")}`;

  await Promise.all([
    writeFile(
      path.join(output, `references/${name}.png`),
      PNG.sync.write(crop(sceneFrame, mask.bounds))
    ),
    writeFile(
      path.join(output, `masks/${name}.png`),
      PNG.sync.write(crop(fullMask, mask.bounds))
    ),
  ]);

  const [maskIdentity, referenceIdentity, sceneIdentity] = await Promise.all([
    identity(output, `masks/${name}.png`),
    identity(output, `references/${name}.png`),
    identity(output, tick.frame),
  ]);

  return {
    empty: false as const,
    frame: {
      bounds: mask.bounds,
      coveredPixels: mask.coveredPixels,
      mask: maskIdentity,
      name,
      reference: referenceIdentity,
      sceneFrame: sceneIdentity,
      sentinel: { at: definition.sentinel.at, rgba: sentinel },
      tick: tick.tick,
    },
    tick: tick.tick,
  };
};

type TickState = z.infer<typeof tickStateSchema>;

// Background music starts at a random time; it is not part of the sequence.
const sequenceSounds = (run: FireworkRun) =>
  run.sounds.filter((sound) => sound.source !== "MUSIC");

/**
 * The sequence events, read from the native state dumps and sound calls and
 * cross-checked against the vanilla call sites: FireworkRocketEntity.tick
 * plays the launch sound on the server rocket's first tick and explodes it
 * once life > lifetime; FireworkParticles.Starter plays the blast on its
 * first tick and the twinkle once life > lifetime (16 with twinkle).
 */
const sequenceTicks = (firework: FireworkRun, states: TickState[]) => {
  const { lifetime } = firework.spawnedRocket;

  // Gson leaves out the state of a rocket that is gone.
  const serverGone = states.findIndex(
    (state) => (state.serverRocket ?? undefined) === undefined
  );

  const explosion = serverGone + 1;

  assert.equal(explosion, lifetime + 1, "Explosion tick");
  assert.equal(
    states.findIndex((state) => (state.rocket ?? undefined) === undefined) + 1,
    explosion,
    "The client rocket is removed with the explosion"
  );

  const soundTick = (fragment: string) => {
    const matches = sequenceSounds(firework).filter((sound) =>
      sound.sound.includes(fragment)
    );

    assert.equal(matches.length, 1, `One ${fragment} sound`);

    return matches[0]?.tick ?? 0;
  };

  const launch = soundTick("launch");
  const explosionBlast = soundTick("blast");
  const twinkle = soundTick("twinkle");

  assert.equal(launch, 1, "Launch sound on the first tick");
  assert.equal(explosionBlast, explosion + 1, "Blast on the starter's tick");
  assert.equal(twinkle, explosionBlast + 16, "Twinkle after the starter life");
  assert.equal(sequenceSounds(firework).length, 3, "Exactly three sounds");

  return {
    explosion,
    explosionBlast,
    lastSpark: firework.lastTick,
    launch,
    lifetime,
    twinkle,
  };
};

const launch = async (name: string) => {
  const work = path.join(scratch, name, "work");
  const output = path.join(scratch, name, "output");
  const classes = path.join(work, "classes");
  const agentClasses = path.join(work, "agent-classes");
  const agentJar = path.join(work, "particle-seed-agent.jar");

  await Promise.all(
    [
      path.join(work, "game"),
      classes,
      agentClasses,
      path.join(output, "references"),
      path.join(output, "masks"),
    ].map(async (directory) => await mkdir(directory, { recursive: true }))
  );

  const classpath = [classes, jar, ...libraries].join(path.delimiter);
  const sceneFile = path.join(work, "scene.json");
  await writeFile(sceneFile, `${JSON.stringify(scene, null, 2)}\n`);
  await writeFile(path.join(work, "game/options.txt"), options);
  await runTool(work, "javac", [
    "-encoding",
    "utf-8",
    "-classpath",
    classpath,
    "-d",
    classes,
    HARNESS_JAVA,
  ]);
  await runTool(
    work,
    "javac",
    ["-encoding", "utf-8", "-d", agentClasses, AGENT_JAVA],
    "javac-agent"
  );

  const manifestFile = path.join(work, "agent-manifest.txt");
  await writeFile(manifestFile, "Premain-Class: ParticleSeedAgent\n");
  await runTool(work, "jar", [
    "--create",
    "--file",
    agentJar,
    "--manifest",
    manifestFile,
    "-C",
    agentClasses,
    ".",
  ]);

  const stdout = await runTool(work, "java", [
    "-Xmx2G",
    `-javaagent:${agentJar}`,
    "--enable-native-access=ALL-UNNAMED",
    "--sun-misc-unsafe-memory-access=allow",
    `-Djna.tmpdir=${path.join(work, "jna")}`,
    `-Dorg.lwjgl.system.SharedLibraryExtractPath=${path.join(work, "lwjgl")}`,
    `-Dio.netty.native.workdir=${path.join(work, "netty")}`,
    `-Dgrasscn.projected.output=${output}`,
    `-Dgrasscn.projected.scene=${sceneFile}`,
    "-classpath",
    classpath,
    "ProjectedReferenceMain",
    "--offlineDeveloperMode",
    "--username",
    "GrasscnReference",
    "--accessToken",
    "0",
    "--uuid",
    "00000000000000000000000000000001",
    "--version",
    definition.minecraftVersion,
    "--gameDir",
    path.join(work, "game"),
    "--assetsDir",
    path.join(minecraftRoot, "assets"),
    "--assetIndex",
    metadata.assetIndex.id,
    "--width",
    String(definition.window.width),
    "--height",
    String(definition.window.height),
  ]);

  assert.ok(stdout.includes(COMPLETE), `Native launch ${name} did not finish`);
  assert.equal(hash(await readFile(jar)), jarSha256, "Source artifact changed");

  const run = nativeRunSchema.parse(
    JSON.parse(await readFile(path.join(output, "native-run.json"), "utf-8"))
  );

  const window = z.tuple([z.number(), z.number()]).parse(run.runtime.window);
  assert.deepEqual(
    window,
    [definition.window.width, definition.window.height],
    "Window size"
  );

  const [firework] = run.captures;
  assert.ok(firework !== undefined);
  assert.deepEqual(
    [
      firework.serverEntitySeed,
      firework.clientEntitySeed,
      firework.particleSeed,
    ],
    [
      String(definition.rocket.serverEntitySeed),
      String(definition.rocket.clientEntitySeed),
      String(definition.rocket.particleSeed),
    ],
    "Seeds"
  );

  const states = await Promise.all(
    firework.ticks.map(async (tick) => {
      const file = path.join(
        output,
        `states/${definition.rocket.name}.tick-${String(tick.tick).padStart(3, "0")}.json`
      );

      return tickStateSchema.parse(JSON.parse(await readFile(file, "utf-8")));
    })
  );

  const sequence = sequenceTicks(firework, states);

  const backdrop = await readPng(path.join(output, firework.backdrop));
  const retained = [];

  for (const tick of firework.ticks) {
    // oxlint-disable-next-line no-await-in-loop -- Tick frames in order; each is small.
    retained.push(await retainTick(output, backdrop, tick));
  }

  const frames = retained.flatMap((entry) =>
    entry.empty ? [] : [entry.frame]
  );

  const emptyTicks = retained.flatMap((entry) =>
    entry.empty ? [entry.tick] : []
  );

  assert.ok(frames.length > 0, `${name}: the rocket was never visible`);
  // The last tick has no live particle, so it must show the backdrop alone.
  assert.equal(emptyTicks.at(-1), firework.lastTick, "Last tick not empty");

  return {
    backdrop: await identity(output, firework.backdrop),
    emptyTicks,
    firework,
    frames,
    name,
    output,
    runtime: run.runtime,
    sequence,
  };
};

const first = await launch("native-one");
const second = await launch("native-two");

// Two launches in separate output directories must decode identically.
assert.equal(
  first.backdrop.decodedRgbaSha256,
  second.backdrop.decodedRgbaSha256,
  "Backdrop differs between native launches"
);

assert.deepEqual(first.emptyTicks, second.emptyTicks, "Empty ticks differ");

assert.deepEqual(first.sequence, second.sequence, "Sequence ticks differ");

assert.deepEqual(
  sequenceSounds(first.firework),
  sequenceSounds(second.firework),
  "Sounds differ"
);

assert.deepEqual(
  first.firework.spawnedRocket,
  second.firework.spawnedRocket,
  "Spawned rocket differs"
);

assert.equal(
  first.firework.seededParticles,
  second.firework.seededParticles,
  "Seeded particle count"
);

assert.equal(first.frames.length, second.frames.length, "Frame count");

for (const [index, entry] of first.frames.entries()) {
  const other = second.frames[index];
  assert.ok(other !== undefined);
  assert.equal(entry.tick, other.tick);

  for (const key of ["sceneFrame", "reference", "mask"] as const) {
    assert.equal(
      entry[key].decodedRgbaSha256,
      other[key].decodedRgbaSha256,
      `${entry.name} ${key} differs between native launches`
    );
  }
}

const retainFile = async (relative: string) => {
  const target = path.join(caseDirectory, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(first.output, relative), target);
};

await Promise.all(
  [
    first.backdrop.file,
    ...first.frames.flatMap((entry) => [
      entry.sceneFrame.file,
      entry.reference.file,
      entry.mask.file,
    ]),
  ].map(retainFile)
);

const frozenDirectory = path.join(caseDirectory, "source");

await mkdir(frozenDirectory, { recursive: true });

const frozen = [
  [HARNESS_JAVA, "ProjectedReferenceMain.java"],
  [AGENT_JAVA, "ParticleSeedAgent.java"],
  [LAUNCHER, "capture-projected-firework-rocket.ts.txt"],
  [CASE_SCHEMA, "projected-firework-rocket-case.ts.txt"],
] as const;

const harnessSources = [];

for (const [from, file] of frozen) {
  // oxlint-disable-next-line no-await-in-loop -- Frozen harness files in declared order.
  await copyFile(from, path.join(frozenDirectory, file));
  harnessSources.push({
    file: `source/${file}`,
    // oxlint-disable-next-line no-await-in-loop -- Hash after the copy, in order.
    sha256: hash(await readFile(from)),
  });
}

const { lifetime, ...sequenceTicksRecord } = first.sequence;

const manifest = {
  backdropFrame: first.backdrop,
  caseDefinitionSha256: hash(caseBytes),
  differenceTolerance: 0,
  emptyTicks: first.emptyTicks,
  explosion: first.firework.explosion,
  frames: first.frames,
  harnessSources,
  launches: [first, second].map((entry) => ({
    itemAtlas: entry.firework.itemAtlas,
    name: entry.name,
    runtime: entry.runtime,
    spawnedRocket: entry.firework.spawnedRocket,
  })),
  minecraftVersion: definition.minecraftVersion,
  mods: [],
  nativeCamera: first.firework.cameraAtBackdrop,
  partialTick: 0,
  projection: {
    ...definition.projection,
    camera: definition.camera,
    description:
      "Unmodified 26.2 renderer; only the main camera's projection matrix is replaced by a side-on orthographic projection with pixelsPerBlock window pixels per block that maps the camera eye to the eyeAt window pixel. The camera sits 22 blocks south of the rocket so that the vanilla perspective culling frustum (fov 70) contains the rocket, its trail and the explosion from launch to the last spark.",
    window: definition.window,
  },
  repeatDecodedRgbaEqual: true,
  resourcePacks: [],
  rocketLifetime: lifetime,
  scene: {
    description:
      "One firework rocket item entity spawned by the integrated server between two server ticks (as a player's use of the item does) and mirrored by the vanilla client from the spawn packet. The integrated server and the client run in lockstep: one vanilla server tick, then the client handles every packet that tick sent, then one vanilla client tick at partialTick 0. RandomSource.create() in Entity.<init> and Particle.<init> is replaced by RandomSource.create(seeds.nextLong()) with one seeds = RandomSource.create(seed) per declared stream (server entities, client entities, client particles; ParticleSeedAgent); the random source algorithm stays vanilla. Frame tick-N is the scene after N server and N client ticks since the spawn. At 22 blocks the explosion is farther than 16 blocks from the camera, so the native starter selects the _far blast and twinkle sounds and delays them by distance; the UI port plays the near variants as declared.",
    rocket: definition.rocket,
  },
  scope:
    "Projected references (ADR 0005): masked rocket item, trail and explosion pixels of one firework rocket at every tick-aligned frame (partialTick 0) at the fixed seeds; the backdrop is a declared web adaptation. Interpolated frames between ticks, other seeds and other camera arrangements are unverified. Captured on llvmpipe under Xvfb.",
  seededParticles: first.firework.seededParticles,
  seeds: {
    clientEntity: definition.rocket.clientEntitySeed,
    particle: definition.rocket.particleSeed,
    serverEntity: definition.rocket.serverEntitySeed,
  },
  sequenceTicks: sequenceTicksRecord,
  sounds: sequenceSounds(first.firework),
  sourceJar: {
    path: `versions/${instance}/${instance}.jar`,
    sha256: jarSha256,
  },
  tickRange: {
    first: first.frames[0]?.tick ?? 0,
    last: first.firework.lastTick,
  },
  ticksPerSecond: definition.ticksPerSecond,
  world: definition.world,
};

await writeFile(
  path.join(caseDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(
  `Captured ${first.frames.length} projected firework rocket frame(s) twice with identical decoded pixels`
);
