import { resolveRepositoryPath, pixelPerfectRoot } from '@ppt/paths';

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";

import { readFileSync, writeFileSync } from "node:fs";

import { PNG } from "pngjs";

import { createHash } from "node:crypto";

const arrowManifest=JSON.parse(readFileSync(resolveRepositoryPath('tests/reference/pagination-arrow/manifest.json', pixelPerfectRoot),'utf8'))

for(const c of arrowManifest.cases)test(`Resizable original arrow constituent ${c.name}`,async({page},info)=>{
 const params=new URLSearchParams({component:'resizable',scale:String(c.scale),background:c.background});if(c.state.startsWith('disabled'))params.set('disabled','1');await page.goto(`/?${params}`)
 const handle=page.getByRole('separator',{name:'Resize panels'});await page.mouse.move(0,0)
 if(c.state.endsWith('hover'))await handle.hover();else if(c.state==='focus'){await handle.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab')}
 const arrow=handle.locator(`[data-slot="resizable-arrow"][data-direction="${c.checked?'forward':'backward'}"]`),bytes=await arrow.screenshot(),actual=PNG.sync.read(bytes),expectedBytes=readFileSync(resolveRepositoryPath(`tests/reference/pagination-arrow/captures/${c.name}`, pixelPerfectRoot)),expected=PNG.sync.read(expectedBytes)
 expect(createHash('sha256').update(expectedBytes).digest('hex')).toBe(c.sha256);writeFileSync(info.outputPath('actual.png'),bytes);writeFileSync(info.outputPath('metrics.json'),JSON.stringify({component:'resizable',manifest:'tests/reference/pagination-arrow/manifest.json',case:c.name,part:c.checked?'forward-arrow':'backward-arrow',alias:'base'}));expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);expect(actual.data.equals(expected.data)).toBe(true)
})
