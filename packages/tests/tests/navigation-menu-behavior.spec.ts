import {test,expect,type Page} from "./verified-test"
import {minecraftClickSound} from "../../../apps/web/registry/ui/minecraft-sound-assets"

const game=(page:Page)=>page.getByRole("button",{name:"Game",exact:true})
const content=(page:Page)=>page.locator('[data-slot="navigation-menu-content"]')
async function openNavigation(page:Page,query="manual=1"){
 await page.goto(`/?component=navigation-menu&${query}`)
 await game(page).click();await expect(content(page)).toBeVisible()
}

test("Navigation Menu automatic hover opens, switches and dismisses panels",async({page})=>{
 await page.goto("/?component=navigation-menu&delay=80")
 await game(page).hover();await expect(content(page)).toBeVisible()
 await expect(game(page)).toHaveAttribute("aria-expanded","true")
 const world=page.getByRole("button",{name:"World",exact:true})
 await world.hover();await expect(world).toHaveAttribute("aria-expanded","true")
 await expect(game(page)).toHaveAttribute("aria-expanded","false")
 await page.mouse.move(0,0);await expect(content(page)).toHaveCount(0)
})

test("Navigation Menu manual activation ignores hover",async({page})=>{
 await page.goto("/?component=navigation-menu&manual=1&delay=80")
 await game(page).hover();await page.waitForTimeout(250)
 await expect(content(page)).toHaveCount(0)
 await game(page).click();await expect(content(page)).toBeVisible()
})

for(const query of ["manual=1","manual=1&noViewport=1"]){
 test(`Navigation Menu keyboard entry and focus return: ${query}`,async({page})=>{
  await openNavigation(page,query)
  await game(page).press("ArrowDown");await page.keyboard.press("Tab")
  await expect(page.getByRole("link",{name:"World guide",exact:true})).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("link",{name:"你好，世界",exact:true})).toBeFocused()
  await page.keyboard.press("Escape");await expect(content(page)).toHaveCount(0)
  await expect(game(page)).toBeFocused()
 })
 test(`Navigation Menu selection invokes its handler once: ${query}`,async({page})=>{
  await openNavigation(page,query)
  await page.getByRole("link",{name:"World guide",exact:true}).click()
  await expect(page.getByLabel("Navigation actions",{exact:true})).toHaveText("1")
  await expect(content(page)).toHaveCount(0)
 })
 test(`Navigation Menu viewport remains inside browser bounds: ${query}`,async({page})=>{
  await page.goto(`/?component=navigation-menu&${query}`)
  await page.locator('[data-slot="navigation-menu"]').evaluate(node=>Object.assign(node.style,{position:"fixed",left:"1120px",top:"820px",width:"140px"}))
  await game(page).click();await expect(content(page)).toBeVisible()
  await expect.poll(async()=>{const box=(await content(page).boundingBox())!;return box.x>=8&&box.y>=8&&box.x+box.width<=1272&&box.y+box.height<=892}).toBe(true)
 })
}

test("Navigation Menu keyboard moves between triggers and exposes disabled items",async({page})=>{
 await page.goto("/?component=navigation-menu&manual=1")
 await game(page).focus();await page.keyboard.press("ArrowRight")
 await expect(page.getByRole("button",{name:"World",exact:true})).toBeFocused()
 await expect(page.getByRole("button",{name:"Unavailable",exact:true})).toBeDisabled()
 await page.getByRole("button",{name:"Unavailable",exact:true}).click({force:true})
 await expect(content(page)).toHaveCount(0)
})

test("Navigation Menu active top-level links retain href and selection semantics",async({page})=>{
 await page.goto("/?component=navigation-menu&manual=1&activeLink=1")
 const home=page.getByRole("link",{name:"Home",exact:true})
 await expect(home).toHaveAttribute("aria-current","page")
 await expect(home).toHaveAttribute("href","#home")
 await home.click();await expect(page.getByLabel("Navigation actions",{exact:true})).toHaveText("1")
})

test("Navigation Menu supports preventing link dismissal",async({page})=>{
 await openNavigation(page,"manual=1&preventSelect=1")
 await page.getByRole("link",{name:"World guide",exact:true}).click()
 await expect(page.getByLabel("Navigation actions",{exact:true})).toHaveText("1")
 await expect(content(page)).toBeVisible()
})

test("Navigation Menu controlled values can accept or reject changes",async({page})=>{
 await page.goto("/?component=navigation-menu&manual=1&controlled=1&reject=1")
 await game(page).click();await expect(content(page)).toHaveCount(0)
 await openNavigation(page,"manual=1&controlled=1")
 await expect(page.getByLabel("Navigation value",{exact:true})).toHaveText("0")
 await page.getByRole("button",{name:"World",exact:true}).click()
 await expect(page.getByLabel("Navigation value",{exact:true})).toHaveText("1")
 await page.keyboard.press("Escape");await expect(page.getByLabel("Navigation value",{exact:true})).toHaveText("")
})

test("Navigation Menu default-open state can be toggled with Enter",async({page})=>{
 await page.goto("/?component=navigation-menu&manual=1&open=1")
 await expect(content(page)).toBeVisible()
 await game(page).press("Enter");await expect(content(page)).toHaveCount(0)
})

test("Navigation Menu respects Escape and outside-event cancellation",async({page})=>{
 await openNavigation(page,"manual=1&preventEscape=1&preventOutside=1")
 await page.keyboard.press("Escape");await expect(content(page)).toBeVisible()
 await page.locator("#navigation-outside").click();await expect(content(page)).toBeVisible()
})

