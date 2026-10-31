import { test, expect } from "./verified-test";
import { minecraftClickSound } from "../registry/ui/minecraft-sound-assets";
const content = '[data-slot="hover-card-content"]';
test("Hover Card respects opening and closing delays and permits entering its content", async ({ page }) => {
    await page.clock.install();
    await page.goto("/?component=hover-card&delay=500&closeDelay=300");
    await page.getByRole("link", { name: "World info", exact: true }).hover();
    await page.clock.runFor(400);
    await expect(page.locator(content)).toHaveCount(0);
    await page.clock.runFor(150);
    await expect(page.locator(content)).toBeVisible();
    await page.locator(content).hover();
    await page.clock.runFor(1000);
    await expect(page.locator(content)).toBeVisible();
    await page.mouse.move(1200, 800);
    await page.clock.runFor(250);
    await expect(page.locator(content)).toBeVisible();
    await page.clock.runFor(100);
    await expect(page.locator(content)).toHaveCount(0);
});
test("Hover Card opens on keyboard focus without moving focus and dismisses on Escape", async ({ page }) => {
    await page.goto("/?component=hover-card&rich");
    const trigger = page.getByRole("link", { name: "World info", exact: true });
    await trigger.focus();
    await expect(page.locator(content)).toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("link", { name: "Read world guide", exact: true })).toHaveAttribute("tabindex", "-1");
    await page.keyboard.press("Escape");
    await expect(page.locator(content)).toHaveCount(0);
    await expect(trigger).toBeFocused();
});
test("Hover Card controlled state may reject open and close requests", async ({ page }) => {
    await page.goto("/?component=hover-card&controlled&reject");
    await page.getByRole("link", { name: "World info", exact: true }).hover();
    await expect(page.getByLabel("Hover changes", { exact: true })).toHaveText("1");
    await expect(page.locator(content)).toHaveCount(0);
    await page.goto("/?component=hover-card&controlled&reject&open");
    await expect(page.locator(content)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(content)).toBeVisible();
    await expect(page.getByLabel("Hover changes", { exact: true })).toHaveText("1");
});
test("Hover Card preserves prevented Escape and outside-pointer dismissal", async ({ page }) => {
    await page.goto("/?component=hover-card&open&preventEscape&preventOutside&closeDelay=10000");
    await expect(page.locator(content)).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Read hover refs", exact: true }).click();
    await expect(page.locator(content)).toBeVisible();
    await expect(page.getByLabel("Hover changes", { exact: true })).toHaveText("0");
});
test("Hover Card asChild preserves anchors, articles, refs, links and CJK forms", async ({ page }) => {
    await page.goto("/?component=hover-card&controlled&open&rich&triggerAsChild&contentAsChild&preventOutside&closeDelay=10000");
    const panel = page.locator(content);
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("data-composed-content", "true");
    await expect(page.locator('[data-slot="hover-card-trigger"]')).toHaveAttribute("data-composed-trigger", "true");
    await page.getByRole("button", { name: "Read hover refs", exact: true }).click();
    await expect(page.getByLabel("Hover refs", { exact: true })).toHaveText("A,ARTICLE");
    await panel.getByRole("link", { name: "Read world guide", exact: true }).click();
    await expect(page.getByLabel("Hover links", { exact: true })).toHaveText("1");
    await panel.getByRole("textbox", { name: "World name", exact: true }).fill("我的世界");
    await panel.getByRole("button", { name: "Save hover settings", exact: true }).click();
    await expect(page.getByLabel("Hover actions", { exact: true })).toHaveText("1");
    await expect(panel).toHaveCount(0);
});
test("Hover Card retains selectable source text and stays open while selection is held", async ({ page }) => {
    const text = "Select this Minecraft text.";
    await page.goto(`/?${new URLSearchParams({ component: "hover-card", text, closeDelay: "100" })}`);
    await page.getByRole("link", { name: "World info", exact: true }).hover();
    const plane = page.locator(`${content} .mc-hover-card-selectable`);
    await expect(plane).toHaveText(text);
    const bounds = (await plane.boundingBox())!;
    await page.mouse.move(bounds.x + 1, bounds.y + 4);
    await page.mouse.down();
    await plane.evaluate(node => {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
    });
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe(text);
    expect(await plane.evaluate(node => ({ color: getComputedStyle(node, "::selection").color, background: getComputedStyle(node, "::selection").backgroundColor }))).toEqual({ color: "rgb(0, 0, 255)", background: "rgb(255, 255, 255)" });
    await page.mouse.move(1200, 800);
    await page.waitForTimeout(300);
    await expect(page.locator(content)).toBeVisible();
});
test("Hover Card hover, focus and dismissal stay silent; its native button clicks once", async ({ page }) => {
    await page.addInitScript(() => {
        (window as any).__hoverSounds = [];
        HTMLMediaElement.prototype.play = function () {
            (window as any).__hoverSounds.push({ source: this.src, volume: this.volume, rate: this.playbackRate });
            return Promise.resolve();
        };
    });
    const voices = () => page.evaluate(() => (window as any).__hoverSounds);
    await page.goto("/?component=hover-card&rich&closeDelay=10000");
    const trigger = page.getByRole("link", { name: "World info", exact: true });
    await trigger.hover();
    await trigger.focus();
    await expect(page.locator(content)).toBeVisible();
    expect(await voices()).toEqual([]);
    await page.locator(content).getByRole("button", { name: "Save hover settings", exact: true }).click();
    expect(await voices()).toEqual([{ source: minecraftClickSound, volume: .25, rate: 1 }]);
    await page.keyboard.press("Escape");
    expect(await voices()).toHaveLength(1);
});
for (const [side, x, y] of [["top", 50, 2], ["right", 104, 80], ["bottom", 50, 196], ["left", 2, 80]] as const) {
    test(`Hover Card wraps and resolves ${side} collisions on a narrow viewport`, async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 600 });
        await page.goto(`/?${new URLSearchParams({ component: "hover-card", native: "1", scale: "3", x: String(x), y: String(y), side, text: "Use this item to explore the world and find new adventures." })}`);
        const panel = page.locator(content);
        await expect(panel).toHaveAttribute("data-mc-hover-card-ready", "true");
        await expect.poll(async () => {
            const box = (await panel.boundingBox())!;
            return box.x >= 0 && box.y >= 0 && box.x + box.width <= 320 && box.y + box.height <= 600;
        }).toBe(true);
    });
}
