import {test,expect} from './verified-test';
const preview=process.env.GRASSCN_PREVIEW_URL??'http://127.0.0.1:5176/';
for(const scale of[2]as const)for(const position of['default','popper']as const)for(const short of[false,true])test(`Select ${position} remains anchored during wheel scrolling GUI${scale} ${short?'short':'scrolled'}`,async({page})=>{
 const width=390,height=short?280:844;await page.setViewportSize({width,height});
 await page.goto(`${preview.replace(/\/$/,'')}/#/components/${position==='default'?'chart':'select'}`);
 const trigger=page.locator(`[data-slot=select-trigger][aria-label="${position==='default'?'Chart type':'Demo game mode'}"]`);
 await expect.poll(()=>trigger.evaluate(n=>getComputedStyle(n).getPropertyValue('--mc-scale').trim())).toBe(String(scale));
 await trigger.evaluate(n=>scrollBy(0,n.getBoundingClientRect().top-80));await trigger.click();
 const popup=page.locator('[data-slot=select-content]');await expect(popup).toBeVisible();await expect(popup).toHaveAttribute('data-mc-select-ready','true');
 const before=(await popup.boundingBox())!,anchor=(await trigger.boundingBox())!;
 expect(before.x).toBeGreaterThanOrEqual(0);expect(before.x+before.width).toBeLessThanOrEqual(width);expect(before.y).toBeGreaterThanOrEqual(0);expect(before.y+before.height).toBeLessThanOrEqual(height);
 expect(before.width%scale).toBe(0);expect(before.height%scale).toBe(0);
 const viewport=popup.locator('[data-slot=select-viewport]');await viewport.hover();await page.mouse.wheel(0,1000);await expect.poll(()=>viewport.evaluate(n=>n.scrollTop)).toBeGreaterThan(0);
 await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
 const after=(await popup.boundingBox())!;expect(Math.abs(after.y-before.y)).toBeLessThanOrEqual(scale);expect(Math.abs(after.x-before.x)).toBeLessThanOrEqual(scale);
 expect(Math.max(after.y-anchor.y-anchor.height,anchor.y-after.y-after.height,0)).toBeLessThanOrEqual(10*scale);
 const row=await popup.locator('[data-slot=select-item]').last().boundingBox(),bar=await popup.locator('.mc-select-scrollbar').boundingBox();expect(row!.width).toBe(Math.min(270,before.width/scale-30)*scale);expect(bar!.x+bar!.width).toBeLessThanOrEqual(before.x+before.width);
 await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
});
