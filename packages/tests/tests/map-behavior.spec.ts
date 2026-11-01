import {test,expect} from './verified-test'
const fixture=process.env.GRASSCN_EXPANSION_URL??'http://127.0.0.1:5174/adventure.html'
const url=(sample:object)=>`${fixture}?scale=2&case=${encodeURIComponent(JSON.stringify(sample))}`
test('map terrain coordinates and keyboard markers',async({page})=>{
 await page.goto(url({element:'map',state:'terrain',checked:true,value:0,x:24,y:16}))
 const subject=page.locator('[data-subject]'),bounds=(await subject.boundingBox())!
 await subject.click({position:{x:20,y:40}});await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.mapClick)).toBe(JSON.stringify({x:10,y:20}))
 const home=page.getByRole('button',{name:'Home',exact:true});await home.focus();await home.press('Enter');await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.marker)).toBe('home')
 await page.getByRole('button',{name:'Village',exact:true}).click();await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.marker)).toBe('village')
 expect(bounds.width).toBe(256);expect(await page.evaluate(()=>document.documentElement.dataset.mapClick)).toBe(JSON.stringify({x:10,y:20}))
})
test('locator limits and keyboard waypoint selection',async({page})=>{
 for(const [bearing,visible]of [[-61,false],[-59,true],[59,true],[61,false]] as const){
  await page.goto(url({element:'locator',checked:true,value:bearing}));const point=page.getByRole('button',{name:'Waypoint',exact:true});await expect(point).toHaveCount(visible?1:0)
  if(visible){await point.focus();await point.press('Enter');await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.marker)).toBe('point')}
 }
})

test('locator preserves bearings across positive and negative full turns',async({page})=>{
 for(const heading of [0,360,720,-360,-720]){await page.goto(url({element:'locator',checked:true,value:0,heading}));await expect(page.getByRole('button',{name:'Waypoint',exact:true})).toHaveCount(1)}
})