test("Navigation Menu preserves composed elements and explicit viewport/indicator refs",async({page})=>{
 await openNavigation(page,"manual=1&triggerAsChild=1&contentAsChild=1&explicitViewport=1&preventOutside=1")
 await expect(content(page)).toHaveJSProperty("tagName","SECTION")
 await expect(page.locator('[data-slot="navigation-menu-positioner"]')).toHaveCount(1)
 await page.locator("#navigation-outside").click()
 await expect(page.getByLabel("Navigation refs",{exact:true})).toHaveText("NAV,UL,BUTTON,SECTION,DIV,SPAN")
 await page.getByRole("link",{name:"Composed link",exact:true}).click()
 await expect(page.getByLabel("Navigation actions",{exact:true})).toHaveText("1")
 await page.locator("#navigation-outside").click()
 await expect(page.getByLabel("Navigation refs",{exact:true})).toHaveText("NAV,UL,BUTTON,,,SPAN")
})

test("Navigation Menu CJK links finish their native glyph rendering",async({page})=>{
 const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message))
 await openNavigation(page)
 const link=page.getByRole("link",{name:"你好，世界",exact:true})
 await expect(link.locator('[data-mc-menu-unicode-ready]')).toHaveAttribute("data-mc-menu-unicode-ready","true")
 await link.click();await expect(page.getByLabel("Navigation actions",{exact:true})).toHaveText("1")
 expect(errors).toEqual([])
})

test("Navigation Menu preserves rich inline content and form editing",async({page})=>{
 await openNavigation(page,"manual=1&rich=1")
 const paragraph=content(page).locator("p")
 await expect(paragraph).toHaveText("Read world details here.")
 const line=await paragraph.evaluate(node=>({height:node.getBoundingClientRect().height,line:parseFloat(getComputedStyle(node).lineHeight)}))
 expect(line.height).toBeLessThanOrEqual(line.line*1.1)
 const input=page.getByRole("textbox",{name:"Navigation world name",exact:true})
 await input.fill("你好，世界");await expect(input).toHaveValue("你好，世界")
 await page.getByRole("button",{name:"Save navigation settings",exact:true}).click()
 await expect(page.getByLabel("Navigation actions",{exact:true})).toHaveText("1")
 await expect(content(page)).toBeVisible()
})

test("Navigation Menu follows RTL trigger navigation",async({page})=>{
 await page.goto("/?component=navigation-menu&manual=1&rtl=1")
 await game(page).focus();await page.keyboard.press("ArrowLeft")
 const world=page.getByRole("button",{name:"World",exact:true})
 await expect(world).toBeFocused();await world.press("Enter")
 await world.press("ArrowDown");await page.keyboard.press("Tab");await expect(page.getByRole("link",{name:"World guide",exact:true})).toBeFocused()
 await page.keyboard.press("Escape");await expect(world).toBeFocused()
})

test("Navigation Menu vertical orientation retains directional entry behavior",async({page})=>{
 await page.goto("/?component=navigation-menu&manual=1&vertical=1")
 await game(page).focus();await page.keyboard.press("ArrowDown")
 const world=page.getByRole("button",{name:"World",exact:true})
 await expect(world).toBeFocused();await world.press("Enter")
 await world.press("ArrowRight");await page.keyboard.press("Tab");await expect(page.getByRole("link",{name:"World guide",exact:true})).toBeFocused()
})

test("Navigation Menu resizes its viewport for a narrow browser",async({page})=>{
 await openNavigation(page)
 await page.setViewportSize({width:360,height:540})
 await expect.poll(async()=>{const box=(await content(page).boundingBox())!;return box.x>=8&&box.x+box.width<=352&&box.y>=8&&box.y+box.height<=532}).toBe(true)
})

test("Navigation Menu uses the original click only for accepted trigger activation",async({page})=>{
 await page.addInitScript(()=>{
  (window as any).__navigationVoices=[]
  HTMLMediaElement.prototype.play=function(){(window as any).__navigationVoices.push({source:this.src,volume:this.volume,rate:this.playbackRate});return Promise.resolve()}
 })
 const voices=()=>page.evaluate(()=>(window as any).__navigationVoices)
 await openNavigation(page)
 await expect.poll(voices).toEqual([{source:minecraftClickSound,volume:.25,rate:1}])
 await page.keyboard.press("Escape");expect(await voices()).toHaveLength(1)
 await game(page).press("Enter");await expect.poll(voices).toHaveLength(2)
 await page.getByRole("link",{name:"World guide",exact:true}).hover();expect(await voices()).toHaveLength(2)
 await page.getByRole("link",{name:"World guide",exact:true}).click();expect(await voices()).toHaveLength(2)
 await page.goto("/?component=navigation-menu&manual=1&controlled=1&reject=1")
 await game(page).click();expect(await voices()).toEqual([])
 await page.goto("/?component=navigation-menu&delay=0")
 await game(page).hover();await expect(content(page)).toBeVisible();expect(await voices()).toEqual([])
})

test("Navigation Menu tab-style links play once for an accepted active-state change",async({page})=>{
 await page.addInitScript(()=>{(window as any).__navigationLinkVoices=0;HTMLMediaElement.prototype.play=function(){(window as any).__navigationLinkVoices++;return Promise.resolve()}})
 await page.goto("/?component=navigation-menu&manual=1&toggleHome=1")
 const home=page.getByRole("link",{name:"Home",exact:true})
 await home.click();await expect(home).toHaveAttribute("aria-current","page")
 await expect.poll(()=>page.evaluate(()=>(window as any).__navigationLinkVoices)).toBe(1)
 await home.click();expect(await page.evaluate(()=>(window as any).__navigationLinkVoices)).toBe(1)
 await page.goto("/?component=navigation-menu&manual=1&toggleHome=1&reject=1")
 await page.getByRole("link",{name:"Home",exact:true}).click()
 expect(await page.evaluate(()=>(window as any).__navigationLinkVoices)).toBe(0)
})
