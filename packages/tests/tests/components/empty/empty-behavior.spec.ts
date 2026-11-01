import {test,expect} from "@grasscn/tests/test"
test("Empty keeps scalar native-row text, CJK rendering, refs and events",async({page})=>{
 await page.goto('/?component=empty&native=1&text=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E4%B8%96%E7%95%8C&width=200&height=41');const subject=page.locator('[data-subject]');await expect(subject).toHaveAttribute('data-mc-empty-native','true');await expect(subject.locator('[data-mc-label-layout-ready]')).toHaveAttribute('data-mc-label-layout-ready','true');for(const line of await subject.locator('[data-mc-label-ready]').all())await expect(line).toHaveAttribute('data-mc-label-ready','true');await subject.click();await expect(page.locator('#events')).toHaveText('1');await page.locator('#read-ref').click();await expect(page.locator('#tag')).toHaveText('DIV')
})
test("Empty supports Header, Media, Title, Description and Content composition",async({page})=>{
 await page.goto('/?component=empty');await expect(page.locator('[data-slot=empty-header]')).toHaveCount(1);await expect(page.locator('[data-slot=empty-media] [data-testid=media]')).toHaveText('*');await expect(page.locator('[data-slot=empty-title]')).toContainText('No worlds found');await expect(page.locator('[data-slot=empty-description]')).toContainText('Create a world to begin your adventure.');const action=page.getByRole('button',{name:'Create world',exact:true});await expect(action.locator('xpath=..')).toHaveAttribute('data-slot','empty-content');await action.focus();await page.keyboard.press('Enter');await expect(page.locator('#events')).toHaveText('1')
})
test("Empty slots preserve real multiline and accessible content",async({page})=>{
 const text='Hello 世界\nこんにちは\n안녕하세요';await page.goto(`/?component=empty&native=1&part=description&text=${encodeURIComponent(text)}&wrapWidth=120`);const subject=page.locator('[data-subject]');await expect(subject).toHaveAttribute('data-mc-label-layout-ready','true');await expect(subject.locator('.mc-label-line')).toHaveCount(3);await expect(subject).toContainText(text)
})
test("Empty static surfaces do not synthesize interaction sounds",async({page})=>{
 await page.addInitScript(()=>{(window as any).sounds=[];HTMLMediaElement.prototype.play=function(){(window as any).sounds.push(this.src);return Promise.resolve()}});await page.goto('/?component=empty&native=1&text=No%20worlds%20found');await page.locator('[data-subject]').hover();await page.locator('[data-subject]').click();expect(await page.evaluate(()=>(window as any).sounds)).toEqual([])
})
