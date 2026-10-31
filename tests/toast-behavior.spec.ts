import{test,expect}from"./verified-test"
import{createHash}from"node:crypto"
import{minecraftToastSounds}from"../registry/ui/minecraft-toast-sound-assets"
import{minecraftClickSound}from"../registry/ui/minecraft-sound-assets"

const ready=async(page:any)=>{await expect(page.locator('[data-mc-toast-ready="true"]').first()).toBeVisible()}
test("Toast keeps controlled actions, CJK, refs and dismissal",async({page})=>{
 await page.goto("/?component=toast&actions=1&label=世界已保存&text=你好，世界");await ready(page)
 const row=page.locator('[data-slot="toast"]');await expect(row).toHaveAttribute("data-state","open");await expect(row.locator('[data-slot="toast-title"]')).toHaveText("世界已保存")
 await page.locator("#read-ref").click();await expect(page.locator("#ref-tag")).toHaveText("LI")
 await row.getByRole("button",{name:"Undo",exact:true}).click();await expect(page.locator("#actions")).toHaveText("1");await expect(page.locator("#events")).toHaveText("1")
 await expect(row).toHaveCount(0);await page.locator("#open").click();await ready(page);await expect(row).toHaveAttribute("data-state","open")
 await row.getByRole("button",{name:"Done",exact:true}).click();await expect(row).toHaveCount(0)
})
test("Toast supports uncontrolled state, asChild and rich content",async({page})=>{
 await page.goto("/?component=toast&uncontrolled=1&asChild=1&rich=1&actions=1");const row=page.locator('[data-slot="toast"]');await expect(row.locator("strong")).toHaveText("World saved")
 await page.locator("#read-ref").click();await expect(page.locator("#ref-tag")).toHaveText("SECTION")
 await row.getByRole("button",{name:"Done",exact:true}).click();await expect(row).toHaveCount(0);await expect(page.locator("#events")).toHaveText("1")
})
test("Toast honors controlled rejection and action cancellation",async({page})=>{
 for(const flag of ["reject","cancelAction"]){await page.goto(`/?component=toast&actions=1&${flag}=1`);await ready(page);await page.getByRole("button",{name:"Undo",exact:true}).click();await expect(page.locator('[data-slot="toast"]')).toHaveAttribute("data-state","open");await expect(page.locator("#actions")).toHaveText("1")}
})
test("Toast preserves keyboard viewport focus, Escape and cancellation",async({page})=>{
 await page.goto("/?component=toast&actions=1");await ready(page);await page.keyboard.press("F8");expect(await page.locator('[data-slot="toast-viewport"]').evaluate(n=>n.contains(document.activeElement))).toBe(true)
 await page.keyboard.press("Escape");await expect(page.locator('[data-slot="toast"]')).toHaveCount(0)
 await page.goto("/?component=toast&actions=1&cancelEscape=1");await ready(page);await page.keyboard.press("F8");await page.keyboard.press("Escape");await expect(page.locator('[data-slot="toast"]')).toHaveAttribute("data-state","open")
})
test("Toast pauses its duration on hover and resumes afterward",async({page})=>{
 await page.clock.install({time:new Date("2026-10-30T00:00:00Z")});await page.clock.pauseAt(new Date("2026-10-30T00:00:01Z"));await page.goto("/?component=toast&duration=1000");await ready(page)
 const row=page.locator('[data-slot="toast"]');await page.locator('[data-slot="toast-viewport"]').hover();await page.clock.fastForward(1500);await expect(row).toHaveAttribute("data-state","open")
 await page.mouse.move(0,800);await page.clock.fastForward(1100);await expect(row).toHaveAttribute("data-state","closed");await page.clock.fastForward(600);await expect(row).toHaveCount(0)
})
test("Toast keeps native Radix swipe dismissal",async({page})=>{
 await page.goto("/?component=toast&duration=20000");await ready(page);const row=page.locator('[data-slot="toast"]'),r=(await row.boundingBox())!
 await page.mouse.move(r.x+30,r.y+20);await page.mouse.down();await page.mouse.move(r.x+180,r.y+20,{steps:12});await page.mouse.up();await expect(row).toHaveCount(0);await expect(page.locator("#swipes")).toHaveText("1")
})
test("Standard legacy Toaster and useToast support create, update and dismiss",async({page})=>{
 await page.goto("/?component=toaster&closed=1");await expect(page.locator('[data-slot="toast"]')).toHaveCount(0);await page.locator("#open").click();await ready(page);await expect(page.locator("#stored")).toHaveText("1")
 await page.locator("#update").click();await expect(page.locator('[data-slot="toast-title"]')).toHaveText("Updated 世界");await expect(page.locator('[data-slot="toast-description"]')).toHaveText("こんにちは")
 await page.locator("#close").click();await expect(page.locator('[data-slot="toast"]')).toHaveCount(0);await expect(page.locator("#stored")).toHaveText("0")
})
test("Sonner preserves its original global create/update/dismiss API and CJK",async({page})=>{
 await page.goto("/?component=sonner&closed=1");await page.locator("#open").click();await ready(page);await expect(page.locator('[data-sonner-toast]')).toHaveCount(1)
 await page.locator("#update").click();await expect(page.locator('[data-title]')).toHaveText("Updated 世界");await expect(page.locator('[data-description]')).toHaveText("こんにちは");await expect(page.locator('[data-sonner-toast]')).toHaveCount(1)
 await page.locator("#close").click();await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);await expect(page.locator(".mc-sonner-ghost")).toHaveCount(0)
})
test("Sonner keeps action events, cancellation and rich HTML",async({page})=>{
 await page.goto("/?component=sonner&actions=1&cancelAction=1");await ready(page);await page.getByRole("button",{name:"Undo",exact:true}).click();await expect(page.locator("#actions")).toHaveText("1");await expect(page.locator('[data-sonner-toast]')).toHaveCount(1)
 await page.goto("/?component=sonner&actions=1");await ready(page);await page.getByRole("button",{name:"Undo",exact:true}).click();await expect(page.locator("#actions")).toHaveText("1");await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
 await page.goto("/?component=sonner&rich=1");await expect(page.locator('[data-title] strong')).toHaveText("World saved");await expect(page.locator('[data-sonner-toast]')).toHaveAttribute("data-mc-toast-rich","true")
})
test("Sonner retains its promise notification API",async({page})=>{
 await page.goto("/?component=sonner&closed=1");await page.locator("#promise").click();await expect(page.locator('[data-title]')).toHaveText("World saved");await expect(page.locator('[data-sonner-toast]')).toHaveAttribute("data-type","success")
})
test("Toast sounds use byte-identical original assets and decode in the browser",async({page})=>{
 for(const [kind,pin]of Object.entries({in:"71fcf933a29e83940c2b896585b1c9de846d4b5fb3e934b7ef642bd11733b884",out:"78f870f75914fd6784b9cf6862887369a7e8604bd04eb4944562196bc3cdcaa1"}))expect(createHash("sha256").update(Buffer.from(minecraftToastSounds[kind as "in"|"out"].split(",")[1],"base64")).digest("hex")).toBe(pin)
 await page.goto("/?component=toast&closed=1");const decoded=await page.evaluate(async sounds=>{const context=new AudioContext(),out=[];for(const src of Object.values(sounds)){const data=Uint8Array.from(atob(src.split(",")[1]),c=>c.charCodeAt(0)),audio=await context.decodeAudioData(data.buffer);out.push({duration:audio.duration,channels:audio.numberOfChannels})}await context.close();return out},minecraftToastSounds);expect(decoded).toHaveLength(2);for(const sound of decoded){expect(sound.duration).toBeGreaterThan(.05);expect(sound.channels).toBeGreaterThan(0)}
})
for(const component of ["toast","sonner"])test(`${component} uses native sound gain, pitch and master volume; hover remains silent`,async({page})=>{
 await page.addInitScript(({sounds,click})=>{(window as any).sounds=[];HTMLMediaElement.prototype.play=function(){(window as any).sounds.push({kind:this.src===sounds.in?"in":this.src===sounds.out?"out":this.src===click?"click":"other",volume:this.volume,rate:this.playbackRate});return Promise.resolve()}},{sounds:minecraftToastSounds,click:minecraftClickSound})
 await page.goto(`/?component=${component}&actions=1&volume=.5`);await ready(page);await expect.poll(()=>page.evaluate(()=>(window as any).sounds)).toEqual([{kind:"in",volume:.2,rate:1}]);await page.locator(component==="toast"?'[data-slot="toast"]':'[data-sonner-toast]').hover();expect(await page.evaluate(()=>(window as any).sounds)).toHaveLength(1)
 await page.getByRole("button",{name:"Undo",exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).sounds.length)).toBe(3);const sounds=await page.evaluate(()=>(window as any).sounds);expect(sounds.filter((s:any)=>s.kind==="click")).toEqual([{kind:"click",volume:.125,rate:1}]);expect(sounds.filter((s:any)=>s.kind==="out")).toEqual([{kind:"out",volume:.2,rate:1}])
})
for(const component of ["toast","sonner"])test(`${component} plays one entry sound under React StrictMode`,async({page})=>{
 await page.addInitScript(({sounds})=>{(window as any).sounds=[];HTMLMediaElement.prototype.play=function(){(window as any).sounds.push(this.src===sounds.in?"in":this.src===sounds.out?"out":"other");return Promise.resolve()}},{sounds:minecraftToastSounds})
 await page.goto(`/?component=${component}-strict`)
 if(component==="sonner"){await page.locator("#show").click();await page.locator("#read-ref").click();await expect(page.locator("#ref-tag")).toHaveText("SECTION")}
 await ready(page);await expect.poll(()=>page.evaluate(()=>(window as any).sounds)).toEqual(["in"])
})
