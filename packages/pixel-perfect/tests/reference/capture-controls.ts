import type { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  MinecraftCaptureLibrary,
  MinecraftCaptureVersion,
  CaptureCaseInput,
  NativeCaptureLayout,
  MinecraftCaptureAssetIndex,
  MinecraftCaptureAssetObject,
  ControlCaptureCase,
  ControlCaptureManifest,
} from "@ppt/native/capture-types";
import { pixelPerfectTestRoot } from "@ppt/paths";

const here = path.dirname(fileURLToPath(import.meta.url));

const versionDir = path.resolve(
  process.argv[2] ?? process.env.MINECRAFT_VERSION_DIR ?? ""
);

const javaBin = path.resolve(
  process.argv[3] ?? process.env.MINECRAFT_JAVA_BIN ?? ""
);

if (!process.argv[2] && !process.env.MINECRAFT_VERSION_DIR) {
  throw new Error("Pass the Minecraft version directory as argument 1");
}

if (!process.argv[3] && !process.env.MINECRAFT_JAVA_BIN) {
  throw new Error("Pass the Java 25 bin directory as argument 2");
}

const instanceName = path.basename(versionDir);

// SAFETY: selected launcher metadata supplies libraries, rule OS selectors, artifact paths and asset index ID.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Local assertion of the launcher metadata contract; preserve this fresh CLI-selected read.
const metadata = JSON.parse(
  await readFile(path.join(versionDir, `${instanceName}.json`), "utf-8")
) as MinecraftCaptureVersion;

const minecraftRoot = path.resolve(versionDir, "../..");

const jar = path.join(versionDir, `${instanceName}.jar`);

const runtime = path.resolve(
  process.env.MINECRAFT_REFERENCE_WORK_DIR ??
    path.join(pixelPerfectTestRoot, "native-runtime/controls")
);

const gameDir = path.join(runtime, "game");

const classes = path.join(runtime, "classes");

const caseFile = path.resolve(
  process.argv[4] ?? path.join(here, "controls/cases.json")
);

const caseBytes = await readFile(caseFile);

// SAFETY: authored native case files and their retained Java Case producers own these consumed fields; existing checks stay unchanged.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact native case input contract; runtime-selected path and raw bytes must remain fresh.
const definitions = JSON.parse(String(caseBytes)) as CaptureCaseInput[];

if (
  !definitions.length ||
  new Set(definitions.map((c) => c.name)).size !== definitions.length
) {
  throw new Error("Empty or duplicate native cases");
}

for (const c of definitions) {
  if (
    !/^[a-z0-9-]+$/u.test(c.name) ||
    ![c.x, c.y, c.width, c.height, c.page ?? 0].every(Number.isInteger) ||
    c.x < 0 ||
    c.y < 0 ||
    c.width <= 0 ||
    c.height <= 0 ||
    (c.x + c.width) * 3 > 1536 ||
    (c.y + c.height) * 3 > 900
  ) {
    throw new Error(`Invalid reference bounds: ${c.name}`);
  }
}

const outputDir = path.resolve(
  process.env.MINECRAFT_REFERENCE_OUTPUT_DIR ?? path.dirname(caseFile)
);

const captures = path.join(outputDir, "captures");

const frames = path.join(runtime, "frames");

const harnessSource = path.resolve(
  process.env.MINECRAFT_REFERENCE_SOURCE ??
    path.join(here, "ControlsReferenceMain.java")
);

const harnessBytes = await readFile(harnessSource);

const observeGlyphs =
  process.env.MINECRAFT_REFERENCE_OBSERVE_GLYPHS !== "false";

const sha256 = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");

const sourceJarSha256 = sha256(await readFile(jar));

if (
  sourceJarSha256 !==
  "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290"
) {
  throw new Error(
    "Reference capture is pinned to the agreed Minecraft Java 26.2 artifact; source JAR digest does not match"
  );
}

await Promise.all([
  mkdir(gameDir, { recursive: true }),
  mkdir(classes, { recursive: true }),
  mkdir(captures, { recursive: true }),
]);

const frozenSourceDirectory = path.join(runtime, "source");

await mkdir(frozenSourceDirectory, { recursive: true });

const frozenSource = path.join(
  frozenSourceDirectory,
  "ControlsReferenceMain.java"
);

const frozenCases = path.join(runtime, "cases.json");

await writeFile(frozenSource, harnessBytes);

await writeFile(frozenCases, caseBytes);

let platformNameSelection: "windows" | "osx" | "linux";

