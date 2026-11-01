import {resolveRepositoryPath, testRoot} from '../../../workspace-paths.mjs'
import {test,expect} from './verified-test'
import {readFileSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {PNG} from 'pngjs'
test.use({launchOptions:{args:['--disable-gpu','--disable-extensions','--disable-background-networking']}})
const reference=path.resolve('tests/reference/advancement-tree')
const manifest=JSON.parse(readFileSync(resolveRepositoryPath(path.join(reference,'manifest.json'), testRoot),'utf8'))
for(const c of manifest.cases)test(`advancement tree native pixels ${c.name}`,async({page},info)=>{
 await page.setViewportSize({width:1536,height:900})
 await page.goto(`${process.env.GRASSCN_TREE_INSTALLED_URL??'http://127.0.0.1:5174/adventure.html'}?scale=${c.scale}&mask=${c.value}&x=${c.cursor}&y=${c.anchor}`)
 await expect(page.locator('[data-subject] img')).toHaveCount(8)
 await expect.poll(()=>page.locator('[data-subject] img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true)
 const actual=await page.locator('[data-subject]').screenshot(),expected=readFileSync(resolveRepositoryPath(path.join(reference,'captures',c.name), testRoot)),a=PNG.sync.read(actual),b=PNG.sync.read(expected)
 expect([a.width,a.height]).toEqual([b.width,b.height]);let differences=0;const diff=new PNG({width:a.width,height:a.height})
 for(let i=0;i<a.data.length;i+=4){const same=a.data.subarray(i,i+4).equals(b.data.subarray(i,i+4));if(!same)differences++;diff.data.set(same?[0,0,0,0]:[255,0,255,255],i)}
 if(differences){writeFileSync(info.outputPath('actual.png'),actual);writeFileSync(info.outputPath('diff.png'),PNG.sync.write(diff));console.log('mismatch coordinates',Array.from({length:a.width*a.height},(_,i)=>i).filter(i=>!a.data.subarray(i*4,i*4+4).equals(b.data.subarray(i*4,i*4+4))).slice(0,10).map(i=>[i%a.width,Math.floor(i/a.width),[...a.data.subarray(i*4,i*4+4)],[...b.data.subarray(i*4,i*4+4)]]));await info.attach('actual',{body:actual,contentType:'image/png'});await info.attach('diff',{body:PNG.sync.write(diff),contentType:'image/png'})}
 writeFileSync(info.outputPath('pixels.json'),JSON.stringify({name:c.name,mismatchedPixels:differences}));expect(differences).toBe(0)
})

test('advancement tree selection, keyboard, details and panning',async({page})=>{
 await page.goto((process.env.GRASSCN_TREE_INSTALLED_URL??'http://127.0.0.1:5174/adventure.html')+'?scale=2&mask=1')
 const tree=page.getByRole('group',{name:'Advancement tree'}),first=page.getByRole('button',{name:'Milestone 0, completed',exact:true})
 await first.hover();await expect(page.locator('[data-slot="tooltip-content"]')).toContainText('Milestone 0')
 await first.click();await expect(first).toHaveAttribute('aria-pressed','true')
 await first.press('ArrowRight');await expect(page.getByRole('button',{name:'Milestone 1',exact:true})).toBeFocused()
 await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Milestone 1',exact:true})).toHaveAttribute('aria-pressed','true')
 await tree.focus();const plane=page.locator('.mc-advancement-plane'),before=await plane.getAttribute('style');await tree.press('ArrowRight');expect(await plane.getAttribute('style')).not.toEqual(before)
 await tree.press('Home');expect(await plane.getAttribute('style')).toEqual(before)
 const box=(await tree.boundingBox())!;await page.mouse.move(box.x+10,box.y+10);await page.mouse.down();await page.mouse.move(box.x+40,box.y+30,{steps:4});await page.mouse.up();expect(await plane.getAttribute('style')).not.toEqual(before)
})

test('advancement roadmap is available in the local website',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5176/components/advancement-tree')
 await expect(page.getByRole('heading',{name:'Advancement Tree',exact:true})).toBeVisible()
 await expect(page.getByRole('group',{name:'Release roadmap'})).toBeVisible()
 await page.getByRole('button',{name:'Mark incomplete',exact:true}).click()
 await expect(page.getByRole('button',{name:'Plan',exact:true})).toHaveAttribute('data-completed','false')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:'../../work/native-expansion/advancement-tree-preview.png',fullPage:false})
 expect(errors).toEqual([])
})
