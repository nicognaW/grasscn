import {resolveRepositoryPath, pixelPerfectRoot} from '../../../workspace-paths.mjs'
import {pixelPerfectTest as test,expect} from "./verified-test"
import {readFileSync,writeFileSync} from "node:fs"
import {createHash} from "node:crypto"
import {PNG} from "pngjs"
const directory='tests/reference/pagination-arrow',manifest=JSON.parse(readFileSync(resolveRepositoryPath(`${directory}/manifest.json`, pixelPerfectRoot),'utf8'))
function compare(expected:PNG,actual:PNG){expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);let mismatchedPixels=0;const diff=new PNG({width:expected.width,height:expected.height});for(let i=0;i<expected.data.length;i+=4){const mismatch=!actual.data.subarray(i,i+4).equals(expected.data.subarray(i,i+4));mismatchedPixels+=Number(mismatch);diff.data.set(mismatch?[255,0,255,255]:[expected.data[i]>>2,expected.data[i+1]>>2,expected.data[i+2]>>2,255],i)}return{mismatchedPixels,diff}}
test('Pagination arrow comparator rejects one changed pixel',()=>{const expected=PNG.sync.read(readFileSync(resolveRepositoryPath(`${directory}/captures/${manifest.cases[0].name}`, pixelPerfectRoot))),actual=PNG.sync.read(PNG.sync.write(expected));actual.data[0]^=1;expect(compare(expected,actual).mismatchedPixels).toBe(1)})
test.describe('Pagination native recipe-book page arrows',()=>{test.describe.configure({mode:'parallel'});for(const c of manifest.cases)test(`Pagination arrow pixels: ${c.name}`,async({page},info)=>{
 await page.setViewportSize({width:1536,height:900});const params=new URLSearchParams({component:'pagination',native:'1',part:'arrow',scale:String(c.scale),checked:String(c.checked),state:c.state,x:String(c.x),y:String(c.y),background:c.background})
 await page.goto(`/?${params}`);const subject=page.locator('[data-subject]');await expect(subject).toHaveAttribute('data-slot',c.checked?'pagination-next':'pagination-previous');await page.mouse.move(0,0)
 if(c.state.endsWith('hover'))await subject.hover();if(c.state==='focus'){await subject.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(subject).toBeFocused()}
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
 const expectedBytes=readFileSync(resolveRepositoryPath(`${directory}/captures/${c.name}`, pixelPerfectRoot));expect(createHash('sha256').update(expectedBytes).digest('hex')).toBe(c.sha256)
 const actualBytes=await subject.screenshot(),expected=PNG.sync.read(expectedBytes),actual=PNG.sync.read(actualBytes),{mismatchedPixels,diff}=compare(expected,actual)
 writeFileSync(info.outputPath('actual.png'),actualBytes);writeFileSync(info.outputPath('diff.png'),PNG.sync.write(diff));writeFileSync(info.outputPath('metrics.json'),JSON.stringify({case:c.name,mismatchedPixels,tolerance:0}));expect(mismatchedPixels).toBe(0)
})})
