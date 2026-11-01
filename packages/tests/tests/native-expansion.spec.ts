import {resolveRepositoryPath, testRoot} from '../../../workspace-paths.mjs'
import {test,expect} from './verified-test'
import {readFileSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {PNG} from 'pngjs'
if(process.env.GRASSCN_WEBGL_BACKEND)test.use({launchOptions:{args:[`--use-angle=${process.env.GRASSCN_WEBGL_BACKEND}`]}})

const corpora=process.env.GRASSCN_EXPANSION_REFERENCE?[path.resolve(process.env.GRASSCN_EXPANSION_REFERENCE)]:['book','hotbar','hud','hud/meters','sign','player-preview','player-preview/custom-skins','map','map/locator','map/demo-world','trading','trading/scrollbar','player-list'].map(name=>path.resolve('tests/reference',name))
const reference=corpora[0]

const specimens=corpora.flatMap(reference=>JSON.parse(readFileSync(resolveRepositoryPath(path.join(reference,'manifest.json'), testRoot),'utf8')).cases.map((sample:any)=>({reference,sample})))
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
 const actual=await subject.screenshot(),expected=readFileSync(resolveRepositoryPath(path.join(reference,'captures',sample.name), testRoot)),a=PNG.sync.read(actual),b=PNG.sync.read(expected)
 expect([a.width,a.height]).toEqual([b.width,b.height])
 let differences=0;const diff=new PNG({width:a.width,height:a.height}),coordinates:unknown[]=[]
 for(let i=0;i<a.data.length;i+=4){const same=a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4));if(!same){differences++;if(coordinates.length<20)coordinates.push([i/4%a.width,Math.floor(i/4/a.width),[...a.data.subarray(i,i+4)],[...b.data.subarray(i,i+4)]])}diff.data.set(same?[0,0,0,0]:[255,0,255,255],i)}
 writeFileSync(info.outputPath('pixels.json'),JSON.stringify({name:sample.name,mismatchedPixels:differences,totalPixels:a.width*a.height,coordinates}))
 if(differences){writeFileSync(info.outputPath('actual.png'),actual);writeFileSync(info.outputPath('diff.png'),PNG.sync.write(diff))}
 expect(errors).toEqual([]);expect(differences).toBe(0)
})

test('book navigation and native page-turn sound',async({page})=>{
 await page.addInitScript(()=>{const calls:{src:string;volume:number;rate:number}[]=[];(window as any).bookAudio=calls;class RecordedAudio{src:string;volume=1;playbackRate=1;constructor(src:string){this.src=src}play(){calls.push({src:this.src,volume:this.volume,rate:this.playbackRate});return Promise.resolve()}};(window as any).Audio=RecordedAudio})
 const sample={element:'book',labels:['First page','Second page','Third page'],value:0}
 await page.goto(`${process.env.GRASSCN_EXPANSION_URL??'http://127.0.0.1:5174/adventure.html'}?scale=2&case=${encodeURIComponent(JSON.stringify(sample))}`)
 const book=page.getByRole('group',{name:'Book',exact:true});await expect(page.getByRole('button',{name:'Previous page'})).toHaveCount(0)
 await page.getByRole('button',{name:'Next page'}).click();await expect(page.getByRole('document',{name:'Page 2',exact:true})).toContainText('Second page')
 const sound=await page.evaluate(()=>(window as any).bookAudio);expect(sound).toHaveLength(1);expect(sound[0].src).toMatch(/^data:audio\/ogg;base64,/);expect(sound[0].volume).toBe(.5);expect(sound[0].rate).toBe(1)
 await book.focus();await book.press('PageDown');await expect(page.getByRole('document',{name:'Page 3',exact:true})).toContainText('Third page');await expect(page.getByRole('button',{name:'Next page'})).toHaveCount(0)
 await book.press('PageDown');await book.press('PageUp');await expect(page.getByRole('document',{name:'Page 2',exact:true})).toBeVisible();expect(await page.evaluate(()=>(window as any).bookAudio.length)).toBe(1)
})

test('hotbar pointer, keyboard and wheel selection',async({page})=>{
 const sample={element:'hotbar',value:0,background:'#202020'}
 await page.goto(`${process.env.GRASSCN_EXPANSION_URL??'http://127.0.0.1:5174/adventure.html'}?scale=2&case=${encodeURIComponent(JSON.stringify(sample))}`)
 const first=page.getByRole('button',{name:'Slot 1',exact:true});await first.click();await first.press('9');await expect(page.getByRole('button',{name:'Slot 9',exact:true})).toHaveAttribute('aria-pressed','true')
 await page.keyboard.press('ArrowRight');await expect(first).toHaveAttribute('aria-pressed','true');await page.mouse.wheel(0,100);await expect(page.getByRole('button',{name:'Slot 2',exact:true})).toHaveAttribute('aria-pressed','true')
 await page.getByRole('button',{name:'Slot 5',exact:true}).click();await expect(page.getByRole('button',{name:'Slot 5',exact:true})).toHaveAttribute('aria-pressed','true')
})


test('player preview keyboard, pointer rotation, clamp and reset',async({page})=>{
 const sample={element:'player-preview',state:'wide/steve',width:80,height:120,value:30,anchor:-5}
 await page.goto(`${process.env.GRASSCN_EXPANSION_URL??'http://127.0.0.1:5174/adventure.html'}?scale=2&case=${encodeURIComponent(JSON.stringify(sample))}`)
 const player=page.locator('[data-subject]');await expect(player).toHaveAttribute('data-ready','true');const before=await player.screenshot()
 await player.focus();await player.press('ArrowLeft');await expect.poll(()=>page.evaluate(()=>JSON.parse(document.documentElement.dataset.rotation??'null'))).toEqual({yaw:25,pitch:-5})
 await player.press('Home');await expect.poll(()=>page.evaluate(()=>JSON.parse(document.documentElement.dataset.rotation??'null'))).toEqual({yaw:30,pitch:-5})
 await player.blur();expect(await player.screenshot()).toEqual(before)
 const box=(await player.boundingBox())!;await page.mouse.move(box.x+40,box.y+40);await page.mouse.down();await page.mouse.move(box.x+80,box.y+200,{steps:5});await page.mouse.up()
 await expect.poll(()=>page.evaluate(()=>JSON.parse(document.documentElement.dataset.rotation??'null')?.pitch)).toBe(-50)
 expect(await player.screenshot()).not.toEqual(before)
})
