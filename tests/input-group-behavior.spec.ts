import {test,expect} from "./verified-test"
import {minecraftClickSound} from "../registry/ui/minecraft-sound-assets"
for(const part of ['input','textarea'])test(`Input Group ${part} supports editing, addon focus and refs`,async({page})=>{
 await page.goto(`/?component=input-group&part=${part}`);const field=page.getByRole('textbox',{name:'Group field'})
 await expect(field).toHaveAttribute('spellcheck','false');await expect(field).toHaveAttribute('autocorrect','off');await field.fill('こんにちは\n안녕하세요'.replace(part==='input'?'\n':'\r',' '));await expect(page.getByLabel('Group value')).toHaveText(part==='input'?'こんにちは 안녕하세요':'こんにちは\n안녕하세요')
 await page.locator('[data-slot=input-group-text]').click();await expect(field).toBeFocused();await page.locator('#read-ref').click();await expect(page.getByLabel('Group refs')).toHaveText(`${part==='input'?'INPUT':'TEXTAREA'}/BUTTON`)
})
test('Input Group addon alignment and cancelled focus remain functional',async({page})=>{
 for(const align of ['inline-start','inline-end','block-start','block-end']){await page.goto(`/?component=input-group&align=${align}`);const addon=page.locator('[data-slot=input-group-addon]'),field=page.getByRole('textbox');await expect(addon).toHaveAttribute('data-align',align);const a=(await addon.boundingBox())!,f=(await field.boundingBox())!;expect(align.startsWith('block')?Math.abs(a.y-f.y):Math.abs(a.x-f.x)).toBeGreaterThan(1)}
 await page.goto('/?component=input-group&cancelAddon=1');await page.locator('[data-slot=input-group-text]').click();await expect(page.getByRole('textbox')).not.toBeFocused()
})
test('Input Group native buttons do not submit forms or steal focus',async({page})=>{
 await page.goto('/?component=input-group');const button=page.getByRole('button',{name:'Send',exact:true});await button.click();await expect(button).toBeFocused();await expect(page.getByLabel('Group actions')).toHaveText('1');await expect(page.getByLabel('Group refs')).not.toHaveText('submitted')
 await page.goto('/?component=input-group&disabled=1');await page.getByRole('button',{name:'Send',exact:true}).dispatchEvent('click');await expect(page.getByLabel('Group actions')).toHaveText('0')
})
test('Input Group plays only the original button audio',async({page})=>{
 await page.addInitScript(()=>{(window as any).sounds=[];HTMLMediaElement.prototype.play=function(){(window as any).sounds.push({src:this.src,volume:this.volume,rate:this.playbackRate});return Promise.resolve()}})
 await page.goto('/?component=input-group');await page.locator('[data-slot=input-group-text]').click();await page.getByRole('textbox').fill('世界');expect(await page.evaluate(()=>(window as any).sounds)).toEqual([])
 await page.getByRole('button',{name:'Send',exact:true}).click();expect(await page.evaluate(()=>(window as any).sounds)).toEqual([{src:minecraftClickSound,volume:.25,rate:1}])
})
