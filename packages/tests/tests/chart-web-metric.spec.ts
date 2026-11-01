import {test,expect} from './verified-test';
const preview=process.env.GRASSCN_PREVIEW_URL??'http://127.0.0.1:5176/';
for(const scale of[1,2,3]as const)test(`Web metrics reuse F3 bar geometry and native captions at GUI${scale}`,async({page})=>{
 await page.goto(`/?component=chart&metric=1&case=${encodeURIComponent(JSON.stringify({scale}))}`);
 const plot=page.locator('#metric-subject');await expect(plot).toHaveAttribute('data-slot','chart');
 await expect(plot).toContainText('0 ms min');await expect(plot).toContainText('100 ms avg');await expect(plot).toContainText('200 ms max');await expect(plot).toContainText('Goal');await expect(plot).not.toContainText('FPS');
 const bars=await plot.locator('[data-slot=chart-fps-frame]>.mc-chart-rect').evaluateAll(nodes=>nodes.filter(n=>(n as HTMLElement).style.width===`${getComputedStyle(n).getPropertyValue('--mc-scale').trim()}px`&&(n as HTMLElement).style.background.startsWith('rgb(')&&parseFloat((n as HTMLElement).style.top)+parseFloat((n as HTMLElement).style.height)===69*Number(getComputedStyle(n).getPropertyValue('--mc-scale'))).map(n=>({height:parseFloat((n as HTMLElement).style.height),top:parseFloat((n as HTMLElement).style.top),color:(n as HTMLElement).style.background})));
 expect(bars.map(bar=>bar.height)).toEqual([0,15,30,45,60].map(height=>height*scale));
 expect(bars.map(bar=>bar.top)).toEqual([69,54,39,24,9].map(y=>y*scale));
 await page.locator('#metric-update').click();await expect(plot).toContainText('225 ms max');await expect(plot).toContainText('125 ms avg');
 await page.locator('#metric-format').click();await expect(plot).toContainText('125.0 req avg');
});
for(const scale of[2]as const)test(`F3 web-data demo updates native bars and browser-share 3D profiler GUI${scale}`,async({page})=>{
 await page.goto(`${preview.replace(/\/$/,'')}/docs/components/chart`);
 const section=page.locator('[data-f3-web-data]'),metric=section.locator('[data-web-chart=metric]'),profiler=section.locator('[data-web-chart=profiler]');
 await expect(metric).toBeVisible();await expect(profiler).toBeVisible();await expect(profiler.locator('[data-slot=chart-profiler-frame]')).toHaveAttribute('data-mc-ready','true');
 await expect(metric).toContainText('ms avg');await expect(profiler).toContainText('Browser visitors');await expect(profiler).toContainText('Chrome');await expect(profiler).toContainText('Safari');await expect(profiler).not.toContainText('render');
 expect(await section.evaluate(n=>!!(n.compareDocumentPosition(document.querySelector('[data-slot=chart-example]')!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 const beforeBars=await metric.screenshot(),beforePie=await profiler.screenshot();await section.getByRole('button',{name:'Next hour',exact:true}).click();
 await expect(profiler.locator('[data-slot=chart-profiler-frame]')).toHaveAttribute('data-mc-ready','true');expect((await metric.screenshot()).equals(beforeBars)).toBe(false);expect((await profiler.screenshot()).equals(beforePie)).toBe(false);
 await page.getByRole('combobox',{name:'F3 metric',exact:true}).click();await page.getByRole('option',{name:'Request volume',exact:true}).click();await expect(metric).toContainText('req avg');
});