if (process.platform === "win32") {
  platformNameSelection = "windows";
} else if (process.platform === "darwin") {
  platformNameSelection = "osx";
} else {
  platformNameSelection = "linux";
}

const platformName = platformNameSelection;

const permitted = function permitted(library: MinecraftCaptureLibrary) {
  if (!library.rules) {
    return true;
  }

  let allowed = false;

  for (const rule of library.rules) {
    if (rule.os?.name && rule.os.name !== platformName) {
      continue;
    }

    if (
      rule.os?.arch &&
      ![
        process.arch,
        process.arch === "x64" ? "x86_64" : process.arch,
      ].includes(rule.os.arch)
    ) {
      continue;
    }

    allowed = rule.action === "allow";
  }

  return allowed;
};

const libraries = metadata.libraries
  .filter(permitted)

  .filter(
    (library) =>
      !/^(?:net\.fabricmc|net\.fabricmc\.|org\.ow2\.asm|io\.github\.llamalad7):/u.test(
        library.name
      )
  )

  .map((library) => library.downloads?.artifact?.path)

  .filter((relative): relative is string => Boolean(relative))
  .map((relative) => path.join(minecraftRoot, "libraries", relative));

const classpath = [classes, jar, ...libraries].join(path.delimiter);

const executable = (command: "java" | "javac") =>
  path.join(javaBin, command + (process.platform === "win32" ? ".exe" : ""));

