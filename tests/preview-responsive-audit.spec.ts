import {test,expect,type Page,type Locator} from './verified-test'
const origin=process.env.GRASSCN_PREVIEW_URL??'http://127.0.0.1:5176/'
async function open(page:Page,name:string,scale:number){
 await page.setViewportSize({width:390,height:844})
 await page.goto(`${origin}#${name}`)
 
 return page.locator(`#component-${name}`)
}
async function inside(child:Locator,parent:Locator){
 await expect.poll(async()=>{
  const [c,p]=await Promise.all([child.boundingBox(),parent.boundingBox()])
  return !!c&&!!p&&c.x>=p.x-1&&c.x+c.width<=p.x+p.width+1
 }).toBe(true)
}
for(const scale of [2]){
 for(const [name,selector] of [
  ['button','[data-stage] .mc-button'],['slider','[data-stage] .mc-slider'],
  ['input','[data-stage] .mc-input'],['textarea','[data-stage] .mc-textarea'],
  ['native-select','.mc-native-select-control'],['input-group','[data-stage] button'],
 ] as const)test(`${name} controls fit narrow preview at GUI ${scale}`,async({page})=>{
  const card=await open(page,name,scale)
  await expect(card.locator(selector).first()).toBeVisible()
  for(const control of await card.locator(selector).all())await inside(control,card)
 })
 test(`all six OTP cells remain visible at GUI ${scale}`,async({page})=>{
  const card=await open(page,'input-otp',scale)
  await card.getByRole('button',{name:'CJK sample',exact:true}).click()
  await expect(card.getByLabel('OTP completions')).toHaveText('1 complete codes')
  const cells=card.locator('.mc-otp-slot')
  await expect(cells).toHaveCount(18)
  for(const cell of await cells.all())await inside(cell,card)
 })
 test(`form errors wrap and CJK names save at GUI ${scale}`,async({page})=>{
  const card=await open(page,'form',scale)
  for(const text of ['', 'a']){
   await card.getByRole('textbox',{name:'Player name',exact:true}).fill(text)
   await card.getByRole('button',{name:'Save player',exact:true}).click()
   const error=card.getByRole('alert')
   await expect(error).toBeVisible()
   for(const line of await error.locator('.mc-label-line').all())await inside(line,card)
  }
  await card.getByRole('textbox',{name:'Player name',exact:true}).fill('玩家')
  await card.getByRole('button',{name:'Save player',exact:true}).click()
  await expect(card.getByLabel('Saved player')).toHaveText('玩家')
 })
}
test('recipe labels select their own filter and keyboard focus survives wrapping',async({page})=>{
 const card=await open(page,'toggle-group',3)
 const single=card.getByRole('radiogroup',{name:'One recipe station'})
 await single.locator('label').filter({hasText:'Furnace'}).click()
 await expect(single.getByRole('radio',{name:'Furnace recipes'})).toBeChecked()
 await single.getByRole('radio',{name:'Furnace recipes'}).press('ArrowRight')
 await expect(single.getByRole('radio',{name:'Stonecutter recipes'})).toBeFocused()
 await single.getByRole('radio',{name:'Stonecutter recipes'}).press('Space')
 await expect(single.getByRole('radio',{name:'Stonecutter recipes'})).toBeChecked()
 for(const label of await card.locator('.demo-filter-choice').all())await inside(label,card)
})
test('calendar family and native select have inset preview stages',async({page})=>{
 for(const name of ['calendar','date-picker','marker','native-select']){
  const card=await open(page,name,3),stage=card.locator(`[data-stage="${name}"]`)
  await expect(stage).toHaveClass(/demo-stage/)
  expect(await stage.evaluate(el=>parseFloat(getComputedStyle(el).paddingLeft))).toBeGreaterThan(0)
 }
})
test('narrow GUI 3 tabs preserve readable labels and every panel stays reachable',async({page})=>{
 const card=await open(page,'tabs',3)
 for(const name of ['Game','World','More']){
  const tab=card.getByRole('tab',{name,exact:true})
  expect((await tab.boundingBox())!.width).toBeGreaterThanOrEqual(120)
  await tab.click()
  await expect(card.getByRole('tabpanel',{name,exact:true})).toBeVisible()
 }
})
