import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { NativeLibrary } from "@ppt/runtime/docs-reference-types";
import {
  parseHeaderCase,
  parseMinecraftMetadata,
} from "@ppt/runtime/docs-reference-types";
import { PNG } from "pngjs";

const here = import.meta.dirname;

if (process.argv.length !== 6) {
  throw new Error(
    "Pass version directory, Java25 bin, fresh isolated work and output directories"
  );
}

const [version, java, work, output] = process.argv
  .slice(2)
  .map((value) => path.resolve(value));

if (!version || !java || !work || !output) {
  throw new Error(
    "Pass version directory, Java 25 bin, fresh isolated work directory and output directory"
  );
}

const directoryInputs = await Promise.allSettled(
  [work, output].map(async (directory) => ({
    directory,
    entries: await readdir(directory),
  }))
);

for (const directoryInput of directoryInputs) {
  try {
    if (directoryInput.status === "rejected") {
      throw directoryInput.reason;
    }

    const { directory, entries: completedValue1 } = directoryInput.value;

    if (completedValue1.length) {
      throw new Error(
        `Native capture requires a fresh directory: ${directory}`
      );
    }
  } catch (error) {
    // SAFETY: this try reports filesystem errno errors or its own ordinary Error; the Node error interface keeps code optional and preserves the original read/rethrow.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact Node filesystem/ordinary Error boundary; retain optional errno access.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

const definition = await readFile(path.join(here, "branding-header/case.json"));
const actualCase = parseHeaderCase(definition.toString("utf-8"));

if (actualCase.scale !== 3 || actualCase.background !== "#202020") {
  throw new Error("Header capture is restricted to its declared default case");
}

const instance = path.basename(version);
const minecraftRoot = path.resolve(version, "../..");
const jar = path.join(version, `${instance}.jar`);

/** @param bytes - Original input accepted by the owned hash-update SDK. */
const hash = (bytes: Parameters<ReturnType<typeof createHash>["update"]>[0]) =>
  createHash("sha256").update(bytes).digest("hex");

const sourceJarSha256 = hash(await readFile(jar));

if (
  sourceJarSha256 !==
  "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290"
) {
  throw new Error("Unexpected Minecraft artifact");
}

const metadata = parseMinecraftMetadata(
  await readFile(path.join(version, `${instance}.json`), "utf-8")
);

/** @param {import("@ppt/runtime/docs-reference-types").NativeLibrary} library - Shipped library metadata. */
const permitted = (library: NativeLibrary) => {
  if (library.rules === undefined) {
    return true;
  }

  let allowed = false;

  for (const rule of library.rules) {
    if ((rule.os?.name ?? "") !== "" && rule.os?.name !== "windows") {
      continue;
    }

    if (
      rule.os?.arch !== undefined &&
      rule.os.arch.length > 0 &&
      ![process.arch, "x86_64"].includes(rule.os.arch)
    ) {
      continue;
    }

    allowed = rule.action === "allow";
  }

  return allowed;
};

const game = path.join(work, "game");
const classes = path.join(work, "classes");

await Promise.all([
  mkdir(game, { recursive: true }),
  mkdir(classes, { recursive: true }),
  mkdir(output, { recursive: true }),
]);

const libraries = metadata.libraries
  .filter(permitted)
  .filter(
    (library) =>
      !/^(?:net\.fabricmc|net\.fabricmc\.|org\.ow2\.asm|io\.github\.llamalad7):/u.test(
        library.name
      )
  )
  .map((library) => library.downloads?.artifact?.path)
  .filter((relative) => relative !== undefined)
  .map((relative) => path.join(minecraftRoot, "libraries", relative));

const classpath = [classes, jar, ...libraries].join(path.delimiter);

const source = path.join(
  here,
  "branding-header/source/GrassIconReferenceMain.java"
);

/** @param {string} argument - Literal Java argument. */
const quote = (argument: string) =>
  `"${argument.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

/** @param {string} name - Java tool. @param {string[]} args - Fixed isolated capture arguments. */
const run = async (name: string, args: string[]) => {
  const argsFile = path.join(work, `${name}.args`);
  await writeFile(argsFile, args.map(quote).join("\n"));

  const result = spawnSync(path.join(java, `${name}.exe`), [`@${argsFile}`], {
    cwd: game,
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 240_000,
    windowsHide: true,
  });

  await writeFile(
    path.join(work, `${name}.log`),
    `${result.stdout ?? ""}\n${result.stderr ?? ""}`
  );

  if (result.error || result.status !== 0) {
    throw new Error(`${name} failed: ${result.error ?? result.stderr}`);
  }

  return result.stdout;
};

const frozenSource = path.join(work, "GrassIconReferenceMain.java");

await writeFile(frozenSource, await readFile(source));

await writeFile(path.join(work, "case.json"), definition);

await run("javac", [
  "-encoding",
  "utf-8",
  "-classpath",
  classpath,
  "-d",
  classes,
  frozenSource,
]);

await writeFile(
  path.join(game, "options.txt"),
  "guiScale:1\nlang:en_us\nforceUnicodeFont:false\nresourcePacks:[]\nhighContrast:false\nshowNowPlayingToast:false\nshowMusicToast:false\nstartedCleanly:true\nonboardAccessibility:false\npauseOnLostFocus:false\nsoundCategory_master:0.0\n"
);

const natives = path.join(version, "natives-windows-x86_64");

const result = await run("java", [
  "-Xmx2G",
  "--enable-native-access=ALL-UNNAMED",
  "--sun-misc-unsafe-memory-access=allow",
  `-Djava.library.path=${path.join(natives, "java")}`,
  `-Djna.tmpdir=${path.join(work, "jna")}`,
  `-Dorg.lwjgl.system.SharedLibraryExtractPath=${path.join(work, "lwjgl")}`,
  `-Dio.netty.native.workdir=${path.join(work, "netty")}`,
  `-Dregistry.brand.output=${output}`,
  "-classpath",
  classpath,
  "GrassIconReferenceMain",
  "--offlineDeveloperMode",
  "--username",
  "GrasscnReference",
  "--accessToken",
  "0",
  "--uuid",
  "00000000000000000000000000000001",
  "--version",
  "26.2",
  "--gameDir",
  game,
  "--assetsDir",
  path.join(minecraftRoot, "assets"),
  "--assetIndex",
  metadata.assetIndex.id,
  "--width",
  "1536",
  "--height",
  "900",
]);

if (!result.includes("GRASSCN_ITEM_REFERENCE_COMPLETE")) {
  throw new Error("Native item capture did not finish");
}

if (hash(await readFile(jar)) !== sourceJarSha256) {
  throw new Error("Source artifact changed");
}

await writeFile(
  path.join(output, "capture.json"),
  `${JSON.stringify({ backgrounds: ["#202020"], captureSourceSha256: hash(await readFile(source)), caseDefinitionSha256: hash(definition), initialization: "Minimal isolated ItemStack supplies the shipped model component because 26.2 title-screen default components are unbound; all model, tint, textures, GUI transform and lighting come from the vanilla renderer. No world is created.", mods: [], originalCaptureSourceSha256: "587402ae9e021df94109c3db697d7e52eba13c63a9f5f42abc83eca9c77dde25", resourcePacks: [], scales: [3], sourceJarSha256, sourceMethod: "GuiGraphicsExtractor.item(original GRASS_BLOCK holder with explicit minecraft:grass_block ITEM_MODEL, 16, 16)", viewport: [1536, 900] }, null, 2)}\n`
);

const file = actualCase.name;

const imageInputs = await Promise.allSettled(
  [file, `frames/${file}`].map(async (relative) => ({
    bytes: await readFile(path.join(output, relative)),
    relative,
  }))
);

for (const imageInput of imageInputs) {
  if (imageInput.status === "rejected") {
    throw imageInput.reason;
  }

  const { bytes, relative } = imageInput.value;
  const image = PNG.sync.read(bytes);
  // oxlint-disable-next-line eslint/no-await-in-loop -- Preserve the original retained-output write order and first-failure/partial-output boundary before publishing the next artifact.
  await writeFile(
    path.join(output, relative.replace(/\.png$/u, ".identity.json")),
    `${JSON.stringify({ decodedRgbaSha256: hash(image.data), file: relative, height: image.height, sha256: hash(bytes), width: image.width }, null, 2)}\n`
  );
}

console.log("Captured original header grass constituent: GUI3 on#202020");
