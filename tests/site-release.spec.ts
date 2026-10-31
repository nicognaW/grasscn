import {test,expect} from './verified-test'
import {readFileSync} from 'node:fs'
const origin=process.env.GRASSCN_PREVIEW_URL??'http://127.0.0.1:5176/'
const index=JSON.parse(readFileSync('preview/search.generated.json','utf8')) as {name:string;title:string;exports:string[]}[]
const internal=/work in progress|\bWIP\b|26\.2|native cases|62\s*\/\s*62|19722|LOCAL PREVIEW|still being verified/i
test('search index covers every published item and its named exports',()=>{
 const registry=JSON.parse(readFileSync('registry.json','utf8'))
 expect(index.map(i=>i.name).sort()).toEqual(registry.items.map((i:{name:string})=>i.name).sort())
 expect(index.find(i=>i.name==='card')?.exports).toContain('CardHeader')
 expect(index.find(i=>i.name==='form')?.exports).toContain('FieldLabel')
 expect(index.find(i=>i.name==='chart')?.exports).toContain('MinecraftProfilerChart')
 expect(index.map(i=>i.name)).not.toContain('toast')
})
test('all production sections share navigation and omit internal status content',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 for(const path of ['','components','components/button','charts','charts/line']){
  await page.goto(`${origin}${path}`)
  await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await expect(page.locator('h1')).toBeVisible()
  expect(await page.locator('body').innerText()).not.toMatch(internal)
 }
 expect(errors).toEqual([])
})
test('search shows all items, more than six matches, and nested component imports',async({page})=>{
 await page.goto(origin+'#home')
 const search=page.getByRole('combobox',{name:'Search components',exact:true})
 await search.click()
 await expect(page.getByRole('listbox',{name:'Search results'}).getByRole('option')).toHaveCount(index.length)
 await search.fill('field')
 expect(await page.getByRole('listbox',{name:'Search results'}).getByRole('option').count()).toBeGreaterThan(6)
 await expect(page.getByRole('option',{name:'FieldLabel',exact:true})).toBeVisible()
 await search.fill('CardHeader');await search.press('Enter')
 await expect(page.locator('h1')).toHaveText('Card')
 await expect(page.locator('#component-import')).toContainText('import { CardHeader }')
 await search.fill('你好')
 await expect(page.getByRole('listbox',{name:'Search results'}).getByRole('option')).toHaveCount(0)
})
test('component pages expose live preview, source, installation and composition',async({page})=>{
 await page.goto(origin+'components/button')
 await page.getByRole('region',{name:'Button',exact:true}).getByRole('button',{name:'Button',exact:true}).first().click()
 await expect(page.getByLabel('Button activations')).toHaveText('Pressed 1 time')
 await page.getByRole('group',{name:'Example view'}).getByRole('button',{name:'Source',exact:true}).click()
 await expect(page.locator('.docs-code').first()).toContainText('function Button')
 await expect(page.locator('#component-installation')).toContainText('/r/button.json')
 await expect(page.locator('#component-composition')).toContainText('Button')
})
for(const width of [320,390,768,1440])test(`shared site navigation is usable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto(origin+'components/input')
 await expect(page.getByRole('complementary',{name:'Components navigation'})).toBeVisible()
 await expect(page.getByRole('complementary',{name:'Components navigation'}).locator('[aria-expanded]')).toHaveCount(0)
 await page.getByRole('navigation',{name:'Components',exact:true}).getByRole('link',{name:'Form',exact:true}).click()
 await expect(page.locator('h1')).toHaveText('Form')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Charts',exact:true}).click()
 await expect(page.locator('h1')).toHaveText('Charts')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

 test('canonical routes reload and legacy links still resolve',async({page})=>{
  await page.goto(origin+'components/button')
  await expect(page.locator('h1')).toHaveText('Button')
  await page.reload()
  await expect(page.locator('h1')).toHaveText('Button')
  await expect(page).toHaveTitle(/Button.*grasscn/)
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Charts',exact:true}).click()
  await expect(page).toHaveURL(origin+'charts')
  await page.goBack()
  await expect(page.locator('h1')).toHaveText('Button')
  await page.goto(origin+'#button')
  await expect(page.locator('h1')).toHaveText('Button')
  await page.goto(origin+'#/charts/line')
  await expect(page.locator('h1')).toHaveText('Line charts')
 })

for(const width of [320,390])test(`compact demos keep actions reachable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844})
 for(const name of ['button-group','table','pagination']){
  await page.goto(origin+'components/'+name)
  await expect(page.locator('.demo-stage')).toBeVisible()
  expect(await page.locator('.demo-stage').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true)
  if(name==='button-group'){
   await page.getByRole('button',{name:'Load',exact:true}).click()
   await expect(page.getByLabel('Button group action')).toHaveText('World loaded')
  }else if(name==='table'){
   await page.getByRole('button',{name:'Join',exact:true}).first().click()
   await expect(page.getByLabel('Selected world')).toHaveText('Grasslands')
  }else{
   await page.getByRole('link',{name:'2',exact:true}).click()
   await expect(page.getByLabel('Pagination current page')).toHaveText('Page 2 / 3')
  }
 }
})
test('shared controls retain native rendering and the sticky header is opaque',async({page})=>{
 await page.goto(origin+'components/button')
 const views=page.getByRole('group',{name:'Example view'})
 for(const label of ['Preview','Source'])await expect(views.getByRole('button',{name:label,exact:true})).toHaveAttribute('data-slot','button')
 await expect(page.getByRole('navigation',{name:'Components',exact:true}).getByRole('link',{name:'Button',exact:true})).toHaveAttribute('data-slot','button')
 expect(await page.getByRole('banner').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(32, 32, 32)')
 await page.goto(origin+'charts')
 await expect(page.locator('.chart-type-links a[data-slot="button"]')).toHaveCount(11)
 await expect(page.getByRole('button',{name:'View API response time code',exact:true})).toHaveAttribute('data-slot','button')
})

test('website code uses the shared Shiki highlighter without changing source text',async({page})=>{
 await page.goto(origin+'components/button')
 await expect(page.locator('#component-import .mc-code-token').first()).toBeVisible()
 await expect(page.locator('#component-import code')).toHaveText('import { Button } from "@/components/ui/button"')
 await expect(page.locator('#component-installation code')).toHaveAttribute('data-language','bash')
 await page.getByRole('group',{name:'Example view'}).getByRole('button',{name:'Source',exact:true}).click()
 await expect(page.locator('#component-preview .mc-code-token').first()).toBeVisible()
 const displayed=await page.locator('#component-preview code').textContent()
 expect(displayed?.replace(/\r\n/g,'\n')).toBe(readFileSync('registry/ui/button.tsx','utf8').replace(/\r\n/g,'\n'))
 const colors=await page.locator('#component-preview .mc-code-token').evaluateAll(tokens=>[...new Set(tokens.map(token=>getComputedStyle(token).color))])
 expect(colors).toContain('rgb(255, 85, 255)')
 expect(colors).toContain('rgb(85, 255, 85)')
 await page.goto(origin+'charts/metric')
 await page.getByRole('button',{name:'View API response time code',exact:true}).click()
 await expect(page.locator('.chart-example .mc-code-token').first()).toBeVisible()
 await expect(page.locator('.chart-example pre').first()).toHaveAttribute('tabindex','0')
 await page.goto(origin+'#install')
 await expect(page.locator('.grass-command .mc-code-token').first()).toBeVisible()
})
