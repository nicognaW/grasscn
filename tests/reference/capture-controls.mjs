import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const versionDir = path.resolve(process.argv[2] ?? process.env.MINECRAFT_VERSION_DIR ?? "")
const javaBin = path.resolve(process.argv[3] ?? process.env.MINECRAFT_JAVA_BIN ?? "")
if (!process.argv[2] && !process.env.MINECRAFT_VERSION_DIR) throw new Error("Pass the Minecraft version directory as argument 1")
if (!process.argv[3] && !process.env.MINECRAFT_JAVA_BIN) throw new Error("Pass the Java 25 bin directory as argument 2")
const instanceName = path.basename(versionDir)
const metadata = JSON.parse(await readFile(path.join(versionDir, `${instanceName}.json`), "utf8"))
const minecraftRoot = path.resolve(versionDir, "../..")
const jar = path.join(versionDir, `${instanceName}.jar`)
const runtime = path.resolve(process.env.MINECRAFT_REFERENCE_WORK_DIR ?? path.join(here, "../../.native-reference/controls"))
const gameDir = path.join(runtime, "game")
const classes = path.join(runtime, "classes")
const caseFile = path.resolve(process.argv[4] ?? path.join(here, "controls/cases.json"))
const definitions = JSON.parse(await readFile(caseFile, "utf8"))
if (!definitions.length || new Set(definitions.map(c => c.name)).size !== definitions.length) throw new Error("Empty or duplicate native cases")
for (const c of definitions) {
  if (!/^[a-z0-9-]+$/.test(c.name) || ![c.x, c.y, c.width, c.height, c.page ?? 0].every(Number.isInteger) || c.x < 0 || c.y < 0 || c.width <= 0 || c.height <= 0 || (c.x + c.width) * 3 > 1536 || (c.y + c.height) * 3 > 900) throw new Error(`Invalid reference bounds: ${c.name}`)
}
const outputDir = path.resolve(process.env.MINECRAFT_REFERENCE_OUTPUT_DIR ?? path.dirname(caseFile))
const captures = path.join(outputDir, "captures")
const frames = path.join(runtime, "frames")
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex")
const sourceJarSha256 = sha256(await readFile(jar))
if (sourceJarSha256 !== "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290") {
  throw new Error("Reference capture is pinned to the agreed Minecraft Java 26.2 artifact; source JAR digest does not match")
}
await Promise.all([mkdir(gameDir, { recursive: true }), mkdir(classes, { recursive: true }), mkdir(captures, { recursive: true })])

const platformName = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "osx" : "linux"
function permitted(library) {
  if (!library.rules) return true
  let allowed = false
  for (const rule of library.rules) {
    if (rule.os?.name && rule.os.name !== platformName) continue
    if (rule.os?.arch && ![process.arch, process.arch === "x64" ? "x86_64" : process.arch].includes(rule.os.arch)) continue
    allowed = rule.action === "allow"
  }
  return allowed
}
const libraries = metadata.libraries.filter(permitted)
  .filter(library => !/^(net\.fabricmc|net\.fabricmc\.|org\.ow2\.asm|io\.github\.llamalad7):/.test(library.name))
  .map(library => library.downloads?.artifact?.path)
  .filter(Boolean).map(relative => path.join(minecraftRoot, "libraries", relative))
