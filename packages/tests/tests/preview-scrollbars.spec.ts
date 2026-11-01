import {test,expect} from './verified-test'
import {readFileSync} from 'node:fs'
import {minecraftTextareaAssets} from '../../../apps/web/registry/ui/minecraft-textarea-assets'
const origin=process.env.GRASSCN_PREVIEW_URL??'http://127.0.0.1:5176/'

test('Page scrollbars embed the unchanged original game textures',()=>{
 const css=readFileSync('preview/minecraft-scrollbars.css','utf8')
 expect(css).toContain(minecraftTextareaAssets.scroller)
 expect(css).toContain(minecraftTextareaAssets.scroller_background)
})

for(const scale of [2])test(`Document, nested and horizontal bars use Minecraft artwork at GUI scale ${scale}`,async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.goto(origin+'#textarea')
 
 await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement,'::-webkit-scrollbar').width)).toBe(`${6*scale}px`)
 // Exercise native overflow on ordinary content and body-portaled content.
 await page.evaluate(()=>{
  for(const portal of [false,true]){
   const region=document.createElement('div');region.id=portal?'scrollbar-portal-proof':'scrollbar-nested-proof'
   region.tabIndex=0;region.style.cssText='width:120px;height:80px;overflow:auto'
   const content=document.createElement('div');content.style.cssText='width:600px;height:800px';content.textContent='Scrollable world list';region.append(content)
   ;(portal?document.body:document.querySelector('main')!).append(region)
  }
 })
 for(const selector of ['html','#scrollbar-nested-proof','#scrollbar-portal-proof','.docs-sidebar nav']){
  const result=await page.locator(selector).evaluate(element=>{
   const bar=getComputedStyle(element,'::-webkit-scrollbar'),track=getComputedStyle(element,'::-webkit-scrollbar-track'),thumb=getComputedStyle(element,'::-webkit-scrollbar-thumb')
   return {width:bar.width,height:bar.height,color:getComputedStyle(element).scrollbarColor,thumb:thumb.borderImageSource,track:track.borderImageSource,radius:thumb.borderRadius,buttons:getComputedStyle(element,'::-webkit-scrollbar-button').display}
  })
  expect(result.width).toBe(`${6*scale}px`);expect(result.height).toBe(`${6*scale}px`)
  expect(result.color).toBe('auto');expect(result.thumb).toContain(minecraftTextareaAssets.scroller)
  expect(result.track).toContain(minecraftTextareaAssets.scroller_background);expect(result.radius).toBe('0px');expect(result.buttons).toBe('none')
 }
 const nested=page.locator('#scrollbar-nested-proof');await nested.focus();await nested.press('End');await expect.poll(()=>nested.evaluate(e=>e.scrollTop)).toBeGreaterThan(0)
 const nav=page.locator('.docs-sidebar nav');await nav.hover();await page.mouse.wheel(400,0);await expect.poll(()=>nav.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0)
 // Textarea has a separate verified native scroller; avoid a second OS scrollbar.
 expect(await page.locator('#preview-textarea').evaluate(e=>getComputedStyle(e,'::-webkit-scrollbar').display)).toBe('none')
})

test('Retired components are absent from supported catalog and served payloads',async({page,request})=>{
 const registry=JSON.parse(readFileSync('registry.json','utf8')),map=JSON.parse(readFileSync('registry/minecraft-map.json','utf8'))
 expect(registry.items.length).toBe(map.components.length)
 const served=await (await request.get('http://127.0.0.1:5173/r/registry.json')).json()
 expect(served.items).toHaveLength(registry.items.length)
 await page.goto(origin+'#all')
 for(const name of ['Direction','Toast','Hover Card','Navigation Menu','Accordion','Alert','Skeleton','Field','Bubble','Message Scroller']){
  await expect(page.getByRole('navigation',{name:'Components'}).getByRole('link',{name,exact:true})).toHaveCount(0)
  expect(registry.items.some((item:{name:string})=>item.name===name.toLowerCase().replaceAll(' ','-'))).toBe(false)
  expect((await request.get(`http://127.0.0.1:5173/r/${name.toLowerCase().replaceAll(' ','-')}.json`)).status()).toBe(404)
 }
})
