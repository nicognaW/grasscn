import { resolveRepositoryPath, pixelPerfectRoot } from '../../../workspace-paths.mjs';

import { pixelPerfectTest as test, expect } from './verified-test';

import { readFileSync, writeFileSync } from 'node:fs';

import path from 'node:path';

import { PNG } from 'pngjs';

const corpora=process.env.GRASSCN_EXPANSION_REFERENCE?[path.resolve(process.env.GRASSCN_EXPANSION_REFERENCE)]:['book','hotbar','hud','hud/meters','sign','player-preview','player-preview/custom-skins','map','map/locator','map/demo-world','trading','trading/scrollbar','player-list'].map(name=>path.resolve('tests/reference',name))

const reference=corpora[0]

const specimens=corpora.flatMap(reference=>JSON.parse(readFileSync(resolveRepositoryPath(path.join(reference,'manifest.json'), pixelPerfectRoot),'utf8')).cases.map((sample:any)=>({reference,sample})))

for(const {reference,sample} of specimens)test(`native expansion pixels ${sample.name}`,async({page},info)=>{
 await page.setViewportSize({width:1536,height:900})
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto(`${process.env.GRASSCN_EXPANSION_URL??`${process.env.GRASSCN_FIXTURE_URL??'http://127.0.0.1:5174'}/adventure.html`}?scale=${sample.scale}&case=${encodeURIComponent(JSON.stringify(sample))}`)
 const subject=page.locator('[data-subject]');await expect(subject).toBeVisible()
 if(sample.element==='player-preview')await expect(subject).toHaveAttribute('data-ready','true')
 if(sample.element==='sign'||sample.element==='hanging-sign')await expect(subject.locator('canvas')).toHaveAttribute('data-ready','true')
 await expect.poll(()=>subject.locator('img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true)
 await page.evaluate(()=>document.fonts.ready)
 await page.waitForTimeout(100)
 const actual=await subject.screenshot(),expected=readFileSync(resolveRepositoryPath(path.join(reference,'captures',sample.name), pixelPerfectRoot)),a=PNG.sync.read(actual),b=PNG.sync.read(expected)
 expect([a.width,a.height]).toEqual([b.width,b.height])
 let differences=0;const diff=new PNG({width:a.width,height:a.height}),coordinates:unknown[]=[]
 for(let i=0;i<a.data.length;i+=4){const same=a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4));if(!same){differences++;if(coordinates.length<20)coordinates.push([i/4%a.width,Math.floor(i/4/a.width),[...a.data.subarray(i,i+4)],[...b.data.subarray(i,i+4)]])}diff.data.set(same?[0,0,0,0]:[255,0,255,255],i)}
 writeFileSync(info.outputPath('pixels.json'),JSON.stringify({name:sample.name,mismatchedPixels:differences,totalPixels:a.width*a.height,coordinates}))
 if(differences){writeFileSync(info.outputPath('actual.png'),actual);writeFileSync(info.outputPath('diff.png'),PNG.sync.write(diff))}
 expect(errors).toEqual([]);expect(differences).toBe(0)
})
