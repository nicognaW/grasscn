import { test, expect } from "@grasscn/tests/test";
test("Tabs switch panels and retain tab/panel associations", async ({ page }) => {
    await page.goto("/?component=tabs");
    const game = page.getByRole("tab", { name: "Game", exact: true }), world = page.getByRole("tab", { name: "World", exact: true });
    await expect(game).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: "Game", exact: true })).toHaveText("Game content");
    await world.click();
    await expect(world).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: "World", exact: true })).toHaveText("World content");
    expect(await world.getAttribute("aria-controls")).toBe(await page.getByRole("tabpanel", { name: "World", exact: true }).getAttribute("id"));
    await expect(page.getByRole("tabpanel", { name: "Game", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Tab changes", { exact: true })).toHaveText("1");
});
test("Tabs keyboard navigation visits disabled tabs without selecting them", async ({ page }) => {
    await page.goto("/?component=tabs&disabledIndex=1");
    await page.getByRole("tab", { name: "Game", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab",{name:"World",exact:true})).toBeFocused();
    await expect(page.getByRole("tab",{name:"Game",exact:true})).toHaveAttribute("aria-selected","true");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "More", exact: true })).toBeFocused();
    await expect(page.getByRole("tab", { name: "More", exact: true })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(page.getByRole("tab", { name: "Game", exact: true })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "More", exact: true })).toBeFocused();
    const disabled = await page.getByRole("tab", { name: "World", exact: true }).boundingBox();
    await page.mouse.click(disabled!.x + disabled!.width / 2, disabled!.y + disabled!.height / 2);
    await expect(page.getByRole("tab", { name: "More", exact: true })).toHaveAttribute("aria-selected", "true");
});
test("Tabs manual activation and RTL navigation follow Base UI behavior", async ({ page }) => {
    await page.goto("/?component=tabs&activationMode=manual&dir=rtl");
    await page.getByRole("tab", { name: "Game", exact: true }).focus();
    await page.keyboard.press("ArrowLeft");
    const world = page.getByRole("tab", { name: "World", exact: true });
    await expect(world).toBeFocused();
    await expect(world).toHaveAttribute("aria-selected", "false");
    await page.keyboard.press("Enter");
    await expect(world).toHaveAttribute("aria-selected", "true");
});
test("Tabs controlled value supports user and external changes", async ({ page }) => {
    await page.goto("/?component=tabs&controlled=1");
    await page.getByRole("tab", { name: "World", exact: true }).click();
    await expect(page.getByLabel("Selected tab", { exact: true })).toHaveText("tab-1");
    const changes = await page.getByLabel("Tab changes", { exact: true }).textContent();
    await page.locator("#select-last-tab").click();
    await expect(page.getByRole("tab", { name: "More", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Tab changes", { exact: true })).toHaveText(changes!);
});
test("Tabs Root/List/Trigger/Content retain refs and asChild composition", async ({ page }) => {
    await page.goto("/?component=tabs&asChild=1&listAsChild=1&triggerAsChild=1");
    await expect(page.locator("section.mc-tabs nav[role=tablist] a[role=tab]")).toBeVisible();
    await page.locator("#read-ref").click();
    await expect(page.getByLabel("Root ref", { exact: true })).toHaveText("SECTION/NAV/A/DIV");
    await page.getByRole("tab", { name: "World", exact: true }).click();
    await expect(page.getByRole("tabpanel", { name: "World", exact: true })).toBeVisible();
});
test("Tabs play one original click only for accepted selection changes", async ({ page }) => {
    await page.addInitScript(() => {
        const state = window as Window & {
            tabAudio?: number;
        };
        state.tabAudio = 0;
        HTMLMediaElement.prototype.play = function () { state.tabAudio!++; return Promise.resolve(); };
    });
    await page.goto("/?component=tabs&controlled=1");
    const sounds = () => page.evaluate(() => (window as Window & {
        tabAudio?: number;
    }).tabAudio);
    await page.getByRole("tab", { name: "World", exact: true }).hover();
    expect(await sounds()).toBe(0);
    await page.getByRole("tab", { name: "World", exact: true }).click();
    await expect.poll(sounds).toBe(1);
    await page.getByRole("tab", { name: "World", exact: true }).click();
    expect(await sounds()).toBe(1);
    await page.keyboard.press("ArrowRight");
    await expect.poll(sounds).toBe(2);
    await page.locator("#select-last-tab").click();
    expect(await sounds()).toBe(2);
    await page.goto("/?component=tabs&controlled=1&reject=1");
    await page.getByRole("tab", { name: "World", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Game", exact: true })).toHaveAttribute("aria-selected", "true");
    expect(await sounds()).toBe(0);
});
