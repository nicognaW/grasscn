import { test, expect } from "./verified-test";
import { minecraftClickSound } from "../../../apps/web/registry/ui/minecraft-sound-assets";
const base = "/?component=toggle-group";
test("Toggle Group single selection and deselection", async ({ page }) => {
    await page.goto(base);
    const one = page.getByRole('button', { name: 'Filter one' }), two = page.getByRole('button', { name: 'Filter two' });
    await one.click();
    await expect(one).toHaveAttribute('aria-pressed', 'true');
    await two.click();
    await expect(one).not.toHaveAttribute('aria-pressed', 'true');
    await expect(two).toHaveAttribute('aria-pressed', 'true');
    await two.click();
    await expect(two).not.toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#events')).toHaveText('3');
});
test("Toggle Group multiple preserves independent pressed values", async ({ page }) => {
    await page.goto(`${base}&type=multiple`);
    const one = page.getByRole('button', { name: 'Filter one' }), two = page.getByRole('button', { name: 'Filter two' });
    await one.click();
    await two.click();
    await expect(one).toHaveAttribute('aria-pressed', 'true');
    await expect(two).toHaveAttribute('aria-pressed', 'true');
    await one.click();
    await expect(one).toHaveAttribute('aria-pressed', 'false');
    await expect(two).toHaveAttribute('aria-pressed', 'true');
});
test("Toggle Group roving keyboard focus supports RTL and vertical layout", async ({ page }) => {
    for (const [extra, key] of [['', 'ArrowRight'], ['&dir=rtl', 'ArrowLeft'], ['&orientation=vertical', 'ArrowDown']]) {
        await page.goto(base + extra);
        const one = page.locator('[data-subject]'), two = page.locator('#item-two');
        await one.focus();
        await page.keyboard.press(key);
        await expect(two).toBeFocused();
        await page.keyboard.press('Space');
        await expect(two).toHaveAttribute('aria-pressed', 'true');
        await page.keyboard.press('End');
        await expect(page.locator('#item-three')).toBeFocused();
        await page.keyboard.press('Home');
        await expect(one).toBeFocused();
    }
});
test("Toggle Group skips disabled items and obeys no-loop", async ({ page }) => {
    await page.goto(`${base}&disabledItem=two&noLoop=1`);
    await page.locator('[data-subject]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#item-three')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#item-three')).toBeFocused();
});
test("Toggle Group supports controlled external values and rejected updates", async ({ page }) => {
    for (const type of ['single', 'multiple']) {
        await page.goto(`${base}&controlled=1&type=${type}`);
        await page.locator('#external').click();
        await expect(page.locator('#item-two')).toHaveAttribute('data-pressed', '');
        await page.locator('[data-subject]').click();
        await expect(page.locator('[data-subject]')).toHaveAttribute('data-pressed', '');
    }
    await page.goto(`${base}&controlled=1&reject=1`);
    await page.locator('[data-subject]').click();
    await expect(page.locator('[data-subject]')).not.toHaveAttribute('data-pressed');
    await expect(page.locator('#events')).toHaveText('1');
});
test("Toggle Group cancelled activation and disabled roots remain unchanged", async ({ page }) => {
    for (const extra of ['cancel=1', 'state=disabled', 'state=disabled&asChild=1']) {
        await page.goto(`${base}&${extra}`);
        await page.locator('[data-subject]').dispatchEvent('click');
        await expect(page.locator('[data-subject]')).not.toHaveAttribute('data-pressed');
        await expect(page.locator('#events')).toHaveText('0');
    }
});
test("Toggle Group retains composed children, refs and accessible names", async ({ page }) => {
    await page.goto(`${base}&asChild=1&text=Hello%20世界`);
    await expect(page.locator('[data-subject]')).toContainText('Hello 世界');
    await page.locator('[data-subject]').click();
    await expect(page.locator('[data-subject]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#read-ref').click();
    await expect(page.locator('#tag')).toHaveText('DIV/A');
});
test("Toggle Group uses original click audio and silent focus navigation", async ({ page }) => {
    await page.addInitScript(() => { (window as any).sounds = []; HTMLMediaElement.prototype.play = function () { (window as any).sounds.push({ source: this.src, volume: this.volume, rate: this.playbackRate }); return Promise.resolve(); }; });
    await page.goto(base);
    await page.locator('[data-subject]').hover();
    await page.locator('[data-subject]').focus();
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => (window as any).sounds)).toEqual([]);
    await page.keyboard.press('Space');
    expect(await page.evaluate(() => (window as any).sounds)).toEqual([{ source: minecraftClickSound, volume: .25, rate: 1 }]);
    for (const extra of ['cancel=1', 'state=disabled', 'state=disabled&asChild=1']) {
        await page.goto(`${base}&${extra}`);
        await page.locator('[data-subject]').dispatchEvent('click');
        expect(await page.evaluate(() => (window as any).sounds)).toEqual([]);
    }
});
