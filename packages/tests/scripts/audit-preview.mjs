import {repoRoot} from '../../../workspace-paths.mjs'
import {chromium,expect} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {documentationInventory} from './documentation-inventory.mjs'
const origin=(process.argv[2]??'http://127.0.0.1:5176').replace(/\/$/,'')
const out=path.resolve(process.argv[3]??path.join(repoRoot,'.pixel-perfect-test/preview-audit'))
const inventory=documentationInventory();await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage(),errors=[],rows=[]
page.on('pageerror',error=>errors.push(error.message))
try {
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(viewport)
  for(const route of ['/','/charts','/docs/components/button','/docs/components/form']){
   await page.goto(origin+route);await expect(page.getByRole('heading',{level:1})).toBeVisible()
   const scrollWidth=await page.evaluate(()=>document.documentElement.scrollWidth);expect(scrollWidth).toBeLessThanOrEqual(viewport.width)
   await page.screenshot({path:path.join(out,`${viewport.width}-${route.replaceAll('/','-')||'home'}.png`),fullPage:true})
   rows.push({route,viewport,scrollWidth})
  }
 }
 for(const entry of inventory.pages){
  await page.goto(origin+entry.route);await expect(page.getByRole('heading',{level:1})).toHaveText(entry.title)
  if(entry.playground)await expect(page.locator('.documentation-playground')).toBeVisible()
  const duplicates=await page.locator('[id]').evaluateAll(nodes=>{const seen=new Set();return nodes.flatMap(node=>{if(seen.has(node.id))return[node.id];seen.add(node.id);return[]})});expect(duplicates).toEqual([])
  rows.push({route:entry.route,playground:entry.playground,visible:true})
 }
 expect(errors).toEqual([])
}finally{
 await writeFile(path.join(out,'report.json'),JSON.stringify({origin,browser:browser.version(),inventory,rows,errors},null,2)+'\n');await browser.close()
}
