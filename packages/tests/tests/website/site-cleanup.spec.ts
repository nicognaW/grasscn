import {resolveRepositoryPath, testRoot} from '@tests/paths'
import {test,expect} from '@grasscn/tests/test'
import {readFileSync} from 'node:fs'
const index=JSON.parse(readFileSync(resolveRepositoryPath('preview/search.generated.json', testRoot),'utf8')) as {name:string;title:string;exports:string[]}[]
const origin=process.env.GRASSCN_PREVIEW_URL??'http://127.0.0.1:5176/'
test('catalog consolidates pages and removes discarded controls and copy',async({page})=>{
 for(const name of ['field','bubble','message-scroller'])expect(index.some(i=>i.name===name)).toBe(false)
 await page.goto(origin+'components/avatar')
 await expect(page.getByRole('group',{name:'Preview scale'})).toHaveCount(0)
 await expect(page.getByRole('button',{name:/Hat:/})).toHaveCount(0)
 await expect(page.locator('[data-stage="avatar"]')).toContainText('Jordan Lee')
 await expect(page.locator('[data-stage="avatar"]')).not.toContainText('玩家')
 await expect(page.getByRole('contentinfo').getByRole('navigation')).toHaveCount(0)
 for(const [old,name] of [['field','Form'],['bubble','Message'],['message-scroller','Message']]){
  await page.goto(origin+'components/'+old);await expect(page.locator('h1')).toHaveText(name)
 }
 await page.goto(origin);await expect(page.locator('body')).not.toContainText('A little nostalgia. A lot to build.')
 await expect(page.locator('body')).not.toContainText('Real game assets')
})
for(const width of [320,1440])test(`sidebar remains visible at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto(origin+'components/sidebar')
 const stage=page.locator('[data-stage="sidebar"]')
 await expect(stage.locator('[data-slot="sidebar"]')).toHaveAttribute('data-collapsible','none')
 await expect(stage.locator('[data-slot="sidebar-trigger"],[data-slot="sidebar-rail"]')).toHaveCount(0)
 await stage.getByRole('textbox',{name:'Find sidebar worlds'}).fill('Creative')
 await stage.getByRole('button',{name:'Creative',exact:true}).click()
 await expect(page.getByLabel('Sidebar selection')).toHaveText('Creative')
 await page.keyboard.press('Control+b')
 await expect(stage.getByRole('button',{name:'Creative',exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
test('new homepage examples respond to input',async({page})=>{
 await page.goto(origin)
 await page.getByRole('button',{name:'Add $250',exact:true}).click()
 await expect(page.getByLabel('Savings percentage')).toHaveText('70% saved')
 await page.getByRole('textbox',{name:'Product feedback',exact:true}).fill('支持中文反馈')
 await page.getByRole('button',{name:'Save feedback',exact:true}).click()
 await expect(page.getByLabel('Feedback status')).toContainText('saved')
 await page.getByRole('radio',{name:'Annual · $120 / year',exact:true}).check()
 await page.getByRole('button',{name:'Save plan',exact:true}).click()
 await expect(page.getByLabel('Plan status')).toContainText('Annual')
 await page.getByRole('button',{name:'Tuesday, November 3rd, 2026',exact:true}).click()
 await expect(page.getByLabel('Review date')).toHaveText('November 3, 2026')
})
test('message combines history and composition',async({page})=>{
 await page.goto(origin+'components/message')
 await page.getByRole('textbox',{name:'Message text',exact:true}).fill('你好，团队！')
 await page.getByRole('button',{name:'Send',exact:true}).click()
 await expect(page.getByLabel('Message count')).toHaveText('13 messages')
 await expect(page.getByRole('log')).toContainText('你好，团队！')
 await page.getByRole('button',{name:'First',exact:true}).click()
 await page.getByRole('button',{name:'Latest',exact:true}).click()
})
