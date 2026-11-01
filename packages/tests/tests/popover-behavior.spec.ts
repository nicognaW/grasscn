import { test, expect } from "./verified-test";
import { minecraftClickSound } from "../../../apps/web/registry/ui/minecraft-sound-assets";
test("Popover opens from the keyboard, names its dialog and restores focus", async ({ page }) => {
    await page.goto("/?component=popover");
    const trigger = page.getByRole("button", { name: "Open popover", exact: true });
    await trigger.focus();
    await trigger.press("Enter");
    const dialog = page.getByRole("dialog", { name: "World Settings", exact: true });
    await expect(dialog).toHaveAccessibleDescription("Configure the world.");
    await expect(dialog.getByRole("textbox", { name: "World name" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.getByLabel("Popover changes", { exact: true })).toHaveText("2");
});
test("Popover outside interaction dismisses without activating an action", async ({ page }) => {
    await page.goto("/?component=popover&open");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Outside", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByLabel("Popover actions", { exact: true })).toHaveText("0");
});
test("Popover preserves prevented Escape and outside interactions", async ({ page }) => {
    await page.goto("/?component=popover&open&preventEscape&preventOutside");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Outside", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Popover changes", { exact: true })).toHaveText("0");
});
test("Popover controlled state may reject opening and closing", async ({ page }) => {
    await page.goto("/?component=popover&controlled&reject");
    await page.getByRole("button", { name: "Open popover", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByLabel("Popover changes", { exact: true })).toHaveText("1");
    await page.goto("/?component=popover&controlled&reject&open");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Popover changes", { exact: true })).toHaveText("1");
});
test("Popover disabled trigger remains silent and closed", async ({ page }) => {
    await page.goto("/?component=popover&disabled");
    const trigger = page.getByRole("button", { name: "Open popover", exact: true });
    await expect(trigger).toBeDisabled();
    await trigger.dispatchEvent("click");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByLabel("Popover changes", { exact: true })).toHaveText("0");
});
test("Popover forwards native refs and submits interactive CJK form content once", async ({ page }) => {
    await page.goto("/?component=popover&controlled");
    const trigger = page.getByRole("button", { name: "Open popover", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Inspect popover refs", exact: true }).click();
    await expect(page.getByLabel("Popover refs", { exact: true })).toHaveText("BUTTON,DIV");
    await dialog.getByRole("textbox", { name: "World name" }).fill("你好，世界");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByLabel("Popover actions", { exact: true })).toHaveText("1");
    await expect(trigger).toBeFocused();
});
test("Modal Popover traps keyboard focus inside interactive content", async ({ page }) => {
    await page.goto("/?component=popover&modal&open");
    const dialog = page.getByRole("dialog");
    const first = dialog.getByRole("textbox", { name: "World name" });
    const last = dialog.getByRole("button", { name: "Inspect popover refs", exact: true });
    await expect(first).toBeFocused();
    await first.press("Shift+Tab");
    await expect(last).toBeFocused();
    await last.press("Tab");
    await expect(first).toBeFocused();
});
for (const side of ["top", "right", "bottom", "left"] as const) {
    for (const align of ["start", "center", "end"] as const) {
        test(`Popover anchors on ${side} with ${align} alignment`, async ({ page }) => {
            await page.goto(`/?component=popover&native=1&scale=2&width=80&height=40&x=200&y=150&side=${side}&align=${align}`);
            const content = page.getByRole("dialog", { name: "Test popover", exact: true });
            await expect(content).toHaveAttribute("data-mc-popover-ready", "true");
            await expect(content).toHaveAttribute("data-side", side);
            await expect(content).toHaveAttribute("data-align", align);
            const bounds = (await content.boundingBox())!;
            const anchorX = 400, anchorY = 300;
            const offset = align === "start" ? 0 : align === "center" ? .5 : 1;
            if (side === "top" || side === "bottom") {
                expect(bounds.x + bounds.width * offset).toBeCloseTo(anchorX, 0);
                expect(side === "top" ? bounds.y + bounds.height : bounds.y).toBeCloseTo(anchorY, 0);
            }
            else {
                expect(bounds.y + bounds.height * offset).toBeCloseTo(anchorY, 0);
                expect(side === "left" ? bounds.x + bounds.width : bounds.x).toBeCloseTo(anchorX, 0);
            }
        });
    }
}
test("Popover collision handling keeps its surface inside a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 360 });
    await page.goto("/?component=popover&native=1&scale=2&width=160&height=80&x=230&y=170&side=bottom&align=start");
    const content = page.getByRole("dialog", { name: "Test popover", exact: true });
    await expect(content).toHaveAttribute("data-mc-popover-ready", "true");
    const bounds = (await content.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(480);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(360);
    await expect(content).toHaveAttribute("data-side", "top");
});
test("Popover asChild preserves the trigger, content, anchor, refs and form", async ({ page }) => {
    await page.goto("/?component=popover-composition");
    const trigger = page.getByRole("button", { name: "Composed trigger", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "World Settings", exact: true });
    await expect(dialog).toHaveAccessibleDescription("Configure the world.");
    await expect(dialog).toHaveAttribute("id", "composed-popover");
    await expect(dialog).toHaveAttribute("data-side", "bottom");
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.x).toBe(240);
    expect(bounds.y).toBe(204);
    expect(await page.locator('[data-slot="popover-trigger"]').count()).toBe(1);
    await dialog.getByRole("button", { name: "Inspect composition refs", exact: true }).click();
    await expect(page.getByLabel("Composition refs", { exact: true })).toHaveText("BUTTON,SECTION,DIV");
    await dialog.getByRole("textbox", { name: "World name" }).fill("こんにちは世界");
    await dialog.getByRole("button", { name: "Save composition", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByLabel("Composition actions", { exact: true })).toHaveText("1");
    await expect(trigger).toBeFocused();
});
test("Popover buttons play the original click once; hover, focus and Escape stay silent", async ({ page }) => {
    await page.addInitScript(() => {
        (window as any).__popoverSounds = [];
        HTMLMediaElement.prototype.play = function () {
            (window as any).__popoverSounds.push({ source: this.src, volume: this.volume, rate: this.playbackRate });
            return Promise.resolve();
        };
    });
    const voices = () => page.evaluate(() => (window as any).__popoverSounds);
    await page.goto("/?component=popover");
    const trigger = page.getByRole("button", { name: "Open popover", exact: true });
    await trigger.hover();
    await trigger.focus();
    expect(await voices()).toEqual([]);
    await trigger.press("Enter");
    expect(await voices()).toEqual([{ source: minecraftClickSound, volume: .25, rate: 1 }]);
    await page.keyboard.press("Escape");
    expect(await voices()).toHaveLength(1);
    await page.goto("/?component=popover-composition");
    await page.getByRole("button", { name: "Composed trigger", exact: true }).click();
    expect(await voices()).toEqual([{ source: minecraftClickSound, volume: .25, rate: 1 }]);
    await page.keyboard.press("Escape");
    expect(await voices()).toHaveLength(1);
});
