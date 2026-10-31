import { test, expect } from "./verified-test";
const preview = process.env.GRASSCN_PREVIEW_URL ?? "http://127.0.0.1:5176/";
for(const scale of [1,2,3] as const) for(const mobile of [false,true]) {
 test(`Original F3 charts stay visible and analytics selector stays anchored at GUI${scale} ${mobile?"mobile":"desktop"}`,async({page})=>{
  const width=mobile?390:1440,height=mobile?844:955;
  await page.setViewportSize({width,height});await page.goto(`${preview.replace(/\/$/,"")}/#/components/chart`);
  await page.getByRole('button',{name:`${scale}x`,exact:true}).click();
  const native=page.locator('[data-chart-native-examples]'),fps=native.locator('[data-native-chart=fps]'),profiler=native.locator('[data-native-chart=profiler]');
  await expect(fps).toBeVisible();await expect(profiler).toBeVisible();
  expect(await native.locator('details').count()).toBe(0);
  expect(await native.evaluate(n=>!!(n.compareDocumentPosition(document.querySelector('[data-slot="pixel-chart"]')!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(profiler).toHaveAttribute('data-mc-ready','true');
  const firstFps=await fps.screenshot(),firstProfiler=await profiler.screenshot();
  await native.getByRole('button',{name:'Next sample',exact:true}).click();
  await expect(page.getByLabel('Chart sample')).toHaveText('Sample 2');
  expect((await fps.screenshot()).equals(firstFps)).toBe(false);expect((await profiler.screenshot()).equals(firstProfiler)).toBe(false);
  await native.getByRole('button',{name:'120 FPS cap',exact:true}).click();await expect(native.getByRole('button',{name:'Unlimited',exact:true})).toBeVisible();
  const trigger=page.locator('[data-slot=select-trigger][aria-label="Chart type"]');
  await trigger.evaluate(n=>scrollBy(0,n.getBoundingClientRect().top-80));await trigger.click();
  const popup=page.locator('[data-slot=select-content]');await expect(popup).toBeVisible();
  const before=(await popup.boundingBox())!;expect(before.x).toBeGreaterThanOrEqual(0);expect(before.x+before.width).toBeLessThanOrEqual(width);expect(before.y).toBeGreaterThanOrEqual(0);expect(before.y+before.height).toBeLessThanOrEqual(height);
  const viewport=popup.locator('[data-slot=select-viewport]');await viewport.hover();await page.mouse.wheel(0,150);
  await expect.poll(()=>viewport.evaluate(n=>n.scrollTop)).toBeGreaterThan(0);
  await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));
  const after=(await popup.boundingBox())!;expect(Math.abs(after.y-before.y)).toBeLessThanOrEqual(scale);expect(after.y+after.height).toBeLessThanOrEqual(height);
  await page.keyboard.press('End');await expect(page.getByRole('option',{name:'Radial',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('[data-slot=pixel-chart]')).toHaveAttribute('data-chart-type','radial');
 });
}
