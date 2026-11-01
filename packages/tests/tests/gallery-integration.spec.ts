import {test,expect} from './verified-test'
import {readFileSync} from 'node:fs'
const origin=process.env.GRASSCN_PREVIEW_URL??'http://127.0.0.1:5176/'
const names=JSON.parse(readFileSync('preview/demos.json','utf8')).map((c:{name:string})=>c.name)
for(const viewport of [{width:1440,height:1000},{width:390,height:844}])test(`Maintained gallery remains usable at the fixed preview scale at ${viewport.width}px`,async({page})=>{
 test.setTimeout(240000)
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 page.on('console',message=>{if(message.text().includes('Too many active WebGL contexts'))errors.push(message.text())})
 await page.setViewportSize(viewport)
 for(const name of names){
  await page.goto(origin+'#/components/'+name)
  const card=page.locator(`#component-${name}`)
  for(const scale of [2]){
   await expect(card).toBeVisible()
   await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   expect(await page.locator('[id]').evaluateAll(nodes=>{const seen=new Set<string>();return nodes.flatMap(n=>{if(seen.has(n.id))return[n.id];seen.add(n.id);return[]})})).toEqual([])
  }
 }
 expect(errors).toEqual([])
})
