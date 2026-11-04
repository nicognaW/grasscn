// Records the native sound calls of the #48 firework rocket heard from
// listeners within 16 blocks of the explosion, where the vanilla starter
// selects the near blast and twinkle sounds. Each listener is one launch of
// the unmodified projected reference harness (ProjectedReferenceMain with
// ParticleSeedAgent's read-only SoundManager hook) with the rocket case's
// world, projection, rocket and seeds; only the camera eye moves. The
// harness also writes frames, which stay in the scratch directory.
//
// Usage (Linux, under Xvfb):
//   xvfb-run -a -s "-screen 0 1920x1080x24" bun capture-firework-sounds.ts \
//     <versions/26.2 dir> <JDK 25 bin dir> <case dir> <fresh scratch dir>
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { repoRoot } from "@grasscn/tests/paths";
import { z } from "zod";

import {
  fireworkSoundCaseSchema,
  nativeFireworkSoundsFor,
} from "../firework-sound-case";
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
const LAUNCHER = path.join(import.meta.dirname, "capture-firework-sounds.ts");
const CASE_SCHEMA = path.join(import.meta.dirname, "../firework-sound-case.ts");
const COMPLETE = "GRASSCN_PROJECTED_REFERENCE_COMPLETE";

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

const nativeRunSchema = z.object({
  captures: z
    .array(
      z.object({
        cameraAtBackdrop: z.object({
          position: z.tuple([z.number(), z.number(), z.number()]),
          rotation: z.tuple([z.number(), z.number()]),
        }),
        clientEntitySeed: z.string(),
        kind: z.literal("firework-rocket"),
        lastTick: z.number().int().positive(),
        particleSeed: z.string(),
        seededParticles: z.number().int().positive(),
        serverEntitySeed: z.string(),
        sounds: z.array(nativeSoundSchema),
        spawnedRocket: z.object({ lifetime: z.number().int() }).loose(),
      })
    )
    .length(1),
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
    "Usage: bun capture-firework-sounds.ts <version dir> <JDK 25 bin> <case dir> <fresh scratch dir>"
  );
}

const versionDirectory = path.resolve(versionArgument);
const javaBin = path.resolve(javaArgument);
const caseDirectory = path.resolve(caseArgument);
const scratch = path.resolve(scratchArgument);

try {
  const entries = await readdir(scratch);
  assert.equal(
    entries.length,
    0,
    `Capture needs a fresh directory: ${scratch}`
  );
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
    throw error;
  }
}

const caseBytes = await readFile(path.join(caseDirectory, "case.json"));

const definition = fireworkSoundCaseSchema.parse(
  JSON.parse(caseBytes.toString("utf-8"))
);

const rocketCaseBytes = await readFile(
  path.join(repoRoot, definition.rocketCase)
);

const rocketCase = projectedFireworkRocketCaseSchema.parse(
  JSON.parse(rocketCaseBytes.toString("utf-8"))
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

const libraries = metadata.libraries.flatMap((library) => {
  const relative = library.downloads?.artifact?.path;

  return relative !== undefined &&
    permitted(library) &&
    !/^(?:net\.fabricmc|org\.ow2\.asm|io\.github\.llamalad7):/u.test(
      library.name
    )
    ? [path.join(minecraftRoot, "libraries", relative)]
    : [];
});

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

  const child = spawn(path.join(javaBin, tool), [`@${argsFile}`], {
    cwd: path.join(work, "game"),
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer) => {
    stdout += chunk.toString("utf-8");
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf-8");
  });

  // once() rejects on the child's error event.
  await once(child, "close");
  const status = child.exitCode;

  await writeFile(path.join(work, `${log}.log`), `${stdout}\n${stderr}`);

  if (status !== 0) {
    throw new Error(`${tool} failed (${status}): see ${work}/${log}.log`);
  }

  return stdout;
};

type Listener = (typeof definition.listeners)[number];

