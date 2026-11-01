import { test, expect } from "@grasscn/tests/test";

test('Resizable preserves horizontal and vertical geometry and standard separator semantics',async({page})=>{
 for(const orientation of ['horizontal','vertical']){await page.goto(`/?component=resizable&orientation=${orientation}`);const group=page.locator('#group'),handle=page.getByRole('separator',{name:'Resize panels'});await expect(group).toHaveAttribute('data-slot','resizable-panel-group');await expect(handle).toHaveAttribute('aria-orientation',orientation==='horizontal'?'vertical':'horizontal');await expect(handle).toHaveAttribute('aria-valuenow','50');const left=(await page.locator('#left').boundingBox())!,right=(await page.locator('#right').boundingBox())!;expect(orientation==='horizontal'?right.x>left.x:right.y>left.y).toBe(true)}
})

test('Resizable responds to pointer dragging and reports layouts',async({page})=>{
 await page.goto('/?component=resizable');const handle=page.getByRole('separator',{name:'Resize panels'});const box=(await handle.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+80,box.y+box.height/2,{steps:6});await page.mouse.up();await expect.poll(async()=>Number(await handle.getAttribute('aria-valuenow'))).toBeGreaterThan(50);await expect.poll(async()=>JSON.parse(await page.locator('#layout').innerText()).left).toBeGreaterThan(50)
})

test('Resizable supports keyboard arrows and Home/End constraints',async({page})=>{
 await page.goto('/?component=resizable');const handle=page.getByRole('separator',{name:'Resize panels'});await handle.focus();await page.keyboard.press('ArrowRight');await expect.poll(async()=>Number(await handle.getAttribute('aria-valuenow'))).toBeGreaterThan(50);await page.keyboard.press('Home');await expect.poll(async()=>Number(await handle.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(10);await page.keyboard.press('End');await expect.poll(async()=>Number(await handle.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(85)
})

test('Resizable supports vertical keyboard operation',async({page})=>{
 await page.goto('/?component=resizable&orientation=vertical');const handle=page.getByRole('separator',{name:'Resize panels'});await handle.focus();await page.keyboard.press('ArrowDown');await expect.poll(async()=>Number(await handle.getAttribute('aria-valuenow'))).toBeGreaterThan(50)
})

test('Resizable forwards imperative panel/group refs and element refs',async({page})=>{
 await page.goto('/?component=resizable');await page.locator('#read-ref').click();await expect(page.locator('#refs')).toHaveText('DIV/DIV/left,right');await page.locator('#set-layout').click();await expect.poll(async()=>JSON.parse(await page.locator('#layout').innerText()).left).toBeCloseTo(25,0);await page.locator('#resize').click();await expect.poll(async()=>JSON.parse(await page.locator('#layout').innerText()).left).toBeCloseTo(35,0);await page.locator('#collapse').click();await expect.poll(async()=>JSON.parse(await page.locator('#layout').innerText()).left).toBe(0);await page.locator('#expand').click();await expect.poll(async()=>JSON.parse(await page.locator('#layout').innerText()).left).toBeGreaterThan(0)
})

test('Resizable honors disabled separators and disabled groups',async({page})=>{
 for(const disabled of ['disabled','groupDisabled']){await page.goto(`/?component=resizable&${disabled}=1`);const handle=page.getByRole('separator',{name:'Resize panels'});const before=await handle.getAttribute('aria-valuenow');await handle.focus();await page.keyboard.press('ArrowRight');expect(await handle.getAttribute('aria-valuenow')).toBe(before)}
})

test('Resizable preserves optional grip and never synthesizes interaction audio',async({page})=>{
 await page.addInitScript(()=>{(window as any).sounds=0;HTMLMediaElement.prototype.play=function(){(window as any).sounds++;return Promise.resolve()}});await page.goto('/?component=resizable&noHandle=1');await expect(page.locator('[data-slot="resizable-grip"]')).toHaveCount(0);const handle=page.getByRole('separator',{name:'Resize panels'});await handle.focus();await page.keyboard.press('ArrowRight');expect(await page.evaluate(()=>(window as any).sounds)).toBe(0)
})

for(const orientation of['horizontal','vertical'])test(`Resizable ${orientation} grip arrows agree with resize direction`,async({page})=>{await page.goto(`/?component=resizable&orientation=${orientation}`);const handle=page.getByRole('separator',{name:'Resize panels'}),arrow=handle.locator('[data-slot=resizable-arrow]').first(),bounds=(await arrow.boundingBox())!;expect(bounds.width<bounds.height).toBe(orientation==='horizontal');expect(await handle.evaluate(node=>getComputedStyle(node).cursor)).toBe(orientation==='horizontal'?'col-resize':'row-resize');await handle.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');expect(await handle.locator('[data-slot=resizable-grip]').evaluate(node=>getComputedStyle(node).outlineStyle)).toBe('solid')})
