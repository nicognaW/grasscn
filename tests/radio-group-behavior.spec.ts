import { test, expect, type Page, type Locator } from "./verified-test";
import { minecraftClickSound } from "../registry/ui/minecraft-sound-assets";
async function arrow(page: Page, key: string, target: Locator) {
    // Verify selection while the arrow-key interaction is active.
    await page.keyboard.down(key);
    try {
        await expect(target).toBeChecked();
    }
    finally {
        await page.keyboard.up(key);
    }
}
test("Radio Group supports none/one selected and cannot uncheck the selected item", async ({ page }) => {
    await page.goto("/?component=radio-group&none=1");
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    const survival = page.getByRole("radio", { name: "survival", exact: true });
    await survival.click();
    await survival.click();
    await expect(survival).toBeChecked();
    await expect(page.getByLabel("Radio changes", { exact: true })).toHaveText("1");
    await page.getByRole("radio", { name: "adventure", exact: true }).click();
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
    await expect(page.getByLabel("Radio value", { exact: true })).toHaveText("adventure");
    await expect(survival).not.toBeChecked();
});
test("Radio Group arrow navigation skips disabled items and wraps", async ({ page }) => {
    await page.goto("/?component=radio-group&disabledIndex=1");
    await expect(page.getByRole("radio", {name:"survival",exact:true})).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("radio", { name: "survival", exact: true })).toBeFocused();
    await arrow(page, "ArrowDown", page.getByRole("radio", { name: "adventure", exact: true }));
    await arrow(page, "ArrowDown", page.getByRole("radio", { name: "spectator", exact: true }));
    await arrow(page, "ArrowDown", page.getByRole("radio", { name: "survival", exact: true }));
});
test("Radio Group preserves native RTL navigation and wrapping", async ({ page }) => {
    await page.goto("/?component=radio-group&dir=rtl");
    await page.getByRole("radio", { name: "survival", exact: true }).focus();
    await arrow(page, "ArrowRight", page.getByRole("radio", { name: "spectator", exact: true }));
    await arrow(page, "ArrowLeft", page.getByRole("radio", { name: "survival", exact: true }));
});

test("Radio Group preserves controlled acceptance, rejection and external updates", async ({ page }) => {
    await page.goto("/?component=radio-group&controlled=1");
    await page.getByRole("radio", { name: "creative", exact: true }).click();
    await expect(page.getByRole("radio", { name: "creative", exact: true })).toBeChecked();
    await page.locator("#radio-external").click();
    await expect(page.getByRole("radio", { name: "adventure", exact: true })).toBeChecked();
    await expect(page.getByLabel("Radio changes", { exact: true })).toHaveText("1");
    await page.goto("/?component=radio-group&controlled=1&reject=1");
    await page.getByRole("radio", { name: "adventure", exact: true }).click();
    await expect(page.getByRole("radio", { name: "survival", exact: true })).toBeChecked();
    await expect(page.getByLabel("Radio changes", { exact: true })).toHaveText("1");
});
test("Radio Group keeps required form behavior and excludes disabled groups", async ({ page }) => {
    await page.goto("/?component=radio-group&none=1&form=1&required=1");
    await page.getByRole("button", { name: "Save mode", exact: true }).click();
    await expect(page.getByLabel("Submitted radio", { exact: true })).toHaveText("");
    await page.getByRole("radio", { name: "creative", exact: true }).click();
    await page.getByRole("button", { name: "Save mode", exact: true }).click();
    await expect(page.getByLabel("Submitted radio", { exact: true })).toHaveText("creative");
    await page.goto("/?component=radio-group&rootDisabled=1&form=1");
    for (const radio of await page.getByRole("radio").all())
        await expect(radio).toBeDisabled();
    await page.getByRole("button", { name: "Save mode", exact: true }).click();
    await expect(page.getByLabel("Submitted radio", { exact: true })).toHaveText("missing");
});
test("Radio Group forwards refs, supports asChild and keeps disabled anchors inert", async ({ page }) => {
    await page.goto("/?component=radio-group&rootAsChild=1&itemAsChild=1");
    await page.locator("#radio-read-refs").click();
    await expect(page.getByLabel("Radio refs", { exact: true })).toHaveText("FIELDSET/BUTTON");
    await page.getByRole("radio", { name: "adventure", exact: true }).click();
    await expect(page.getByRole("radio", { name: "adventure", exact: true })).toBeChecked();
    await page.goto("/?component=radio-group&rootDisabled=1&itemAsChild=1&anchor=1");
    const adventure = page.getByRole("radio", { name: "adventure", exact: true });
    await expect(adventure).toBeDisabled();
    await adventure.dispatchEvent("click");
    await expect(adventure).not.toBeChecked();
    await expect(page.getByLabel("Radio changes", { exact: true })).toHaveText("0");
    await expect(page.getByLabel("Radio events", { exact: true })).toHaveText("0");
});
test("Radio Group uses original click audio per activation and respects preventDefault", async ({ page }) => {
    await page.addInitScript(() => {
        ;
        (window as any).radioSounds = [];
        HTMLMediaElement.prototype.play = function () { (window as any).radioSounds.push({ source: this.src, volume: this.volume, rate: this.playbackRate }); return Promise.resolve(); };
    });
    const sounds = () => page.evaluate(() => (window as any).radioSounds);
    await page.goto("/?component=radio-group");
    const survival = page.getByRole("radio", { name: "survival", exact: true });
    await survival.hover();
    await survival.focus();
    expect(await sounds()).toEqual([]);
    await survival.click();
    expect(await sounds()).toEqual([{ source: minecraftClickSound, volume: .25, rate: 1 }]);
    await page.getByRole("radio", { name: "adventure", exact: true }).click();
    await arrow(page, "ArrowUp", page.getByRole("radio", { name: "creative", exact: true }));
    await expect.poll(sounds).toHaveLength(3);
    await page.keyboard.press("Enter");
    expect(await sounds()).toHaveLength(3);
    await page.keyboard.press("Space");
    await expect.poll(sounds).toHaveLength(4);
    await page.goto("/?component=radio-group&rootDisabled=1");
    await page.getByRole("radio", { name: "adventure", exact: true }).dispatchEvent("click");
    expect(await sounds()).toEqual([]);
    await page.goto("/?component=radio-group&prevent=1");
    await page.getByRole("radio", { name: "adventure", exact: true }).click();
    await expect(page.getByLabel("Radio changes", { exact: true })).toHaveText("0");
    await expect(page.getByLabel("Radio events", { exact: true })).toHaveText("1");
    expect(await sounds()).toEqual([]);
});
