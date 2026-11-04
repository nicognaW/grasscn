import type { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  MinecraftCaptureLibrary,
  MinecraftCaptureVersion,
} from "@ppt/native/capture-types";
import { pixelPerfectTestRoot } from "@ppt/paths";

const here = import.meta.dirname;

const versionDir = path.resolve(
  process.argv[2] ?? process.env.MINECRAFT_VERSION_DIR ?? ""
);

const javaBin = path.resolve(
  process.argv[3] ?? process.env.MINECRAFT_JAVA_BIN ?? ""
);

if (!process.argv[2] && (process.env.MINECRAFT_VERSION_DIR ?? "") === "") {
  throw new Error("Pass the Minecraft version directory as argument 1");
}

if (!process.argv[3] && (process.env.MINECRAFT_JAVA_BIN ?? "") === "") {
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
    path.join(pixelPerfectTestRoot, "native-runtime/native-reference")
);

const gameDir = path.join(runtime, "game");
const classes = path.join(runtime, "classes");

const outputDir = path.resolve(
  process.env.MINECRAFT_REFERENCE_OUTPUT_DIR ?? here
);

const captures = path.join(outputDir, "captures");
const frames = path.join(runtime, "frames");

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
    const osName = rule.os?.name ?? "";

    if (osName !== "" && osName !== platformName) {
      continue;
    }

    const osArch = rule.os?.arch ?? "";

    if (
      osArch !== "" &&
      ![
        process.arch,
        process.arch === "x64" ? "x86_64" : process.arch,
      ].includes(osArch)
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
  args: string[]
) {
  const argsFile = path.join(runtime, `${command}.args`);
  await writeFile(argsFile, args.map(quoteArgfile).join("\n"));

  const result = spawnSync(executable(command), [`@${argsFile}`], {
    cwd: gameDir,
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 240_000,
    windowsHide: true,
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
  "utf-8",
  "-classpath",
  classpath,
  "-d",
  classes,
  path.join(here, "ReferenceMain.java"),
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
  `-Dregistry.reference.output=${captures}`,
  `-Dregistry.reference.frames=${frames}`,
  "-classpath",
  classpath,
  "ReferenceMain",
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

console.log("Capturing vanilla Button pixels in an isolated offline client…");

const output = await javaCommand("java", javaArgs);

if (!output.includes("REGISTRY_REFERENCE_COMPLETE")) {
  throw new Error("Client exited without completing reference captures");
}

if (sha256(await readFile(jar)) !== sourceJarSha256) {
  throw new Error("Source JAR changed during capture");
}

const files = await readdir(captures);
const cases = [];

for (const scale of [1, 2, 3]) {
  for (const [column, width] of [200, 150, 103, 257].entries()) {
    for (const state of ["normal", "hover", "focus", "disabled"]) {
      const name = `${state}-w${width}-s${scale}.png`;

      if (!files.includes(name)) {
        throw new Error(`Missing reference ${name}`);
      }

      cases.push({
        name,
        state,
        width,
        height: 20,
        scale,
        label: ["Button", "Done", "iIl! MW@09", "Wider button"][column],
        sha256: sha256(await readFile(path.join(captures, name))),
      });
    }
  }

  for (let group = 0; group < 3; group += 1) {
    const start = 32 + group * 32;
    const end = Math.min(126, start + 31);

    const label = Array.from({ length: end - start + 1 }, (_, index) =>
      String.fromCodePoint(start + index)
    ).join("");

    for (const state of ["normal", "disabled"]) {
      const name = `ascii-${start}-${end}-${state}-s${scale}.png`;

      if (!files.includes(name)) {
        throw new Error(`Missing reference ${name}`);
      }

      cases.push({
        name,
        state,
        width: 300,
        height: 20,
        scale,
        label,
        sha256: sha256(await readFile(path.join(captures, name))),
      });
    }
  }
}

const provenance = {
  source:
    "Actual Minecraft Java Button rendered by the unmodified vanilla game classes and GPU pipeline; test-only Screen supplies layout and state.",
  minecraftVersion: "26.2",
  sourceJarSha256,
  captureSourceSha256: sha256(
    await readFile(path.join(here, "ReferenceMain.java"))
  ),
  entryPoint: "ReferenceMain -> net.minecraft.client.main.Main",
  mods: [],
  resourcePacks: [],
  background: "#202020",
  guiScales: [1, 2, 3],
  labelLanguage: "en_us",
  shaderPipeline: "vanilla",
  differenceTolerance: 0,
  frames: await Promise.all(
    ["", "ascii-"].flatMap((prefix) =>
      [1, 2, 3].map(async (scale) => {
        const name = `native-${prefix}scale-${scale}.png`;

        return {
          name,
          sha256: sha256(await readFile(path.join(frames, name))),
        };
      })
    )
  ),
  cases,
};

await writeFile(
  path.join(outputDir, "manifest.json"),
  `${JSON.stringify(provenance, null, 2)}\n`
);

console.log(`Captured ${cases.length} reference cases in ${captures}`);
