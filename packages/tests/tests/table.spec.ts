import { test, expect } from "./verified-test";

import { writeFileSync } from "node:fs";

const runtimeErrors=new WeakMap<object,string[]>()

test.beforeEach(({page})=>{const errors:string[]=[];runtimeErrors.set(page,errors);page.on("pageerror",error=>errors.push(error.message))})

test.afterEach(async({page,browser},info)=>{writeFileSync(info.outputPath("runtime.json"),JSON.stringify({pageErrors:runtimeErrors.get(page)??[],browser:browser.version()}));expect(runtimeErrors.get(page)).toEqual([])})

test('Table preserves native table semantics, refs, rich contents and composed interactive controls',async({page})=>{
 await page.goto('/?component=table');await expect(page.getByRole('table',{name:'World statistics'})).toBeVisible();await expect(page.getByRole('columnheader',{name:'World',exact:true})).toBeVisible();await expect(page.getByRole('cell',{name:'23',exact:true})).toBeVisible();await expect(page.getByTestId('rich')).toHaveAttribute('data-kept','yes');await page.getByRole('button',{name:'Join',exact:true}).click();await expect(page.locator('#events')).toHaveText('1');await page.locator('#ref').click();await expect(page.locator('#tag')).toHaveText('TABLE');await expect(page.locator('[data-slot="table-caption"]')).toContainText('World list');await expect(page.locator('[data-slot="table-footer"]')).toContainText('Total worlds: 2')
})

test('Table preserves row callbacks and selected/focused web treatment',async({page})=>{
 await page.goto('/?component=table');const row=page.getByRole('row').filter({has:page.getByRole('cell',{name:'你好，世界',exact:true})});await row.click({position:{x:10,y:10}});await expect(row).toHaveAttribute('data-state','selected');await expect(row).toHaveAttribute('aria-selected','true');await row.focus();expect(await row.evaluate(node=>getComputedStyle(node).outlineColor)).toBe('rgb(255, 255, 255)')
})
