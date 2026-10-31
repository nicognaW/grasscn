import {test,expect} from './verified-test'
const fixture=process.env.GRASSCN_TREE_INSTALLED_URL??'http://127.0.0.1:5174/adventure.html'
test.use({launchOptions:{args:['--disable-gpu','--disable-extensions']}})
test('component navigation labels fit their buttons on desktop and mobile',async({page})=>{
 for(const width of [1440,1024,390]){
  await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:5176/components/advancement-tree')
  const navigation=page.getByRole('navigation',{name:'Components',exact:true});await expect(navigation.getByRole('link',{name:'Advancement Tree',exact:true})).toBeVisible()
  const clipped=await navigation.locator('a.mc-button').evaluateAll(links=>links.flatMap(link=>{const text=link.querySelector('.mc-text-pixels');if(!text)return[];const a=link.getBoundingClientRect(),b=text.getBoundingClientRect();return b.left<a.left+3||b.right>a.right-3?[link.textContent?.trim()]:[]}))
  expect(clipped,`clipped component labels at ${width}px`).toEqual([])
  if(width===1440)await page.screenshot({path:'../../work/native-expansion/advancement-navigation-fixed.png'})
 }
})
test('small pointer movement still selects an advancement',async({page})=>{
 await page.goto(fixture+'?scale=2&mask=1')
 const node=page.getByRole('button',{name:'Milestone 1',exact:true}),plane=page.locator('.mc-advancement-plane'),before=await plane.getAttribute('style'),box=(await node.boundingBox())!
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+5,box.y+box.height/2);await page.mouse.up()
 await expect(node).toHaveAttribute('aria-pressed','true');expect(await plane.getAttribute('style')).toBe(before)
})
test('dragging from a node pans without selecting and does not block keyboard selection',async({page})=>{
 const warnings:string[]=[];page.on('console',message=>{if(message.type()==='error'||message.type()==='warning')warnings.push(message.text())})
 await page.goto(fixture+'?scale=2&mask=1')
 const node=page.getByRole('button',{name:'Milestone 1',exact:true}),plane=page.locator('.mc-advancement-plane'),before=await plane.getAttribute('style'),box=(await node.boundingBox())!
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+50,box.y+box.height/2+20,{steps:5});await page.mouse.up()
 expect(await plane.getAttribute('style')).not.toBe(before);await expect(node).toHaveAttribute('aria-pressed','false')
 await node.focus();await node.press('Enter');await expect(node).toHaveAttribute('aria-pressed','true')
 await node.click();await expect(node).toHaveAttribute('aria-pressed','true')
 expect(warnings.filter(message=>/controlled|pointer capture/i.test(message))).toEqual([])
})

test('cancelled drag permits the next click and keyboard selection',async({page})=>{
 await page.goto(fixture+'?scale=2&mask=1')
 const tree=page.getByRole('group',{name:'Advancement tree'}),node=page.getByRole('button',{name:'Milestone 1',exact:true})
 const box=(await node.boundingBox())!,plane=page.locator('.mc-advancement-plane')
 await node.hover();await expect(page.getByRole('tooltip')).toBeVisible()
 await page.mouse.down();await page.mouse.move(box.x+box.width/2+30,box.y+box.height/2+10,{steps:4})
 await expect(page.getByRole('tooltip')).toHaveCount(0)
 await tree.dispatchEvent('pointercancel',{pointerId:1,isPrimary:true})
 await page.mouse.up();const pan=await plane.getAttribute('style')
 await page.mouse.move(1000,800);expect(await plane.getAttribute('style')).toBe(pan)
 await node.click();await expect(node).toHaveAttribute('aria-pressed','true')
 const next=page.getByRole('button',{name:'Milestone 2',exact:true})
 await next.focus();await next.press('Enter');await expect(next).toHaveAttribute('aria-pressed','true')
})
