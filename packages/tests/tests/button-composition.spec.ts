import {resolveRepositoryPath, testRoot} from '../../../workspace-paths.mjs'
import{test,expect}from"./verified-test"
import{readFileSync,writeFileSync}from"node:fs"
import{PNG}from"pngjs"
const manifest=JSON.parse(readFileSync(resolveRepositoryPath("tests/reference/manifest.json", testRoot),"utf8"))
for(const mode of ["split","fragments","empty","numeric"])for(const c of manifest.cases.filter((c:{width:number;label:string})=>mode==="numeric"?c.width===103&&c.label.endsWith("09"):c.width===200&&c.label==="Button"))test(`Button${mode}composed native label:${c.name}`,async({page},info)=>{
 const params=new URLSearchParams({component:"button-composition",composition:mode,label:c.label,width:String(c.width),scale:String(c.scale),state:c.state});await page.goto(`/?${params}`);const button=page.locator("[data-subject]");await page.mouse.move(0,0);if(c.state==="hover")await button.hover();if(c.state==="focus"){await button.focus();await page.keyboard.press("Tab");await page.keyboard.press("Shift+Tab")}
 const actualBytes=await button.screenshot();writeFileSync(info.outputPath("actual.png"),actualBytes);writeFileSync(info.outputPath("metrics.json"),JSON.stringify({component:"button",manifest:"tests/reference/manifest.json",case:c.name,part:"label",alias:mode}));const actual=PNG.sync.read(actualBytes),expected=PNG.sync.read(readFileSync(resolveRepositoryPath(`tests/reference/captures/${c.name}`, testRoot)));expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);expect(actual.data.equals(expected.data)).toBe(true)
})
test("Button keeps consumer SVG/rich nodes, props, handlers and intended spacing",async({page},info)=>{
 await page.goto("/?component=button-composition&composition=rich");const icon=page.getByTestId("consumer-icon"),rich=page.getByTestId("consumer-rich");await expect(icon).toHaveCount(1);await expect(rich).toHaveAttribute("data-preserved","yes");const a=(await icon.boundingBox())!,b=(await rich.boundingBox())!;expect(b.x-a.x-a.width).toBeGreaterThan(0);await rich.click();await expect(page.getByLabel("Rich child events")).toHaveText("1")
})

const cjk=JSON.parse(readFileSync(resolveRepositoryPath("tests/reference/button-cjk/manifest.json", testRoot),"utf8"))
for(const mode of ["split","fragments","empty"])for(const c of cjk.cases)test(`Button ${mode} CJK runs: ${c.name}`,async({page},info)=>{
 await page.setViewportSize({width:1536,height:900})
 const params=new URLSearchParams({component:"button-composition",composition:mode,label:c.label,width:String(c.width),scale:String(c.scale),state:c.state,x:String(c.x??16),y:String(c.y??16)})
 await page.goto(`/?${params}`);const button=page.locator('[data-subject]');await page.mouse.move(0,0)
 if(c.state==='hover')await button.hover();if(c.state==='focus'){await button.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab')}
 await expect(button.locator('[data-mc-label-ready]')).toHaveAttribute('data-mc-label-ready','true',{timeout:15_000})
 const actualBytes=await button.screenshot();writeFileSync(info.outputPath("actual.png"),actualBytes);writeFileSync(info.outputPath("metrics.json"),JSON.stringify({component:"button",manifest:"tests/reference/button-cjk/manifest.json",case:c.name,part:"label",alias:mode}));const a=PNG.sync.read(actualBytes),e=PNG.sync.read(readFileSync(resolveRepositoryPath(`tests/reference/button-cjk/captures/${c.name}`, testRoot)));expect([a.width,a.height]).toEqual([e.width,e.height]);expect(a.data.equals(e.data)).toBe(true)
})