const quoteArgfile = (argument: string) =>
  `"${argument.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

const javaCommand = async function javaCommand(
  command: "java" | "javac",
  args: string[],
  timeout = 240_000
) {
  const argsFile = path.join(runtime, `${command}.args`);

  await writeFile(argsFile, args.map(quoteArgfile).join("\n"));

  const result = spawnSync(executable(command), [`@${argsFile}`], {
    cwd: gameDir,
    encoding: "utf-8",
    timeout,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });

  await writeFile(
    path.join(runtime, `${command}.log`),
    `${result.stdout ?? ""}\n${result.stderr ?? ""}`
  );

  if (result.error || result.status !== 0) {
    throw new Error(
      `${command} failed. See ${path.join(runtime, `${command}.log`)}\n${result.error ?? result.stderr}`
    );
  }

  return result.stdout;
};

await javaCommand("javac", [
  "-encoding",
  "UTF-8",
  "-classpath",
  classpath,
  "-d",
  classes,
  frozenSource,
]);

await writeFile(
  path.join(gameDir, "options.txt"),
  "guiScale:1\nlang:en_us\nforceUnicodeFont:false\nresourcePacks:[]\nhighContrast:false\nshowNowPlayingToast:false\nshowMusicToast:false\nstartedCleanly:true\nonboardAccessibility:false\npauseOnLostFocus:false\nsoundCategory_master:0.0\n"
);

const natives = path.join(versionDir, "natives-windows-x86_64");

const javaArgs = [
  "-Xmx2G",
  "--enable-native-access=ALL-UNNAMED",
  "--sun-misc-unsafe-memory-access=allow",

  `-Djava.library.path=${path.join(natives, "java")}`,
  `-Djna.tmpdir=${path.join(runtime, "jna")}`,

  `-Dorg.lwjgl.system.SharedLibraryExtractPath=${path.join(runtime, "lwjgl")}`,

  `-Dio.netty.native.workdir=${path.join(runtime, "netty")}`,
  `-Dregistry.reference.cases=${frozenCases}`,
  `-Dregistry.reference.output=${captures}`,
  `-Dregistry.reference.frames=${frames}`,
  `-Dregistry.reference.observeGlyphs=${observeGlyphs}`,

  "-classpath",
  classpath,
  "ControlsReferenceMain",
  "--offlineDeveloperMode",
  "--username",
  "RegistryPilot",
  "--accessToken",
  "0",

  "--uuid",
  "00000000000000000000000000000001",
  "--version",
  "26.2",
  "--gameDir",
  gameDir,

  "--assetsDir",
  path.join(minecraftRoot, "assets"),
  "--assetIndex",
  metadata.assetIndex.id,

  "--width",
  "1536",
  "--height",
  "900",
];

console.log("Capturing vanilla control pixels in an isolated offline client…");

const captureTimeout = Math.max(
  240_000,
  new Set(definitions.map((c) => c.page ?? 0)).size * 3 * 3_000 + 90_000
);

const output = await javaCommand("java", javaArgs, captureTimeout);

if (!output.includes("REGISTRY_REFERENCE_COMPLETE")) {
  throw new Error("Client exited without completing reference captures");
}

if (sha256(await readFile(jar)) !== sourceJarSha256) {
  throw new Error("Source JAR changed during capture");
}

const cases: ControlCaptureCase[] = [];

let layouts: Record<string, NativeCaptureLayout | undefined> = {};

try {
  // SAFETY: retained native harness NativeLayout records emit width, height, renderedLines and optional tabRects.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete current and retained Java producer layouts share this consumed record shape.
  layouts = JSON.parse(
    await readFile(path.join(outputDir, "layout.json"), "utf-8")
  ) as Record<string, NativeCaptureLayout | undefined>;
} catch (error) {
  if (definitions.some((c) => c.element === "tooltip")) {
    throw error;
  }
}

for (const scale of [1, 2, 3]) {
  for (const definition of definitions) {
    const name = `${definition.name}-s${scale}.png`;

    const bytes = await readFile(path.join(captures, name));

    cases.push({
      ...definition,
      ...(layouts[`${definition.name}-s${scale}`] ?? layouts[definition.name]),
      ...(definition.element === "textarea"
        ? { widgetWidth: definition.width }
        : {}),
      name,
      scale,
      sha256: sha256(bytes),
    });
  }
}

const pageValues = [...new Set(definitions.map((c) => c.page ?? 0))];

pageValues.sort((a, b) => a - b);

const pages = pageValues;

if (pages.some((page, index) => page !== index)) {
  throw new Error("Native pages must be contiguous from zero");
}

await mkdir(path.join(outputDir, "frames"), { recursive: true });

const frameRecords = [];

for (const page of pages) {
  for (const scale of [1, 2, 3]) {
    const name = `native-controls-${pages.length > 1 ? `p${page}-` : ""}s${scale}.png`;

    const bytes = await readFile(path.join(frames, name));

    await writeFile(path.join(outputDir, "frames", name), bytes);

    frameRecords.push({ name, sha256: sha256(bytes) });
  }
}

const manifest: ControlCaptureManifest = {
  source:
    "Actual vanilla control classes and GPU renderer; test screen supplies inputs and layout only.",
  minecraftVersion: "26.2",
  sourceJarSha256,
  captureSourceSha256: sha256(harnessBytes),
  caseDefinitionSha256: sha256(caseBytes),
  glyphObservationEnabled: observeGlyphs,
  mods: [],
  resourcePacks: [],
  background: "#202020",
  guiScales: [1, 2, 3],
  labelLanguage: "en_us",
  differenceTolerance: 0,
  framesDirectory: "frames",
  frames: frameRecords,
  cases,
};

if (
  definitions.some((c) =>
    /\P{ASCII}/u.test(
      (c.text ?? "") + (c.label ?? "") + (c.labels ?? []).join("")
    )
  )
) {
  const indexBytes = await readFile(
    path.join(minecraftRoot, "assets/indexes", `${metadata.assetIndex.id}.json`)
  );

  // SAFETY: the selected official asset index maps resource names to SHA-1 objects and byte sizes; existing checks remain.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Specific launcher asset-index contract, with original fresh read and later integrity checks preserved.
  const index = JSON.parse(String(indexBytes)) as MinecraftCaptureAssetIndex;

  const resources: Record<
    string,
    { sha1: string; sha256: string; size: number } | undefined
  > = {};

  for (const key of [
    "minecraft/font/include/unifont.json",
    "minecraft/font/unifont.zip",
  ]) {
    // SAFETY: these exact two font keys are present in the selected official asset-index producer; missing inputs still throw at the original property access.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Fixed font-key projection only; the general asset dictionary remains optional and no runtime guard is added.
    const entry = index.objects[key] as MinecraftCaptureAssetObject;

    const bytes = await readFile(
      path.join(
        minecraftRoot,
        "assets/objects",
        entry.hash.slice(0, 2),
        entry.hash
      )
    );

    if (
      createHash("sha1").update(bytes).digest("hex") !== entry.hash ||
      bytes.length !== entry.size
    ) {
      throw new Error(`Effective font object changed: ${key}`);
    }

    resources[key] = {
      sha1: entry.hash,
      sha256: sha256(bytes),
      size: bytes.length,
    };
  }

  manifest.effectiveAssets = {
    assetIndex: metadata.assetIndex.id,
    assetIndexSha256: sha256(indexBytes),
    resources,
  };
}

await mkdir(path.join(outputDir, "source"), { recursive: true });

await writeFile(
  path.join(outputDir, "source/ControlsReferenceMain.java"),
  harnessBytes
);

manifest.sourceDirectory = "source";

await writeFile(
  path.join(outputDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(`Captured ${cases.length} native control references`);
