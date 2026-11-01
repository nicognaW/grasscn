import { test, expect } from './verified-test';

import path from 'node:path';

test.use({launchOptions:{args:['--disable-gpu','--disable-extensions','--disable-background-networking']}})

test('advancement tree selection, keyboard, details and panning',async({page})=>{
 await page.goto((process.env.GRASSCN_TREE_INSTALLED_URL??'http://127.0.0.1:5174/adventure.html')+'?scale=2&mask=1')
 const tree=page.getByRole('group',{name:'Advancement tree'}),first=page.getByRole('button',{name:'Milestone 0, completed',exact:true})
 await first.hover();await expect(page.locator('[data-slot="tooltip-content"]')).toContainText('Milestone 0')
 await first.click();await expect(first).toHaveAttribute('aria-pressed','true')
 await first.press('ArrowRight');await expect(page.getByRole('button',{name:'Milestone 1',exact:true})).toBeFocused()
 await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Milestone 1',exact:true})).toHaveAttribute('aria-pressed','true')
 await tree.focus();const plane=page.locator('.mc-advancement-plane'),before=await plane.getAttribute('style');await tree.press('ArrowRight');expect(await plane.getAttribute('style')).not.toEqual(before)
 await tree.press('Home');expect(await plane.getAttribute('style')).toEqual(before)
 const box=(await tree.boundingBox())!;await page.mouse.move(box.x+10,box.y+10);await page.mouse.down();await page.mouse.move(box.x+40,box.y+30,{steps:4});await page.mouse.up();expect(await plane.getAttribute('style')).not.toEqual(before)
})

test('advancement roadmap is available in the local website',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5176/components/advancement-tree')
 await expect(page.getByRole('heading',{name:'Advancement Tree',exact:true})).toBeVisible()
 await expect(page.getByRole('group',{name:'Release roadmap'})).toBeVisible()
 await page.getByRole('button',{name:'Mark incomplete',exact:true}).click()
 await expect(page.getByRole('button',{name:'Plan',exact:true})).toHaveAttribute('data-completed','false')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:info.outputPath('advancement-tree-preview.png'),fullPage:false})
 expect(errors).toEqual([])
})