const launch = async (listener: Listener) => {
  const work = path.join(scratch, listener.name, "work");
  const output = path.join(scratch, listener.name, "output");
  const classes = path.join(work, "classes");
  const agentClasses = path.join(work, "agent-classes");
  const agentJar = path.join(work, "particle-seed-agent.jar");

  await Promise.all(
    [path.join(work, "game"), classes, agentClasses, output].map(
      async (directory) => await mkdir(directory, { recursive: true })
    )
  );

  const scene = {
    camera: listener.camera,
    captures: [{ ...rocketCase.rocket, kind: "firework-rocket" }],
    projection: rocketCase.projection,
    world: {
      ...rocketCase.world,
      levelName: `grasscn-firework-sounds-${listener.name}`,
    },
  };

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
    rocketCase.minecraftVersion,
    "--gameDir",
    path.join(work, "game"),
    "--assetsDir",
    path.join(minecraftRoot, "assets"),
    "--assetIndex",
    metadata.assetIndex.id,
    "--width",
    String(rocketCase.window.width),
    "--height",
    String(rocketCase.window.height),
  ]);

  assert.ok(
    stdout.includes(COMPLETE),
    `Native launch ${listener.name} did not finish`
  );
  assert.equal(hash(await readFile(jar)), jarSha256, "Source artifact changed");

  const run = nativeRunSchema.parse(
    JSON.parse(await readFile(path.join(output, "native-run.json"), "utf-8"))
  );

  const [rocket] = run.captures;
  assert.ok(rocket !== undefined);
  assert.deepEqual(
    [rocket.serverEntitySeed, rocket.clientEntitySeed, rocket.particleSeed],
    [
      String(rocketCase.rocket.serverEntitySeed),
      String(rocketCase.rocket.clientEntitySeed),
      String(rocketCase.rocket.particleSeed),
    ],
    "Seeds"
  );

  const camera = rocket.cameraAtBackdrop.position;
  // Background music starts at a random time; it is not part of the sequence.
  const sounds = rocket.sounds.filter((sound) => sound.source !== "MUSIC");

  // The vanilla rules, applied to the recorded positions, must explain every
  // recorded call: variant by Starter.isFarAwayFromCamera, delay by
  // ClientLevel.playSound.
  assert.deepEqual(
    sounds.map(({ call, delayTicks, sound }) => ({ call, delayTicks, sound })),
    nativeFireworkSoundsFor(camera, sounds),
    `${listener.name}: sound calls do not follow the vanilla rules`
  );

  return {
    camera: rocket.cameraAtBackdrop,
    lastTick: rocket.lastTick,
    name: listener.name,
    rocketLifetime: rocket.spawnedRocket.lifetime,
    runtime: run.runtime,
    seededParticles: rocket.seededParticles,
    sounds,
  };
};

const launches = await Promise.all(definition.listeners.map(launch));

const [first, ...others] = launches;

assert.ok(first !== undefined);

// The listener moves only the camera: the random draws, the event ticks and
// the gains must not change with it.
const invariant = (entry: (typeof launches)[number]) => ({
  lastTick: entry.lastTick,
  rocketLifetime: entry.rocketLifetime,
  seededParticles: entry.seededParticles,
  sounds: entry.sounds.map(({ pitchBits, source, tick, volumeBits }) => ({
    pitchBits,
    source,
    tick,
    volumeBits,
  })),
});

for (const other of others) {
  assert.deepEqual(
    invariant(other),
    invariant(first),
    `${other.name} differs from ${first.name} beyond the listener`
  );
}

const manifest = {
  caseDefinitionSha256: hash(caseBytes),
  harnessSources: await Promise.all(
    [HARNESS_JAVA, AGENT_JAVA, LAUNCHER, CASE_SCHEMA].map(async (file) => ({
      file: path.relative(repoRoot, file).replaceAll(path.sep, "/"),
      sha256: hash(await readFile(file)),
    }))
  ),
  listeners: launches.map((entry) => ({
    camera: entry.camera,
    lastTick: entry.lastTick,
    name: entry.name,
    rocketLifetime: entry.rocketLifetime,
    runtime: entry.runtime,
    seededParticles: entry.seededParticles,
    sounds: entry.sounds,
  })),
  minecraftVersion: rocketCase.minecraftVersion,
  mods: [],
  resourcePacks: [],
  rocketCaseSha256: hash(rocketCaseBytes),
  scope:
    "Native SoundManager.play and playDelayed calls (read-only hook) of one firework rocket at the #48 seeds, heard from the declared listeners; one launch per listener, with identical draws, ticks and gains across listeners. Captured on llvmpipe under Xvfb with no audio device, so the calls are recorded, not the audio output.",
  sourceJar: {
    path: `versions/${instance}/${instance}.jar`,
    sha256: jarSha256,
  },
};

await writeFile(
  path.join(caseDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(
  `Recorded ${launches.length} listener(s) with identical sound draws`
);
