import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const json = async file => JSON.parse(await readFile(path.resolve(root, file), "utf8"))
const args = process.argv.slice(2)
const mapArg = args.indexOf("--map")
const map = await json(mapArg < 0 ? "registry/minecraft-map.json" : args[mapArg + 1])
const catalog = await json(map.catalog)
const inventory = await json(map.nativeInventory)
const registry = await json("registry.json")
const pilot = await json("tests/reference/manifest.json")
const digest = bytes => createHash("sha256").update(bytes).digest("hex")
const hash = value => assert.match(value, /^[a-f0-9]{64}$/)
const names = map.components.map(component => component.name)
assert.equal(new Set(names).size, names.length, "Duplicate component mapping")
const union = [...new Set(catalog.sources.flatMap(source => source.names))].sort()
assert.deepEqual(catalog.names, union, "Catalog snapshot is not the union of its sources")
assert.deepEqual([...names].sort(), union, "Missing or extra standard shadcn component")
assert.equal(map.sourceJarSha256, inventory.jarSha256)
assert.equal(map.sourceJarSha256, pilot.sourceJarSha256)
assert.equal(map.minecraftVersion, pilot.minecraftVersion)
hash(map.sourceJarSha256)
for (const source of catalog.sources) hash(source.sha256)
for (const [id, family] of Object.entries(map.families)) {
  assert.ok(family.classes.length, `${id}: no native class evidence`)
  for (const member of family.classes) {
    assert.ok(inventory.classes[member], `${id}: absent class ${member}`)
    hash(inventory.classes[member].sha256)
    hash(inventory.classes[member].disassemblySha256)
  }
  for (const member of family.assets) {
    const asset = inventory.assets[member]
    assert.ok(asset, `${id}: absent asset ${member}`)
    hash(asset.sha256)
    assert.ok(asset.width > 0 && asset.height > 0, `${id}: invalid PNG geometry`)
    if (asset.metadata) hash(asset.metadataSha256)
  }
}
const kinds = new Set(["native-element", "native-layout", "native-subset", "composition", "layout", "behavior", "platform-limited"])
for (const component of map.components) {
  assert.ok(kinds.has(component.mapping.kind), `${component.name}: unknown mapping kind`)
  assert.ok(component.mapping.target && component.mapping.limitation && component.nextStep)
  assert.ok(component.referenceCases.requiredDimensions.length)
  for (const family of component.mapping.families) assert.ok(map.families[family], `${component.name}: absent family ${family}`)
  assert.ok(["unverified", "reference-and-tests-available", "verified-declared-cases"].includes(component.pixelVerification.status), `${component.name}: unsupported fidelity claim`)
  if (component.implementation.registryItem) {
    assert.ok(registry.items.some(item => item.name === component.implementation.registryItem), `${component.name}: missing installable item`)
  }
  if (component.pixelVerification.manifest) {
    const manifest = await json(component.pixelVerification.manifest)
    assert.equal(manifest.sourceJarSha256, map.sourceJarSha256)
    assert.ok(manifest.cases.length, `${component.name}: empty reference matrix`)
    for (const reference of manifest.cases) {
      const file = path.join(path.dirname(component.pixelVerification.manifest), "captures", reference.name)
      assert.equal(digest(await readFile(path.resolve(root, file))), reference.sha256, `Reference integrity: ${file}`)
    }
    if (manifest.framesDirectory) for (const frame of manifest.frames) {
      const file = path.join(path.dirname(component.pixelVerification.manifest), manifest.framesDirectory, frame.name)
      assert.equal(digest(await readFile(path.resolve(root, file))), frame.sha256, `Full-frame integrity: ${file}`)
    }
    if (component.pixelVerification.status === "verified-declared-cases") {
      const report = await json(component.pixelVerification.installationReport)
      const repeat = await json(component.pixelVerification.repeatabilityReport)
      assert.equal(report.sourceJarSha256, map.sourceJarSha256)
      assert.equal(repeat.sourceJarSha256, map.sourceJarSha256)
      assert.equal(repeat.captureSourceSha256, manifest.captureSourceSha256)
      assert.equal(repeat.caseDefinitionSha256, manifest.caseDefinitionSha256)
      assert.deepEqual(report.pageErrors, [])
      assert.deepEqual(report.cases.map(c => c.name).sort(), manifest.cases.map(c => c.name).sort())
      assert.deepEqual(repeat.cases.map(c => c.name).sort(), manifest.cases.map(c => c.name).sort())
      for (const file of report.files) {
        assert.equal(digest(await readFile(path.resolve(root, "registry/ui", file.path))), file.sourceSha256, `Installed proof is stale: ${file.path}`)
      }
      for (const reference of manifest.cases) {
        const installed = report.cases.find(c => c.name === reference.name)
        const repeated = repeat.cases.find(c => c.name === reference.name)
        assert.equal(installed.mismatchedPixels, 0)
        assert.equal(repeated.mismatchedPixels, 0)
        assert.equal(installed.decodedRgbaSha256, repeated.decodedRgbaSha256)
        assert.equal(repeated.runOnePngSha256, reference.sha256)
        assert.equal(repeated.runTwoPngSha256, reference.sha256)
      }
    }
  }
}
if (args.includes("--live")) {
  for (const source of catalog.sources) {
    const response = await fetch(source.url)
    assert.ok(response.ok, `${source.url}: HTTP ${response.status}`)
    const body = await response.text()
    let current
    if (source.url.endsWith("/docs/components")) {
      current = [...new Set([...body.matchAll(/href="\/docs\/components\/base\/([^"#?]+)"/g)].map(match => match[1]))].sort()
    } else {
      const data = JSON.parse(body)
      current = (data.items ?? data).filter(item => item.type === "registry:ui").map(item => item.name).sort()
    }
    assert.deepEqual(current, source.names, `Upstream catalog changed: ${source.url}`)
  }
}
if (args.includes("--list")) {
  console.table(map.components.map(component => ({ component: component.name, kind: component.mapping.kind, reference: component.mapping.target, implementation: component.implementation.status, pixels: component.pixelVerification.status })))
}
console.log(`Map valid: ${names.length} components, ${Object.keys(map.families).length} native families. ${map.components.filter(component => component.pixelVerification.status === "unverified").length} components await pixel verification.`)
