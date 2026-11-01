import {repoRoot, webRoot, testRoot, resolveRepositoryPath, packageBin} from '../../../workspace-paths.mjs'
import { spawnSync } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = repoRoot
const [version, java, work, output] = process.argv.slice(2).map(value => path.resolve(value))
if (!version || !java || !work || !output) throw new Error("Pass version directory, Java 25 bin, fresh isolated work directory and output directory")
const instance = path.basename(version), minecraftRoot = path.resolve(version, "../.."), jar = path.join(version, `${instance}.jar`)
const hash = bytes => createHash("sha256").update(bytes).digest("hex")
const sourceJarSha256 = hash(await readFile(jar))
if (sourceJarSha256 !== "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290") throw new Error("Unexpected Minecraft artifact")
const metadata = JSON.parse(await readFile(path.join(version, `${instance}.json`)))
const permitted = library => {
  if (!library.rules) return true
  let allowed = false
  for (const rule of library.rules) {
    if (rule.os?.name && rule.os.name !== "windows") continue
    if (rule.os?.arch && ![process.arch, "x86_64"].includes(rule.os.arch)) continue
    allowed = rule.action === "allow"
  }
  return allowed
}
const game = path.join(work, "game"), classes = path.join(work, "classes")
await Promise.all([mkdir(game, { recursive: true }), mkdir(classes, { recursive: true }), mkdir(output, { recursive: true })])
const libraries = metadata.libraries.filter(permitted).filter(library => !/^(net\.fabricmc|net\.fabricmc\.|org\.ow2\.asm|io\.github\.llamalad7):/.test(library.name)).map(library => library.downloads?.artifact?.path).filter(Boolean).map(relative => path.join(minecraftRoot, "libraries", relative))
const classpath = [classes, jar, ...libraries].join(path.delimiter), source = resolveRepositoryPath(path.join( "tests/reference/GrassIconReferenceMain.java"))
const quote = argument => `"${argument.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`
async function run(name, args) {
  const argsFile = path.join(work, `${name}.args`)
  await writeFile(argsFile, args.map(quote).join("\n"))
  const result = spawnSync(path.join(java, `${name}.exe`), [`@${argsFile}`], { cwd: game, windowsHide: true, encoding: "utf8", timeout: 240000, maxBuffer: 10 * 1024 * 1024 })
  await writeFile(path.join(work, `${name}.log`), `${result.stdout ?? ""}\n${result.stderr ?? ""}`)
  if (result.error || result.status !== 0) throw new Error(`${name} failed: ${result.error ?? result.stderr}`)
  return result.stdout
}
await run("javac", ["-encoding", "UTF-8", "-classpath", classpath, "-d", classes, source])
await writeFile(path.join(game, "options.txt"), "guiScale:1\nlang:en_us\nforceUnicodeFont:false\nresourcePacks:[]\nhighContrast:false\nshowNowPlayingToast:false\nshowMusicToast:false\nstartedCleanly:true\nonboardAccessibility:false\npauseOnLostFocus:false\nsoundCategory_master:0.0\n")
const natives = path.join(version, "natives-windows-x86_64")
const result = await run("java", ["-Xmx2G", "--enable-native-access=ALL-UNNAMED", "--sun-misc-unsafe-memory-access=allow", `-Djava.library.path=${path.join(natives, "java")}`, `-Djna.tmpdir=${path.join(work, "jna")}`, `-Dorg.lwjgl.system.SharedLibraryExtractPath=${path.join(work, "lwjgl")}`, `-Dio.netty.native.workdir=${path.join(work, "netty")}`, `-Dregistry.brand.output=${output}`, "-classpath", classpath, "GrassIconReferenceMain", "--offlineDeveloperMode", "--username", "GrasscnReference", "--accessToken", "0", "--uuid", "00000000000000000000000000000001", "--version", "26.2", "--gameDir", game, "--assetsDir", path.join(minecraftRoot, "assets"), "--assetIndex", metadata.assetIndex.id, "--width", "1536", "--height", "900"])
if (!result.includes("GRASSCN_ITEM_REFERENCE_COMPLETE")) throw new Error("Native item capture did not finish")
if (hash(await readFile(jar)) !== sourceJarSha256) throw new Error("Source artifact changed")
await writeFile(path.join(output, "capture.json"), JSON.stringify({ sourceJarSha256, sourceMethod: "GuiGraphicsExtractor.item(original GRASS_BLOCK holder with explicit minecraft:grass_block ITEM_MODEL, 16, 16)", initialization: "Minimal isolated ItemStack supplies the shipped model component because 26.2 title-screen default components are unbound; all model, tint, textures, GUI transform and lighting come from the vanilla renderer. No world is created.", captureSourceSha256: hash(await readFile(source)), scales: [1, 3], backgrounds: ["#000000", "#ffffff"], viewport: [1536, 900], mods: [], resourcePacks: [] }, null, 2) + "\n")
console.log("Captured original grass-block inventory item at GUI scales 1 and 3")
