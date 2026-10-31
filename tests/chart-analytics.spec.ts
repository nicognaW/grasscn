import { test, expect } from "./verified-test";
import { PNG } from "pngjs";
const types=[['bar','Bar'],['stacked-bar','Stacked bar'],['line','Line'],['area','Area'],['pie','Pie'],['donut','Donut'],['radar','Radar'],['radial','Radial']] as const;
async function select(page:any,label:string,value:string) { await page.getByRole('combobox',{name:label,exact:true}).click(); await page.getByRole('option',{name:value,exact:true}).click(); }
async function open(page:any,scale:number,mobile=false) {
 await page.setViewportSize({width:mobile?390:1440,height:1000}); await page.goto(`${process.env.GRASSCN_PREVIEW_URL ?? 'http://127.0.0.1:5176/'}#/components/chart`);
 await page.getByRole('button',{name:`${scale}x`,exact:true}).click();
 await expect(page.locator('[data-stage="chart"] [data-slot="pixel-chart"]')).toHaveAttribute('data-mc-ready','true');
}
for(const scale of [1,2,3]) for(const mobile of [false,true]) test(`Analytics types preserve integer pixels and fit ${mobile?'mobile':'desktop'} GUI${scale}`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page,scale,mobile);
 const stage=page.locator('[data-stage="chart"]'), chart=stage.locator('[data-slot="pixel-chart"]');
 for(const [type,label] of types) {
  await select(page,'Chart type',label); await expect(chart).toHaveAttribute('data-chart-type',type);
  for (const control of await stage.getByRole('combobox').all()) { const b=await control.boundingBox(); expect(b!.x).toBeGreaterThanOrEqual(0); expect(b!.x+b!.width).toBeLessThanOrEqual(mobile?390:1440); }
  const canvas=chart.locator('canvas'); await expect(canvas).toBeVisible();
  const bounds=await canvas.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(mobile?390:1440);
  const buffer=await canvas.screenshot(); await info.attach(`${type}.png`,{body:buffer,contentType:'image/png'});
  const image=PNG.sync.read(buffer);expect(image.width%scale).toBe(0);expect(image.height%scale).toBe(0);
  for(let y=0;y<image.height;y+=scale)for(let x=0;x<image.width;x+=scale)for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){
   const a=(y*image.width+x)*4,b=((y+sy)*image.width+x+sx)*4;
   if(!image.data.subarray(a,a+4).equals(image.data.subarray(b,b+4)))throw new Error(`${type}: noninteger pixel block at${x},${y}`);
  }
  const plot=chart.getByRole('img');await plot.focus();await page.keyboard.press('Home');await expect(chart.locator('.mc-pixel-chart-readout')).toContainText(type==='pie'||type==='donut'||type==='radial'?'Chrome':'January');
  await page.keyboard.press('End');await expect(chart.locator('.mc-pixel-chart-readout')).toContainText(type==='pie'||type==='donut'||type==='radial'?'Other':'June');
 }
 expect(errors).toEqual([]);
});
test('Website analytics filters update real data and accessible table',async({page})=>{
 await open(page,2);const chart=page.locator('[data-slot="pixel-chart"]');
 await chart.locator('summary').click();await expect(chart.getByRole('row')).toHaveCount(7);await expect(chart.getByRole('cell',{name:'186',exact:true})).toBeVisible();
 const before=await chart.locator('canvas').screenshot();await select(page,'Chart period','Last 3 months');await expect(chart.getByRole('row')).toHaveCount(4);await expect(page.locator('[data-stage=chart]')).toContainText('Apr to Jun 2024');
 expect((await chart.locator('canvas').screenshot()).equals(before)).toBe(false);
 await select(page,'Chart devices','Desktop');await expect(chart.getByRole('columnheader')).toHaveCount(2);
 await chart.getByRole('img').focus();await page.keyboard.press('Home');await expect(chart.locator('.mc-pixel-chart-readout')).toContainText('April: Desktop 73');
 await page.keyboard.press('ArrowRight');await expect(chart.locator('.mc-pixel-chart-readout')).toContainText('May: Desktop 209');
 await page.keyboard.press('Escape');await expect(chart.locator('.mc-pixel-chart-readout')).toContainText('Hover or use arrow keys');
});
test('Analytics chart rerasterizes when available width changes',async({page})=>{
 await open(page,2);const chart=page.locator('[data-slot="pixel-chart"]'),canvas=chart.locator('canvas');const width=await canvas.getAttribute('width');
 await page.setViewportSize({width:540,height:1000});await expect.poll(()=>canvas.getAttribute('width')).not.toBe(width);
 await expect(chart).toHaveAttribute('data-mc-ready','true');
});

test('Hover inspection reports the plotted datum and leaving clears the readout',async({page})=>{
 await open(page,2);const chart=page.locator('[data-slot="pixel-chart"]'),canvas=chart.locator('canvas');
 const b=(await canvas.boundingBox())!,w=Number(await canvas.getAttribute('width'));
 await canvas.hover({position:{x:(26+(w-32)/12)*2,y:30}});
 await expect(chart.locator('.mc-pixel-chart-readout')).toContainText('January: Desktop 186 / Mobile 80');
 await page.mouse.move(0,0);await expect(chart.locator('.mc-pixel-chart-readout')).toContainText('Hover or use arrow keys');
});
