import { test, expect } from "@grasscn/tests/test";
const viewport = '[data-slot="scroll-area-viewport"]';
const bar = '[data-slot="scroll-area-scrollbar"]';
const thumb = '[data-slot="scroll-area-thumb"]';
test("ScrollArea wheel and keyboard scrolling use the browser viewport", async ({ page }) => {
    await page.goto("/?component=scroll-area&height=80&contentHeight=480");
    await expect(page.locator("[data-subject]")).toHaveAttribute("data-mc-scroll-ready", "true");
    await page.locator(viewport).hover();
    await page.mouse.wheel(0, 120);
    await expect.poll(() => page.locator(viewport).evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    await page.locator(viewport).focus();
    await page.keyboard.press("End");
    await expect.poll(() => page.locator(viewport).evaluate(node => node.scrollTop)).toBe(800);
    await page.keyboard.press("Home");
    await expect.poll(() => page.locator(viewport).evaluate(node => node.scrollTop)).toBe(0);
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => page.locator(viewport).evaluate(node => node.scrollTop)).toBeGreaterThan(0);
});
test("ScrollArea thumb dragging and track clicks reach both endpoints", async ({ page }) => {
    await page.addInitScript(() => {
        const state = window as Window & {
            scrollAudioPlays?: number;
        };
        state.scrollAudioPlays = 0;
        HTMLMediaElement.prototype.play = function () { state.scrollAudioPlays!++; return Promise.resolve(); };
    });
    await page.goto("/?component=scroll-area&height=80&contentHeight=480");
    await expect(page.locator("[data-subject]")).toHaveAttribute("data-scrollable", "true");
    const handle = await page.locator(thumb).boundingBox(), track = await page.locator(bar).boundingBox();
    await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
    await page.mouse.down();
    await page.mouse.move(track!.x + track!.width / 2, track!.y + track!.height, { steps: 12 });
    await page.mouse.up();
    await expect.poll(() => page.locator(viewport).evaluate(node => node.scrollTop)).toBe(800);
    await page.mouse.click(track!.x + track!.width / 2, track!.y + 1);
    await expect.poll(() => page.locator(viewport).evaluate(node => node.scrollTop)).toBe(0);
    await expect(page.getByLabel("Pointer events", { exact: true })).toHaveText("2");
    expect(await page.evaluate(() => (window as Window & {
        scrollAudioPlays?: number;
    }).scrollAudioPlays)).toBe(0);
    await page.getByRole("button", { name: "Row 1", exact: true }).click();
    expect(await page.evaluate(() => (window as Window & {
        scrollAudioPlays?: number;
    }).scrollAudioPlays)).toBe(1);
});
test("ScrollArea disables scrolling without changing child controls", async ({ page }) => {
    await page.goto("/?component=scroll-area&height=80&contentHeight=480&state=disabled");
    await expect(page.locator("[data-subject]")).toHaveAttribute("data-scrollable", "true");
    await page.locator(viewport).hover();
    await page.mouse.wheel(0, 120);
    await page.locator(bar).click({ position: { x: 3, y: 100 }, force: true });
    await expect.poll(() => page.locator(viewport).evaluate(node => node.scrollTop)).toBe(0);
    await page.getByRole("button", { name: "Row 1", exact: true }).click();
    await expect(page.getByLabel("Activations", { exact: true })).toHaveText("1");
});
test("ScrollArea reacts to fitting, overflowing and resized content", async ({ page }) => {
    await page.goto("/?component=scroll-area&height=80&contentHeight=24");
    await expect(page.locator(bar)).not.toBeVisible();
    await page.locator("#grow-content").click();
    await expect(page.locator(bar)).toBeVisible();
    await page.locator(viewport).evaluate(node => { node.scrollTop = 800; });
    await page.locator("#shrink-content").click();
    await expect(page.locator(bar)).not.toBeVisible();
    await expect.poll(() => page.locator(viewport).evaluate(node => node.scrollTop)).toBe(0);
    await page.locator("[data-subject]").evaluate(node => { node.style.height = "20px"; });
    await expect(page.locator(bar)).toBeVisible();
});
test("ScrollArea forwards root and viewport refs, custom chrome and asChild", async ({ page }) => {
    await page.goto("/?component=scroll-area&height=80&contentHeight=480&asChild=1&customBar=1");
    await expect(page.locator("section[data-subject]")).toHaveAttribute("data-scrollable", "true");
    await expect(page.locator(bar)).toHaveCount(1);
    await expect(page.getByTestId("custom-scrollbar")).toBeVisible();
    await page.locator("#read-ref").click();
    await expect(page.getByLabel("Root ref", { exact: true })).toHaveText("SECTION/DIV");
});
test("ScrollArea keeps clipped child controls keyboard reachable", async ({ page }) => {
    await page.goto("/?component=scroll-area&height=80&contentHeight=480");
    await page.getByRole("button", { name: "Row 20", exact: true }).focus();
    await expect.poll(() => page.locator(viewport).evaluate(node => node.scrollTop)).toBeGreaterThan(700);
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Activations", { exact: true })).toHaveText("1");
});
