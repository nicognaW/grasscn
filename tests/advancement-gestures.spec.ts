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
