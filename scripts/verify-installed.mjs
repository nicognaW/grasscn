import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"
import { PNG } from "pngjs"

const [consumerDir, name, url, uiDirectory = "src/components/ui"] = process.argv.slice(2)
if (!consumerDir || !name || !url) throw new Error("Usage: node scripts/verify-installed.mjs <initialized-consumer-dir> <item-name> <consumer-fixture-url> [installed-ui-directory]")
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const json = async file => JSON.parse(await readFile(path.join(repo, file), "utf8"))
const map = await json("registry/minecraft-map.json")
const component = map.components.find(c => c.name === name)
const item = (await json("registry.json")).items.find(item => item.name === name)
assert.ok(component?.pixelVerification.manifest && item, "Need a registered item with an independent native manifest")
const manifestFile = component.pixelVerification.manifest
const manifest = await json(manifestFile)
const sha = bytes => createHash("sha256").update(bytes).digest("hex")
const consumerSettings = JSON.parse(await readFile(path.resolve(consumerDir, "components.json"), "utf8"))
const canonical = bytes => {
  let text = bytes.toString().replace(/\/\*[\s\S]*?\*\//g, "").trim()
  if (consumerSettings.rsc === false) text = text.replace(/^["']use client["'];?\s*/, "")
  return text.replace(/^(?:\/\/[^\n]*\n\s*)+/, "")
}
const files = []
for (const entry of item.files) {
  const filename = path.basename(entry.path)
  const installed = await readFile(path.resolve(consumerDir, uiDirectory, filename))
  const source = await readFile(path.join(repo, entry.path))
  assert.ok(canonical(installed) === canonical(source), `${filename} changed beyond permitted CLI transforms`)
  files.push({ path: filename, installedSha256: sha(installed), sourceSha256: sha(source), comparison: "Equal except CLI comment removal and use-client removal for rsc:false; data URIs unchanged" })
}
const browser = await chromium.launch({ channel: "msedge" })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
const pageErrors = [], cases = []
page.on("pageerror", error => pageErrors.push(error.message))
try {
  for (const c of manifest.cases) {
    const params = new URLSearchParams({ component: c.element ?? name, scale: String(c.scale), state: c.state, width: String(c.width), label: c.label ?? "", checked: String(c.checked ?? false) })
    if (c.element === "slider") params.set("value", String(Math.round(c.value * 1000)))
    await page.goto(`${url}?${params}`)
    const subject = page.locator("#subject")
    await subject.waitFor()
    await page.mouse.move(0, 0)
    if (c.state === "hover") await subject.hover()
    if (c.state.startsWith("focus")) {
      await page.keyboard.press("Tab")
      if (c.state === "focus-locked") await page.keyboard.press("Enter")
    }
    const expectedBytes = await readFile(path.join(repo, path.dirname(manifestFile), "captures", c.name))
    assert.equal(sha(expectedBytes), c.sha256)
    const expected = PNG.sync.read(expectedBytes), actual = PNG.sync.read(await subject.screenshot())
    assert.deepEqual([actual.width, actual.height], [expected.width, expected.height])
    assert.ok(actual.data.equals(expected.data), `Installed pixels differ: ${c.name}`)
    cases.push({ name: c.name, mismatchedPixels: 0, decodedRgbaSha256: sha(actual.data) })
  }
  assert.deepEqual(pageErrors, [])
  const report = { command: `shadcn add http://localhost:5173/r/${name}.json --yes --overwrite`, consumer: "separate initialized shadcn Vite/React consumer", consumerRsc: consumerSettings.rsc, browser: await browser.version(), devicePixelRatio: 1, sourceJarSha256: manifest.sourceJarSha256, files, cases, pageErrors }
  await writeFile(path.join(repo, path.dirname(manifestFile), "installation-verification.json"), JSON.stringify(report, null, 2) + "\n")
  console.log(`Installed ${name}: ${cases.length} native cases match exactly; ${files.length} sources match permitted CLI transforms; no browser errors`)
} finally { await browser.close() }
