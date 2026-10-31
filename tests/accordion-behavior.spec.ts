import {test,expect,type Page} from "./verified-test"
import {minecraftClickSound} from "../registry/ui/minecraft-sound-assets"
const game=(page:Page)=>page.getByRole("button",{name:"Game settings",exact:true})
const world=(page:Page)=>page.getByRole("button",{name:"World settings",exact:true})

test("Accordion single mode opens one section and collapses it",async({page})=>{
 await page.goto("/?component=accordion")
 await game(page).click();await expect(game(page)).toHaveAttribute("aria-expanded","true")
 await expect(page.getByRole("region",{name:"Game settings",exact:true})).toBeVisible()
 await world(page).click();await expect(game(page)).toHaveAttribute("aria-expanded","false")
 await expect(world(page)).toHaveAttribute("aria-expanded","true")
 await world(page).click();await expect(world(page)).toHaveAttribute("aria-expanded","false")
})

test("Accordion multiple mode preserves independent section values",async({page})=>{
 await page.goto("/?component=accordion&multiple=1")
 await game(page).click();await world(page).click()
 await expect(game(page)).toHaveAttribute("aria-expanded","true")
 await expect(world(page)).toHaveAttribute("aria-expanded","true")
 await game(page).click();await expect(world(page)).toHaveAttribute("aria-expanded","true")
})

test("Accordion keyboard navigation skips disabled entries and supports Home/End",async({page})=>{
 await page.goto("/?component=accordion")
 await game(page).focus();await page.keyboard.press("ArrowDown");await expect(world(page)).toBeFocused()
 await page.keyboard.press("ArrowDown");await expect(game(page)).toBeFocused()
 await page.keyboard.press("End");await expect(world(page)).toBeFocused()
 await page.keyboard.press("Home");await expect(game(page)).toBeFocused()
 await page.keyboard.press("Enter");await expect(game(page)).toHaveAttribute("aria-expanded","true")
 await page.keyboard.press(" ");await expect(game(page)).toHaveAttribute("aria-expanded","false")
})

for(const query of ["controlled=1","controlled=1&multiple=1"]){
 test(`Accordion controlled mode accepts and rejects requests: ${query}`,async({page})=>{
  await page.goto(`/?component=accordion&${query}`)
  await game(page).click();await expect(game(page)).toHaveAttribute("aria-expanded","true")
  await page.goto(`/?component=accordion&${query}&reject=1`)
  await game(page).click();await expect(game(page)).toHaveAttribute("aria-expanded","false")
  await expect(page.getByLabel("Accordion changes",{exact:true})).toHaveText("1")
 })
}

test("Accordion keeps a non-collapsible single item open",async({page})=>{
 await page.goto("/?component=accordion&locked=1&open=1")
 await expect(game(page)).toHaveAttribute("aria-disabled","true")
 await game(page).click({force:true});await expect(game(page)).toHaveAttribute("aria-expanded","true")
 await world(page).click();await expect(game(page)).toHaveAttribute("aria-expanded","false")
})

for(const query of ["disabled=1","rootDisabled=1"]){
 test(`Accordion respects disabled state: ${query}`,async({page})=>{
  await page.goto(`/?component=accordion&${query}`)
  await expect(game(page)).toBeDisabled();await game(page).click({force:true})
  await expect(game(page)).toHaveAttribute("aria-expanded","false")
 })
}

test("Accordion forwards cancellation and does not open on a prevented click",async({page})=>{
 await page.goto("/?component=accordion&prevent=1")
 await game(page).click();await expect(game(page)).toHaveAttribute("aria-expanded","false")
 await expect(page.getByLabel("Accordion changes",{exact:true})).toHaveText("0")
})

test("Accordion preserves composed content, refs and inner actions",async({page})=>{
 await page.goto("/?component=accordion&asChild=1&contentAsChild=1")
 await game(page).click();await page.locator("#accordion-refs").click()
 await expect(page.getByLabel("Accordion refs",{exact:true})).toHaveText("DIV,DIV,BUTTON,SECTION")
 await page.getByRole("button",{name:"Inside action",exact:true}).click()
 await expect(page.getByLabel("Accordion changes",{exact:true})).toHaveText("2")
 await expect(game(page)).toHaveAttribute("aria-expanded","true")
})

test("Accordion expanded CJK content completes native text layout",async({page})=>{
 const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message))
 await page.goto("/?component=accordion")
 await world(page).click();const region=page.getByRole("region",{name:"World settings",exact:true})
 await expect(region.locator('[data-mc-label-layout-ready]')).toHaveAttribute("data-mc-label-layout-ready","true")
 await expect(region.locator('[data-mc-label-ready]')).toHaveAttribute("data-mc-label-ready","true")
 await expect(region).toContainText("你好，世界");expect(errors).toEqual([])
})

test("Accordion horizontal RTL layout uses the correct keyboard direction",async({page})=>{
 await page.goto("/?component=accordion&horizontal=1&rtl=1")
 await game(page).focus();await page.keyboard.press("ArrowLeft");await expect(world(page)).toBeFocused()
 await page.keyboard.press("ArrowRight");await expect(game(page)).toBeFocused()
})

test("Accordion default-open content and force-mounted closed content retain semantics",async({page})=>{
 await page.goto("/?component=accordion&open=1")
 await expect(game(page)).toHaveAttribute("aria-expanded","true")
 await expect(page.getByRole("region",{name:"Game settings",exact:true})).toBeVisible()
 await page.goto("/?component=accordion&forceMount=1")
 await expect(game(page)).toHaveAttribute("aria-expanded","false")
 await expect(page.locator('[data-slot="accordion-content"]').first()).toHaveCount(1)
})

test("Accordion original Button activation sounds once; disabled and cancelled actions stay silent",async({page})=>{
 await page.addInitScript(()=>{(window as any).__accordionVoices=[];HTMLMediaElement.prototype.play=function(){(window as any).__accordionVoices.push({source:this.src,volume:this.volume,rate:this.playbackRate});return Promise.resolve()}})
 const voices=()=>page.evaluate(()=>(window as any).__accordionVoices)
 await page.goto("/?component=accordion")
 await game(page).hover();await game(page).focus();expect(await voices()).toEqual([])
 await game(page).press("Enter");expect(await voices()).toEqual([{source:minecraftClickSound,volume:.25,rate:1}])
 await game(page).click();expect(await voices()).toHaveLength(2)
 for(const query of ["disabled=1","prevent=1","locked=1&open=1"]){
  await page.goto(`/?component=accordion&${query}`)
  await game(page).click({force:true});expect(await voices()).toEqual([])
 }
})
