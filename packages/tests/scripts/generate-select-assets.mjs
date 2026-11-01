import {resolveRepositoryPath} from '../../../workspace-paths.mjs'
import assert from "node:assert/strict"
import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import path from "node:path"
const directory = process.argv[2]
if (!directory) throw new Error("Pass the original menu-list texture directory")
const inventory = JSON.parse(await readFile(resolveRepositoryPath("tests/reference/catalog/native-inventory.json"), "utf8"))
const textures = {}, sources = {}
const hash = bytes => createHash("sha256").update(bytes).digest("hex")
for (const name of ["menu_list_background", "header_separator", "footer_separator"]) {
  const bytes = await readFile(path.join(directory, `${name}.png`)), member = `assets/minecraft/textures/gui/${name}.png`
  assert.equal(hash(bytes), inventory.assets[member].sha256)
  textures[name] = `url("data:image/png;base64,${bytes.toString("base64")}")`
  sources[member] = { sha256: hash(bytes) }
}
for (const name of ["button", "button_highlighted", "button_disabled", "scroller", "scroller_background"]) {
  const member = `assets/minecraft/textures/gui/sprites/widget/${name}.png`
  const original = inventory.assets[member]
  assert.ok(original)
  sources[member] = { sha256: original.sha256, ...(original.metadataSha256 ? { metadataSha256: original.metadataSha256, scaling: original.metadata.gui.scaling } : {}) }
}
await writeFile(resolveRepositoryPath("registry/ui/minecraft-select-assets.ts"), "// Original Minecraft Java26.2 list textures: Mojang Studios. Unchanged PNG bytes.\nexport const minecraftSelectAssets = " + JSON.stringify(textures) + " as const\n")
await writeFile(resolveRepositoryPath("tests/reference/select/asset-provenance.json"), JSON.stringify({ sourceJarSha256: inventory.jarSha256, sources, rendering: "Original CycleButton.displayOnlyValue uses AbstractButton sprites and scrolling label with2-pixel margins. Popup supplies controlled labels and geometry to original LanguageSelectionList and Entry classes, through reflection only for constructor/private label access. Rows270x18, content padding2, label centered at row y+5; selection1-pixel outline white when the list has a focused entry, otherwise808080, inside black. Native menu-list background and2-pixel header/footer separators are retained. Scrollbar x=rowRight+8, width6; native integer thumb geometry. Web hover-to-focus, popup positioning, optional grouping and commit behavior are Radix composition. Native pure-hover cases use a public pointer-move override to hold selection/focus fixed. Original CycleButton opening click uses ui.button.click; original language-list entry selection and scrolling are silent." }, null, 2) + "\n")
console.log("Generated original Select textures and source pins")
