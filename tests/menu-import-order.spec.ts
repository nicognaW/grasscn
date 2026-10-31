import {test,expect} from "./verified-test"
import {readFileSync,writeFileSync} from "node:fs"
import {PNG} from "pngjs"
const manifest=JSON.parse(readFileSync("tests/reference/menu-parts/manifest.json","utf8"))

for(const component of ["dropdown-menu","context-menu","menubar"])for(const scale of [1,2,3]){
 test(`Native menu separator survives a later generic reset: ${component} ${scale}`,async({page},info)=>{
  await page.setViewportSize({width:1536,height:900})
  const c=manifest.cases.find((c:any)=>c.element==="menu-separator"&&c.width===200&&c.background==="#202020"&&c.scale===scale)
  const params=new URLSearchParams({component,native:"1",part:"menu-separator",width:String(c.width),height:String(c.height),scale:String(c.scale),x:String(c.x),y:String(c.y)})
  await page.goto(`/?${params}`)
  if(component==="context-menu"){
   await expect(page.locator("#context-hit")).toBeVisible()
   await page.mouse.click(c.x*scale,c.y*scale,{button:"right"})
  }
  const menu=page.locator(`[data-slot="${component}-content"]`)
  await expect(menu).toHaveAttribute("data-mc-menu-ready","true")
  await page.addStyleTag({content:`html,body{background:${c.background}}#root{visibility:hidden}@layer components{.mc-separator{margin:0;}}`})
  await page.mouse.move(0,0)
  const actualBytes=await menu.screenshot();writeFileSync(info.outputPath("actual.png"),actualBytes);writeFileSync(info.outputPath("metrics.json"),JSON.stringify({component,manifest:"tests/reference/menu-parts/manifest.json",case:c.name,part:"menu-separator",alias:"late-reset"}));const expected=PNG.sync.read(readFileSync(`tests/reference/menu-parts/captures/${c.name}`)),actual=PNG.sync.read(actualBytes)
  expect([actual.width,actual.height]).toEqual([expected.width,expected.height])
  expect(actual.data.equals(expected.data),"Late generic styles must preserve all native separator pixels").toBe(true)
 })
}