const classpath = [classes, jar, ...libraries].join(path.delimiter)
const executable = command => path.join(javaBin, command + (process.platform === "win32" ? ".exe" : ""))
const quoteArgfile = argument => `"${argument.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`
async function javaCommand(command, args) {
  const argsFile = path.join(runtime, `${command}.args`)
  await writeFile(argsFile, args.map(quoteArgfile).join("\n"))
  const result = spawnSync(executable(command), [`@${argsFile}`], { cwd: gameDir, encoding: "utf8", timeout: 240_000, windowsHide: true, maxBuffer: 10 * 1024 * 1024 })
  await writeFile(path.join(runtime, `${command}.log`), `${result.stdout ?? ""}\n${result.stderr ?? ""}`)
  if (result.error || result.status !== 0) throw new Error(`${command} failed. See ${path.join(runtime, `${command}.log`)}\n${result.error ?? result.stderr}`)
  return result.stdout
}
await javaCommand("javac", ["-encoding", "UTF-8", "-classpath", classpath, "-d", classes, path.join(here, "ControlsReferenceMain.java")])
await writeFile(path.join(gameDir, "options.txt"), "guiScale:1\nlang:en_us\nforceUnicodeFont:false\nresourcePacks:[]\nhighContrast:false\nshowNowPlayingToast:false\nshowMusicToast:false\nstartedCleanly:true\nonboardAccessibility:false\npauseOnLostFocus:false\nsoundCategory_master:0.0\n")
const natives = path.join(versionDir, "natives-windows-x86_64")
const javaArgs = ["-Xmx2G", "--enable-native-access=ALL-UNNAMED", "--sun-misc-unsafe-memory-access=allow",
  `-Djava.library.path=${path.join(natives, "java")}`, `-Djna.tmpdir=${path.join(runtime, "jna")}`,
  `-Dorg.lwjgl.system.SharedLibraryExtractPath=${path.join(runtime, "lwjgl")}`,
  `-Dio.netty.native.workdir=${path.join(runtime, "netty")}`, `-Dregistry.reference.cases=${caseFile}`, `-Dregistry.reference.output=${captures}`, `-Dregistry.reference.frames=${frames}`,
  "-classpath", classpath, "ControlsReferenceMain", "--offlineDeveloperMode", "--username", "RegistryPilot", "--accessToken", "0",
  "--uuid", "00000000000000000000000000000001", "--version", "26.2", "--gameDir", gameDir,
  "--assetsDir", path.join(minecraftRoot, "assets"), "--assetIndex", metadata.assetIndex.id,
  "--width", "1536", "--height", "900"]
console.log("Capturing vanilla control pixels in an isolated offline client…")
const output = await javaCommand("java", javaArgs)
if (!output.includes("REGISTRY_REFERENCE_COMPLETE")) throw new Error("Client exited without completing reference captures")
if (sha256(await readFile(jar)) !== sourceJarSha256) throw new Error("Source JAR changed during capture")

const cases = []
for (const scale of [1, 2, 3]) for (const definition of definitions) {
  const name = definition.name + "-s" + scale + ".png"
  const bytes = await readFile(path.join(captures, name))
  cases.push({ ...definition, name, scale, sha256: sha256(bytes) })
}
const pages = [...new Set(definitions.map(c => c.page ?? 0))].sort((a, b) => a - b)
if (pages.some((page, index) => page !== index)) throw new Error("Native pages must be contiguous from zero")
await mkdir(path.join(outputDir, "frames"), { recursive: true })
const frameRecords = []
for (const page of pages) for (const scale of [1, 2, 3]) {
  const name = `native-controls-${pages.length > 1 ? `p${page}-` : ""}s${scale}.png`
  const bytes = await readFile(path.join(frames, name))
  await writeFile(path.join(outputDir, "frames", name), bytes)
  frameRecords.push({ name, sha256: sha256(bytes) })
}
const manifest = { source: "Actual vanilla control classes and GPU renderer; test screen supplies inputs and layout only.", minecraftVersion: "26.2", sourceJarSha256, captureSourceSha256: sha256(await readFile(path.join(here, "ControlsReferenceMain.java"))), caseDefinitionSha256: sha256(await readFile(caseFile)), mods: [], resourcePacks: [], background: "#202020", guiScales: [1, 2, 3], labelLanguage: "en_us", differenceTolerance: 0, framesDirectory: "frames", frames: frameRecords, cases }
await mkdir(path.join(outputDir, "source"), { recursive: true })
await writeFile(path.join(outputDir, "source/ControlsReferenceMain.java"), await readFile(path.join(here, "ControlsReferenceMain.java")))
manifest.sourceDirectory = "source"
await writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n")
console.log("Captured " + cases.length + " native control references")
