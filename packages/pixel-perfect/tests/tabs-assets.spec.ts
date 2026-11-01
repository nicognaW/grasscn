import {resolveRepositoryPath, pixelPerfectRoot} from '../../../workspace-paths.mjs'
import { pixelPerfectTest as test, expect } from "./verified-test"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { PNG } from "pngjs"
import { minecraftTabsAssets as assets } from "../../../apps/web/registry/ui/minecraft-tabs-assets"
import { tabsUnihexAtlas } from "../../../apps/web/registry/ui/minecraft-tabs-atlas"

const json = (file: string) => JSON.parse(readFileSync(resolveRepositoryPath(file, pixelPerfectRoot), "utf8"))
const decode = (uri: string) => Buffer.from(uri.match(/base64,([A-Za-z0-9+/=]+)/)![1], "base64")
test("Tabs preserve original texture bytes and exact nine-slice pixels", () => {
  const provenance = json("tests/reference/tabs/asset-provenance.json")
  for (const [name, sprite] of Object.entries(assets.sprites)) {
    const bytes = decode(sprite.original)
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(provenance.sources[`assets/minecraft/textures/gui/sprites/widget/${name}.png`].sha256)
    const original = PNG.sync.read(bytes)
    let index = 0
    for (const [y, height] of [[0, 2], [2, 22]]) for (const [x, width] of [[0, 2], [2, 126], [128, 2]]) {
      const expected = new PNG({ width, height })
      PNG.bitblt(original, expected, x, y, width, height, 0, 0)
      const actual = PNG.sync.read(decode(sprite.pieces[index++]))
      expect([actual.width, actual.height]).toEqual([width, height])
      expect(actual.data.equals(expected.data)).toBe(true)
    }
  }
  for (const [name, uri] of Object.entries(assets.textures)) expect(createHash("sha256").update(decode(uri)).digest("hex")).toBe(provenance.sources[`assets/minecraft/textures/gui/${name}.png`].sha256)
})

test("Tabs CJK atlas uses observed native UVs without changing native pixels", () => {
  const observed = json("tests/reference/tabs-extra/glyph-atlas.json")
  expect(Object.keys(tabsUnihexAtlas).sort()).toEqual(Object.keys(observed).sort())
  for (const [code, uv] of Object.entries(tabsUnihexAtlas)) for (const axis of ["u0", "u1", "v0", "v1"] as const) expect(uv[axis]).toBe(observed[code][axis])
  const repeat = json("tests/reference/tabs-extra/repeatability.json")
  expect(repeat.glyphObservationEnabled).toEqual({ runOne: true, runTwo: false })
  expect(repeat.cases).toHaveLength(222)
  for (const c of repeat.cases) expect(c.mismatchedPixels).toBe(0)
})
