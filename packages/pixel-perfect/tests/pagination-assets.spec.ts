import {resolveRepositoryPath, pixelPerfectRoot} from '../../../workspace-paths.mjs'
import {pixelPerfectTest as test,expect} from "./verified-test"
import {readFileSync} from "node:fs"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"

test("Pagination embeds all four original recipe-book arrow PNGs unchanged",()=>{
 const source=readFileSync(resolveRepositoryPath('registry/ui/minecraft-pagination-assets.css', pixelPerfectRoot),'utf8'),inventory=JSON.parse(readFileSync(resolveRepositoryPath('tests/reference/catalog/native-inventory.json', pixelPerfectRoot),'utf8'))
 const images=Array.from(source.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g),match=>Buffer.from(match[1],'base64'))
 expect(images).toHaveLength(4)
 for(const [index,name] of ['backward','backward_highlighted','forward','forward_highlighted'].entries()){
  const png=PNG.sync.read(images[index]);expect([png.width,png.height]).toEqual([12,17])
  expect(createHash('sha256').update(images[index]).digest('hex')).toBe(inventory.assets[`assets/minecraft/textures/gui/sprites/recipe_book/page_${name}.png`].sha256)
 }
})
