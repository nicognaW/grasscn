// Captures projected references (ADR 0005) from the unmodified Minecraft
// Java Edition 26.2 renderer in two independent native launches, then retains
// the corpus beside its case definition.
//
// Usage (Linux, under Xvfb):
//   xvfb-run -a -s "-screen 0 1920x1080x24" bun capture-projected-reference.ts \
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
  declaredFootprint,
  glyphBlocks,
  projectedCaseSchema,
} from "../projected-case";
import type { ProjectedCase } from "../projected-case";

const JAR_SHA256 =
  "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290";

const HARNESS_JAVA = path.join(
  repoRoot,
  "packages/pixel-perfect/tests/reference/projected/ProjectedReferenceMain.java"
);

const LAUNCHER = path.join(
  import.meta.dirname,
  "capture-projected-reference.ts"
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

const nativeRunSchema = z.object({
  captures: z.array(
    z.object({ backdrop: z.string(), name: z.string(), scene: z.string() })
  ),
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
    "Usage: bun capture-projected-reference.ts <version dir> <JDK 25 bin> <case dir> <fresh scratch dir>"
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

const definition = projectedCaseSchema.parse(
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

const scene = (glyphCase: ProjectedCase) => ({
  camera: glyphCase.camera,
  captures: glyphCase.cases.map((glyph) => ({
    blocks: glyphBlocks(glyphCase, glyph),
    name: glyph.name,
  })),
  projection: glyphCase.projection,
  world: glyphCase.world,
});

const quote = (argument: string) =>
  `"${argument.replaceAll("\\", "\\\\").replaceAll('"', String.raw`\"`)}"`;

const runTool = async (work: string, tool: string, args: string[]) => {
  const argsFile = path.join(work, `${tool}.args`);
  await writeFile(argsFile, args.map(quote).join("\n"));

  const result = spawnSync(path.join(javaBin, tool), [`@${argsFile}`], {
    cwd: path.join(work, "game"),
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 900_000,
  });

  await writeFile(
    path.join(work, `${tool}.log`),
    `${result.stdout}\n${result.stderr}`
  );

  if (result.error !== undefined || result.status !== 0) {
    throw new Error(
      `${tool} failed (${result.status}): see ${work}/${tool}.log`
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

type NativeCapture = z.infer<typeof nativeRunSchema>["captures"][number];

/** Derives, validates and writes the geometry mask and reference of one case. */
const retainCase = async (
  output: string,
  glyph: ProjectedCase["cases"][number],
  capture: NativeCapture | undefined
) => {
  assert.ok(capture !== undefined, `Missing native capture ${glyph.name}`);

  const [sceneFrame, backdropFrame] = await Promise.all([
    readPng(path.join(output, capture.scene)),
    readPng(path.join(output, capture.backdrop)),
  ]);

  const mask = deriveGeometryMask(
    sceneFrame.data,
    backdropFrame.data,
    sceneFrame.width,
    sceneFrame.height
  );

  const footprint = declaredFootprint(definition, glyph);

  // Every pixel of the declared footprint, and nothing else, is geometry.
  assert.deepEqual(
    mask.bounds,
    footprint,
    `${glyph.name}: mask bounds differ from the declared projection`
  );
  assert.equal(
    mask.coveredPixels,
    footprint.width * footprint.height,
    `${glyph.name}: footprint not fully covered`
  );

  const [sentinelX, sentinelY] = definition.sentinel.at;
  const sentinelOffset = (sentinelY * sceneFrame.width + sentinelX) * 4;
  assert.equal(
    mask.covered[sentinelY * sceneFrame.width + sentinelX],
    0,
    "Sentinel lies on geometry"
  );

  const sentinel = [
    ...sceneFrame.data.subarray(sentinelOffset, sentinelOffset + 4),
  ];

  assert.deepEqual(
    sentinel,
    [...backdropFrame.data.subarray(sentinelOffset, sentinelOffset + 4)],
    "Sentinel changed between frames"
  );
  assert.ok(
    sentinel[3] === 255 &&
      (sentinel[2] ?? 0) >= MINIMUM_SKY_BLUE &&
      (sentinel[2] ?? 0) > (sentinel[0] ?? 0),
    `${glyph.name}: sentinel ${sentinel.join(",")} is not open sky`
  );

  // White opaque where geometry covers the pixel, transparent elsewhere.
  const fullMask = new PNG({
    height: sceneFrame.height,
    width: sceneFrame.width,
  });

  for (const [pixel, covered] of mask.covered.entries()) {
    fullMask.data.fill(covered ? 255 : 0, pixel * 4, pixel * 4 + 4);
  }

  const maskImage = crop(fullMask, mask.bounds);
  await Promise.all([
    mkdir(path.join(output, "references"), { recursive: true }),
    mkdir(path.join(output, "masks"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      path.join(output, `references/${glyph.name}.png`),
      PNG.sync.write(crop(sceneFrame, mask.bounds))
    ),
    writeFile(
      path.join(output, `masks/${glyph.name}.png`),
      PNG.sync.write(maskImage)
    ),
  ]);

  const [backdropIdentity, maskIdentity, referenceIdentity, sceneIdentity] =
    await Promise.all([
      identity(output, capture.backdrop),
      identity(output, `masks/${glyph.name}.png`),
      identity(output, `references/${glyph.name}.png`),
      identity(output, capture.scene),
    ]);

  return {
    backdropFrame: backdropIdentity,
    bounds: mask.bounds,
    coveredPixels: mask.coveredPixels,
    mask: maskIdentity,
    name: glyph.name,
    reference: referenceIdentity,
    sceneFrame: sceneIdentity,
    sentinel: { at: definition.sentinel.at, rgba: sentinel },
    value: glyph.value,
  };
};

const launch = async (name: string) => {
  const work = path.join(scratch, name, "work");
  const output = path.join(scratch, name, "output");
  const classes = path.join(work, "classes");

  await Promise.all(
    [path.join(work, "game"), classes, output].map(
      async (directory) => await mkdir(directory, { recursive: true })
    )
  );

  const classpath = [classes, jar, ...libraries].join(path.delimiter);
  const sceneFile = path.join(work, "scene.json");
  await writeFile(sceneFile, `${JSON.stringify(scene(definition), null, 2)}\n`);
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

  const stdout = await runTool(work, "java", [
    "-Xmx2G",
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

  const captures = new Map(run.captures.map((entry) => [entry.name, entry]));

  const cases = await Promise.all(
    definition.cases.map(
      async (glyph) => await retainCase(output, glyph, captures.get(glyph.name))
    )
  );

  return { cases, name, output, runtime: run.runtime };
};

const first = await launch("native-one");
const second = await launch("native-two");

// Two launches in separate output directories must decode identically.
for (const [index, entry] of first.cases.entries()) {
  const other = second.cases[index];
  assert.ok(other !== undefined);

  for (const key of [
    "sceneFrame",
    "backdropFrame",
    "reference",
    "mask",
  ] as const) {
    assert.equal(
      entry[key].decodedRgbaSha256,
      other[key].decodedRgbaSha256,
      `${entry.name} ${key} differs between native launches`
    );
  }
}

const retained = async (relative: string) => {
  const target = path.join(caseDirectory, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(first.output, relative), target);
};

const retainedFiles: string[] = [];

for (const entry of first.cases) {
  retainedFiles.push(
    entry.sceneFrame.file,
    entry.backdropFrame.file,
    entry.reference.file,
    entry.mask.file
  );
}

await Promise.all(retainedFiles.map(retained));

const sourceDirectory = path.join(caseDirectory, "source");

await mkdir(sourceDirectory, { recursive: true });

await copyFile(
  HARNESS_JAVA,
  path.join(sourceDirectory, "ProjectedReferenceMain.java")
);

await copyFile(
  LAUNCHER,
  path.join(sourceDirectory, "capture-projected-reference.ts.txt")
);

const manifest = {
  caseDefinitionSha256: hash(caseBytes),
  cases: first.cases,
  differenceTolerance: 0,
  harnessSources: [
    {
      file: "source/ProjectedReferenceMain.java",
      sha256: hash(await readFile(HARNESS_JAVA)),
    },
    {
      file: "source/capture-projected-reference.ts.txt",
      sha256: hash(await readFile(LAUNCHER)),
    },
  ],
  launches: [first, second].map((entry) => ({
    name: entry.name,
    runtime: entry.runtime,
  })),
  minecraftVersion: definition.minecraftVersion,
  mods: [],
  projection: {
    ...definition.projection,
    camera: definition.camera,
    description:
      "Unmodified 26.2 renderer; only the main camera's projection matrix is replaced by a front-on orthographic projection centred on the camera eye with pixelsPerBlock window pixels per block. The vanilla perspective culling frustum is unchanged and contains the declared geometry.",
    window: definition.window,
  },
  repeatDecodedRgbaEqual: true,
  resourcePacks: [],
  scope:
    "Projected references (ADR 0005): masked geometry pixels of the declared lamp walls only; the backdrop is a declared web adaptation. Captured on llvmpipe under Xvfb.",
  sourceJar: {
    path: `versions/${instance}/${instance}.jar`,
    sha256: jarSha256,
  },
  world: definition.world,
};

await writeFile(
  path.join(caseDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(
  `Captured ${first.cases.length} projected reference(s) twice with identical decoded pixels`
);
