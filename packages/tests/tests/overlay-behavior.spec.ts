import { test, expect } from "./verified-test";
import { minecraftClickSound } from "../../../apps/web/registry/ui/minecraft-sound-assets";
for (const component of ["sheet", "drawer"]) {
    test(`${component} preserves keyboard dismissal, accessible text, CJK input and close focus`, async ({ page }) => {
        await page.goto(`/?component=${component}`);
        const trigger = page.getByRole("button", { name: "Open panel", exact: true });
        await trigger.focus();
        await page.keyboard.press("Enter");
        const panel = page.getByRole("dialog", { name: "World settings 世界", exact: true });
        await expect(panel).toBeVisible();
        await expect(panel).toHaveAccessibleDescription("Settings 第二行");
        for (const text of await panel.locator('[data-mc-label-layout-ready]').all())
            await expect(text).toHaveAttribute('data-mc-label-layout-ready', 'true');
        const input = panel.getByRole("textbox", { name: "World name", exact: true });
        await input.fill("你好，世界");
        await expect(input).toHaveValue("你好，世界");
        await expect(input).toHaveAttribute("spellcheck", "false");
        await panel.getByRole("button", { name: "Save", exact: true }).click();
        await expect(page.locator("#count")).toHaveText("1");
        await page.keyboard.press("Escape");
        await expect(panel).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await trigger.click();
        await panel.getByRole("button", { name: "Cancel", exact: true }).click();
        await expect(panel).toHaveCount(0);
        await expect(trigger).toBeFocused();
    });
    test(`${component} supports every viewport edge`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        for (const side of ["top", "right", "bottom", "left"]) {
            await page.goto(`/?component=${component}&side=${side}&open=1`);
            const panel = page.getByRole("dialog");
            await expect(panel).toBeVisible();
            await expect.poll(async () => { const r = (await panel.boundingBox())!; return Math.round(side === "top" ? r.y : side === "bottom" ? r.y + r.height : side === "left" ? r.x : r.x + r.width); }).toBe(side === "bottom" ? 900 : side === "right" ? 1280 : 0);
        }
    });
    test(`${component} retains controlled state, disabled trigger and forwarded ref`, async ({ page }) => {
        await page.goto(`/?component=${component}&controlled=1&asChild=1`);
        await page.getByRole("button", { name: "Open panel", exact: true }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.locator("#read-ref").evaluate((n: HTMLButtonElement) => n.click());
        await expect(page.locator("#ref-tag")).toHaveText("DIV");
        await page.locator("#external").evaluate((n: HTMLButtonElement) => n.click());
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await page.goto(`/?component=${component}&disabled=1`);
        await expect(page.getByRole("button", { name: "Open panel", exact: true })).toBeDisabled();
        await expect(page.getByRole("dialog")).toHaveCount(0);
    });
    test(`${component} traps modal focus and allows content scrolling`, async ({ page }) => {
        await page.goto(`/?component=${component}&open=1&scroll=1`);
        const panel = page.getByRole("dialog");
        await expect(panel).toBeVisible();
        await panel.getByRole("textbox").focus();
        for (let i = 0; i < 8; i++) {
            await page.keyboard.press("Tab");
            expect(await panel.evaluate(n => n.contains(document.activeElement))).toBe(true);
        }
        expect(await panel.evaluate(n => n.scrollHeight > n.clientHeight)).toBe(true);
        await panel.evaluate(n => n.scrollTop = 100);
        expect(await panel.evaluate(n => n.scrollTop)).toBeGreaterThan(0);
    });
    test(`${component} uses original click audio for native actions and stays silent on hover`, async ({ page }) => {
        await page.addInitScript(() => { (window as any).sounds = []; HTMLMediaElement.prototype.play = function () { (window as any).sounds.push({ source: this.src, volume: this.volume, rate: this.playbackRate }); return Promise.resolve(); }; });
        await page.goto(`/?component=${component}`);
        const trigger = page.getByRole("button", { name: "Open panel", exact: true });
        await trigger.hover();
        expect(await page.evaluate(() => (window as any).sounds)).toEqual([]);
        await trigger.click();
        await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
        expect(await page.evaluate(() => (window as any).sounds)).toEqual(Array.from({ length: 2 }, () => ({ source: minecraftClickSound, volume: .25, rate: 1 })));
    });
}
test("Alert retains alert semantics, original text layout, refs and consumer interaction", async ({ page }) => {
    await page.goto("/?component=alert&label=World%20Settings&text=Hello%20Minecraft");
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("World Settings");
    await alert.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.locator("#count")).toHaveText("1");
    await page.locator("#read-ref").click();
    await expect(page.locator("#ref-tag")).toHaveText("DIV");
    await page.goto("/?component=alert&label=你好世界&text=第二行");
    for (const line of await page.getByRole("alert").locator('[data-mc-label-layout-ready]').all())
        await expect(line).toHaveAttribute("data-mc-label-layout-ready", "true");
});
test("Drawer dismisses through Base UI swipe details", async ({ page }) => {
    await page.goto("/?component=drawer&side=bottom&open=1");
    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();

    const bounds = (await panel.boundingBox())!;
    await page.mouse.move(bounds.x + 8, bounds.y + 8);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 8, bounds.y + bounds.height * .8, { steps: 12 });
    await page.mouse.up();
    await expect.poll(async () => Number(await page.locator("#drags").textContent())).toBeGreaterThan(0);
    await expect.poll(async () => Number(await page.locator("#releases").textContent())).toBeGreaterThan(0);
    await expect(panel).toHaveCount(0);
});
test("Drawer supports controlled Base UI snap points", async ({ page }) => {
    await page.goto("/?component=drawer&side=bottom&open=1&snap=1");
    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();
    await expect(page.locator("#snap")).toHaveText("0.5");
    await expect.poll(async () => Math.round((await panel.boundingBox())!.y)).toBe(450);
    await panel.locator("#snap-next").evaluate((node: HTMLButtonElement) => node.click());
    await expect(page.locator("#snap")).toHaveText("1");
    await expect.poll(async () => Math.round((await panel.boundingBox())!.y)).toBe(0);
});
