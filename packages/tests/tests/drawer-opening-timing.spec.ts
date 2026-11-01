import{test,expect}from'./verified-test';import{PNG}from'pngjs';
const preview=process.env.GRASSCN_PREVIEW_URL??'http://127.0.0.1:5176/';
for(const scale of[2]as const)test(`Drawer backdrop covers first frame while panel moves GUI${scale}`,async({page},info)=>{
 await page.setViewportSize({width:1536,height:900});
 await page.goto(`${preview.replace(/\/$/,'')}/#drawer`);await expect.poll(()=>page.getByRole('button',{name:'Open drawer',exact:true}).evaluate(n=>getComputedStyle(n).getPropertyValue('--mc-scale').trim())).toBe(String(scale));await page.getByRole('button',{name:'Open drawer',exact:true}).scrollIntoViewIfNeeded();
 await page.evaluate(()=>{const s=document.createElement('div');s.id='backdrop-sentinel';Object.assign(s.style,{position:'fixed',left:'20px',top:'20px',width:'24px',height:'24px',background:'#808080',zIndex:'40'});document.body.append(s)});
 const first=await page.evaluate(()=>new Promise<{ready:string|null;opacity:string}>(resolve=>{const observer=new MutationObserver(()=>{const overlay=document.querySelector<HTMLElement>('[data-slot=drawer-overlay]'),content=document.querySelector('[data-slot=drawer-content]');if(!overlay||!content)return;observer.disconnect();for(const n of[overlay,content])for(const a of n.getAnimations()){a.pause();a.currentTime=0}resolve({ready:overlay.getAttribute('data-mc-backdrop-ready'),opacity:getComputedStyle(overlay).opacity})});observer.observe(document.body,{subtree:true,childList:true});document.querySelector<HTMLButtonElement>('[data-slot=drawer-trigger]')!.click()}));
 // No waiting for backdrop-ready or animation end: inspect the first mounted frame.
 expect(first.opacity).toBe('1');
 const values:number[][]=[],states:unknown[]=[];
 for(const ms of[0,16,32,50,100,200,500]){
  const state=await page.evaluate(ms=>{const overlay=document.querySelector<HTMLElement>('[data-slot=drawer-overlay]')!,content=document.querySelector<HTMLElement>('[data-slot=drawer-content]')!;for(const n of[overlay,content])for(const a of n.getAnimations()){a.pause();a.currentTime=ms}return{ms,ready:overlay.getAttribute('data-mc-backdrop-ready'),opacity:getComputedStyle(overlay).opacity,rect:overlay.getBoundingClientRect().toJSON(),transform:getComputedStyle(overlay).transform,panelTransform:getComputedStyle(content).transform}},ms);states.push(state);
  const bytes=await page.screenshot();await info.attach(`frame-${ms}.png`,{body:bytes,contentType:'image/png'});const png=PNG.sync.read(bytes),offset=(25*png.width+25)*4;values.push([...png.data.subarray(offset,offset+4)]);
  expect(state.opacity).toBe('1');expect(state.transform).toBe('none');expect([state.rect.x,state.rect.y,state.rect.width,state.rect.height]).toEqual([0,0,1536,900]);
 }
 await info.attach('timing.json',{body:JSON.stringify({first,states,values}),contentType:'application/json'});expect(values[0][0]).toBeLessThan(80);for(const value of values)expect(value).toEqual(values.at(-1));expect((states[0]as any).panelTransform).not.toBe((states.at(-1)as any).panelTransform);
});

test('Drawer stays visible during its closing transition, then restores focus',async({page})=>{
 await page.goto(`${preview.replace(/\/$/,'')}/components/drawer`);
 const trigger=page.getByRole('button',{name:'Open drawer',exact:true});
 await trigger.click();
 const panel=page.locator('[data-slot=drawer-content]');
 await expect(panel).toBeVisible();
 await expect.poll(()=>panel.evaluate(n=>n.getAnimations().every(a=>a.playState==='finished'))).toBe(true);
 const closing=await page.evaluate(()=>new Promise<{ending:boolean;display:string}>(resolve=>{
  const panel=document.querySelector<HTMLElement>('[data-slot=drawer-content]')!;
  const observer=new MutationObserver(()=>{
   if(!panel.hasAttribute('data-ending-style'))return;
   observer.disconnect();
   const display=getComputedStyle(panel).display;
   for(const animation of panel.getAnimations()){animation.pause();animation.currentTime=100}
   resolve({ending:true,display});
  });
  observer.observe(panel,{attributes:true});
  document.querySelector<HTMLButtonElement>('[data-slot=drawer-close]')!.click();
 }));
 expect(closing.ending).toBe(true);
 expect(closing.display).not.toBe('none');
 await panel.evaluate(n=>{for(const animation of n.getAnimations())animation.finish()});
 await expect(panel).toHaveCount(0);
 await expect(trigger).toBeFocused();
});
