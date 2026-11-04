// Captures the nether star GUI item references at fixed glint times from the
// unmodified Minecraft Java Edition 26.2 renderer in two independent native
// launches, then retains the corpus beside its case definition.
//
// Usage (Linux, under Xvfb):
//   xvfb-run -a -s "-screen 0 1920x1080x24" bun capture-nether-star-reference.ts \
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

import {
  netherStarCaseSchema,
  netherStarRuntimeSchema,
} from "../nether-star-case";

const JAR_SHA256 =
  "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290";

const harnessDirectory = path.join(
  repoRoot,
  "packages/pixel-perfect/tests/reference/gui-item"
);

const HARNESS_JAVA = path.join(
  harnessDirectory,
  "NetherStarReferenceMain.java"
);

const AGENT_JAVA = path.join(harnessDirectory, "GlintClockAgent.java");

const LAUNCHER = path.join(
  import.meta.dirname,
  "capture-nether-star-reference.ts"
);

const CASE_SCHEMA = path.join(import.meta.dirname, "../nether-star-case.ts");

const COMPLETE = "GRASSCN_NETHER_STAR_REFERENCE_COMPLETE";

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
    z.object({
      bounds: z.tuple([z.number(), z.number(), z.number(), z.number()]),
      control: z.boolean(),
      frame: z.string(),
      glintMillis: z.number(),
      name: z.string(),
      reference: z.string(),
    })
  ),
  runtime: netherStarRuntimeSchema,
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
    "Usage: bun capture-nether-star-reference.ts <version dir> <JDK 25 bin> <case dir> <fresh scratch dir>"
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

const caseFile = path.join(caseDirectory, "case.json");
const caseBytes = await readFile(caseFile);

const definition = netherStarCaseSchema.parse(
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
    maxBuffer: 64 * 1024 * 1024,
    timeout: 600_000,
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

const launch = async (name: string) => {
  const work = path.join(scratch, name, "work");
  const output = path.join(scratch, name, "output");
  const classes = path.join(work, "classes");
  const agentClasses = path.join(work, "agent-classes");
  const agentJar = path.join(work, "glint-clock-agent.jar");

  await Promise.all(
    [path.join(work, "game"), classes, agentClasses, output].map(
      async (directory) => await mkdir(directory, { recursive: true })
    )
  );

  const classpath = [classes, jar, ...libraries].join(path.delimiter);
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
  await writeFile(manifestFile, "Premain-Class: GlintClockAgent\n");
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
    `-Dgrasscn.item.output=${output}`,
    `-Dgrasscn.item.case=${caseFile}`,
    "-classpath",
    classpath,
    "NetherStarReferenceMain",
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

  assert.deepEqual(
    run.runtime.window,
    [definition.window.width, definition.window.height],
    "Window size"
  );
  assert.equal(run.runtime.guiScale, definition.scale, "GUI scale");

  const captures = await Promise.all(
    run.captures.map(async (capture) => ({
      ...capture,
      frame: await identity(output, capture.frame),
      reference: await identity(output, capture.reference),
    }))
  );

  return { captures, name, output, runtime: run.runtime };
};

const first = await launch("native-one");
const second = await launch("native-two");

assert.deepEqual(
  first.captures.map((capture) => capture.name),
  [...definition.cases.map((entry) => entry.name), "no-glint"],
  "Captured cases"
);

// Two launches in separate output directories must decode identically.
for (const [index, entry] of first.captures.entries()) {
  const other = second.captures[index];
  assert.ok(other !== undefined);
  assert.equal(entry.name, other.name);

  for (const key of ["frame", "reference"] as const) {
    assert.equal(
      entry[key].decodedRgbaSha256,
      other[key].decodedRgbaSha256,
      `${entry.name} ${key} differs between native launches`
    );
  }
}

assert.deepEqual(
  first.runtime,
  { ...second.runtime },
  "Runtime facts differ between native launches"
);

// The glint must actually change the item: every glint case differs from the
// control frame drawn without the glint component.
const control = first.captures.find((capture) => capture.control);

assert.ok(control !== undefined);

for (const capture of first.captures) {
  if (!capture.control) {
    assert.notEqual(
      capture.reference.decodedRgbaSha256,
      control.reference.decodedRgbaSha256,
      `${capture.name} shows no glint`
    );
  }
}

const retained = async (relative: string) => {
  const target = path.join(caseDirectory, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(first.output, relative), target);
};

await Promise.all(
  first.captures.flatMap((capture) => [
    retained(capture.frame.file),
    retained(capture.reference.file),
  ])
);

const frozen = [
  [HARNESS_JAVA, "NetherStarReferenceMain.java"],
  [AGENT_JAVA, "GlintClockAgent.java"],
  [LAUNCHER, "capture-nether-star-reference.ts.txt"],
  [CASE_SCHEMA, "nether-star-case.ts.txt"],
] as const;

await mkdir(path.join(caseDirectory, "source"), { recursive: true });

const harnessSources = await Promise.all(
  frozen.map(async ([from, name]) => {
    await copyFile(from, path.join(caseDirectory, "source", name));

    return { file: `source/${name}`, sha256: hash(await readFile(from)) };
  })
);

const manifest = {
  background: definition.background,
  caseDefinitionSha256: hash(caseBytes),
  cases: first.captures.map((capture) => ({
    bounds: capture.bounds,
    control: capture.control,
    frame: capture.frame,
    glintMillis: capture.glintMillis,
    name: capture.name,
    reference: capture.reference,
  })),
  differenceTolerance: 0,
  guiScale: definition.scale,
  harnessSources,
  launches: [first, second].map((entry) => ({
    captures: entry.captures.map((capture) => ({
      frame: capture.frame.decodedRgbaSha256,
      name: capture.name,
      reference: capture.reference.decodedRgbaSha256,
    })),
    name: entry.name,
  })),
  minecraftVersion: definition.minecraftVersion,
  mods: [],
  repeatDecodedRgbaEqual: true,
  resourcePacks: [],
  runtime: first.runtime,
  scope:
    "Captured references: the original nether star GUI item at GUI scale 2 on #202020, at the declared glint times only. GlintClockAgent replaces the single Util.getMillis() call of TextureTransform.setupGlintTexturing with the case's fixed glint time; everything else is the vanilla renderer. Captured on llvmpipe under Xvfb. The no-glint case is a diagnostic control without the glint component, not a reference case.",
  source:
    "Original Minecraft GuiGraphicsExtractor.item(original NETHER_STAR holder with explicit minecraft:nether_star ITEM_MODEL and ENCHANTMENT_GLINT_OVERRIDE true, 16, 16)",
  sourceJar: {
    path: `versions/${instance}/${instance}.jar`,
    sha256: jarSha256,
  },
  verifiedCoverage: {
    unverified: [
      "Interpolated glint times between the captured glint times",
      "Other GUI scales and backgrounds",
      "DPR above 1 and CSS scaling",
      "Other GPU drivers and browsers other than Edge",
    ],
    verified: `Glint times ${definition.cases.map((entry) => entry.glintMillis).join(", ")} ms at GUI scale 2 on #202020, zero tolerance, DPR 1`,
    webAdaptations: [
      "The animated glint follows the page clock (performance.now()) instead of the game's Util.getMillis() origin",
    ],
  },
  window: definition.window,
};

await writeFile(
  path.join(caseDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(
  `Captured ${definition.cases.length} nether star reference(s) twice with identical decoded pixels`
);
