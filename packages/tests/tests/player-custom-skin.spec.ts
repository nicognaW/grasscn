import { resolveRepositoryPath, pixelPerfectRoot } from '../../../workspace-paths.mjs';

import { test, expect } from './verified-test';

import { PNG } from 'pngjs';

import { readFileSync, writeFileSync } from 'node:fs';

const fixture=process.env.GRASSCN_EXPANSION_URL??'http://127.0.0.1:5174/adventure.html'

for(const sample of [{name:'Dream back',src:'/dream-skin.png',state:'wide/steve',model:'slim'},{name:'classic back after Alex',src:'/steve-skin.png',state:'slim/alex',model:'wide'}] as const)test(`${sample.name} automatically uses the correct arm model`,async({page},info)=>{
 await page.setViewportSize({width:1536,height:900})
 const capture=async(explicit:boolean)=>{const c={element:'player-preview',src:sample.src,state:sample.state,value:180,anchor:0,width:80,height:120,...(explicit?{model:sample.model}:{})};await page.goto(`${fixture}?scale=2&case=${encodeURIComponent(JSON.stringify(c))}`);await expect(page.locator('[data-subject]')).toHaveAttribute('data-ready','true');return page.locator('[data-subject] canvas').screenshot()}
 const actual=await capture(false),explicit=await capture(true),a=PNG.sync.read(actual),b=PNG.sync.read(explicit);let differences=0
 for(let i=0;i<a.data.length;i+=4)if(!a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4)))differences++
 writeFileSync(info.outputPath('auto.png'),actual);writeFileSync(info.outputPath('explicit.png'),explicit);writeFileSync(info.outputPath('pixels.json'),JSON.stringify({comparison:'Automatic model versus explicit model confirmed by the skin layout/profile; not a native pixel oracle',mismatchedPixels:differences}))
 expect(differences).toBe(0)
})

test('custom skin can fail, recover, and replace another model without remounting',async({page})=>{
 await page.route('https://mc-heads.net/skin/*',route=>{
  const name=decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop()!)
  if(name==='Missing')return route.fulfill({status:404,body:''})
  return route.fulfill({status:200,contentType:'image/png',headers:{'access-control-allow-origin':'*'},body:readFileSync(resolveRepositoryPath(`tests/fixture/${name==='Dream'?'dream':'steve'}-skin.png`, pixelPerfectRoot))})
 })
 await page.goto('http://127.0.0.1:5176/components/player-preview')
 const player=page.getByRole('group',{name:'Player preview',exact:true}),input=page.getByRole('textbox',{name:'Player name',exact:true})
 for(const [name,model]of [['Dream','slim'],['Missing',null],['Classic','wide'],['Dream','slim']]as const){
  await input.fill(name);await page.getByRole('button',{name:'Load skin',exact:true}).click()
  if(model===null){await expect(player.getByRole('status')).toHaveText('3D preview unavailable');await expect(player).toHaveAttribute('data-ready','false')}
  else {await expect(player).toHaveAttribute('data-ready','true');await expect(player).toHaveAttribute('data-model',model)}
 }
})
