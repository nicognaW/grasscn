import {resolveRepositoryPath, pixelPerfectRoot} from '../../../workspace-paths.mjs'
import { pixelPerfectTest as test, expect } from "./verified-test"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { minecraftSelectAssets } from "../../../apps/web/registry/ui/minecraft-select-assets"
import { selectUnihexAtlas } from "../../../apps/web/registry/ui/minecraft-select-atlas"
const json = (file: string) => JSON.parse(readFileSync(resolveRepositoryPath(file, pixelPerfectRoot), "utf8"))
test("Select retains original list texture bytes", () => {
  const provenance = json("tests/reference/select/asset-provenance.json")
  for (const [name, uri] of Object.entries(minecraftSelectAssets)) {
    const bytes = Buffer.from(uri.match(/base64,([A-Za-z0-9+/=]+)/)![1], "base64")
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(provenance.sources[`assets/minecraft/textures/gui/${name}.png`].sha256)
  }
})
test("Select uses the observed CJK atlas without changing the original renderer", () => {
  const observed = json("tests/reference/select-extra/glyph-atlas.json")
  expect(Object.keys(selectUnihexAtlas).sort()).toEqual(Object.keys(observed).sort())
  for (const [code, uv] of Object.entries(selectUnihexAtlas)) for (const axis of ["u0", "u1", "v0", "v1"] as const) expect(uv[axis]).toBe(observed[code][axis])
  const repeat = json("tests/reference/select-extra/repeatability.json")
  expect(repeat.glyphObservationEnabled).toEqual({ runOne: true, runTwo: false })
  expect(repeat.cases).toHaveLength(144)
  for (const c of repeat.cases) expect(c.mismatchedPixels).toBe(0)
})
