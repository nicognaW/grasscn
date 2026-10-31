import {test,expect} from "./verified-test"
import assert from "node:assert/strict"
import path from "node:path"
import {readFileSync,writeFileSync} from "node:fs"
import {readFile} from "node:fs/promises"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"
test.describe.configure({mode:"parallel"})
const sha=b=>createHash("sha256").update(b).digest("hex")

for(const [folder,part] of [['input', 'input'], ['input-cjk', 'input'], ['textarea', 'textarea'], ['textarea-cjk', 'textarea'], ['label', 'text'], ['', 'button'], ['button-cjk', 'button']]) {
 const directory=path.join("tests/reference",folder),reference=directory,manifest=JSON.parse(readFileSync(path.join(directory,"manifest.json"),"utf8"));
 for(const c of manifest.cases) test(`input-group ${folder||"button"} ${c.name}`,async({page},info)=>{
await page.setViewportSize({width:folder==="input"?1280:1536,height:900});
   const entry=part==="input"||part==="textarea",q=new URLSearchParams({component:"input-group",native:"1",part,scale:String(c.scale),state:c.state??"normal",width:String(c.width),height:String(c.height??(part==="text"?9:20)),x:String(c.x??16),y:String(c.y??16),background:c.background??"#202020",label:c.label??"Button",text:c.text??"",placeholder:c.placeholder??"",align:c.alignment??"left"})
   if(c.wrapWidth!=null)q.set("wrapWidth",String(c.wrapWidth));if(c.maxLength!=null)q.set("maxLength",String(c.maxLength))
   if(entry){await page.clock.install({time:new Date("2026-10-28T00:00:00Z")});await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"))}
   await page.goto(`/?${q}`);const subject=page.locator("#subject");await expect(subject).toBeVisible()
   if(entry){await expect(subject).toHaveAttribute("data-mc-ready","true");if(folder.includes("cjk")||/[^\x00-\x7f]/.test((c.text??"")+(c.placeholder??"")))await expect(subject).toHaveAttribute("data-mc-bitmap","true")}
   if(part==="text")await expect(subject).toHaveAttribute("data-mc-label-layout-ready","true")
   for(const line of await subject.locator('[data-mc-label-ready]').all())await expect(line).toHaveAttribute("data-mc-label-ready","true")
   if(c.state?.startsWith("focus")){await subject.focus();if(part==="button"){await page.keyboard.press("Tab");await page.keyboard.press("Shift+Tab")}}
   if(c.state==="hover")await subject.hover();else await page.mouse.move(0,0)
   if(entry){const cursor=c.cursor??c.text.length,anchor=c.anchor??cursor;await subject.evaluate((node,{cursor,anchor})=>node.setSelectionRange(Math.min(cursor,anchor),Math.max(cursor,anchor),cursor<anchor?"backward":"forward"),{cursor,anchor});if(part==="textarea")await subject.evaluate((node,y)=>{node.scrollTop=y},(c.value??0)*c.scale);await page.clock.runFor(c.caretMs);await expect(subject).toHaveAttribute("data-mc-ready","true")}
   else await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
   const expectedBytes=await readFile(path.join(reference,"captures",c.name));assert.equal(sha(expectedBytes),c.sha256);const expected=PNG.sync.read(expectedBytes),actualBytes=await subject.screenshot({animations:"disabled"}),actual=PNG.sync.read(actualBytes);writeFileSync(info.outputPath("actual.png"),actualBytes);writeFileSync(info.outputPath("metrics.json"),JSON.stringify({component:"input-group",manifest:path.join(directory,"manifest.json").replaceAll("\\","/"),case:c.name,part,alias:"base"}));assert.deepEqual([actual.width,actual.height],[expected.width,expected.height]);assert.ok(actual.data.equals(expected.data),`${folder}/${c.name}: installed pixels differ`)
 });
}
