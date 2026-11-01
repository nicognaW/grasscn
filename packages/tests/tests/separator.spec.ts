import { test, expect } from "./verified-test";

test("Separator preserves decorative semantics and stays out of the tab order", async ({ page }) => {
    await page.goto("/?component=separator");
    await expect(page.locator("[data-subject]")).toHaveAttribute("role", "none");
    await expect(page.getByRole("separator")).toHaveCount(0);
    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    await expect(page.locator("#after")).toBeFocused();
});

test("Separator exposes semantic separation, native props, events and a ref", async ({ page }) => {
    await page.goto("/?component=separator&semantic=1&state=footer");
    const subject = page.getByRole("separator", { name: "Settings sections" });
    await expect(subject).toHaveAttribute("data-testid", "native-separator");
    await expect(subject).toHaveAttribute("data-orientation", "horizontal");
    await expect(subject).toHaveAttribute("data-edge", "footer");
    await subject.click();
    await expect(page.getByLabel("Activations", { exact: true })).toHaveText("1");
    await page.locator("#read-ref").click();
    await expect(page.getByLabel("Root ref", { exact: true })).toHaveText("DIV");
});

test("Separator composes an hr and forwards its ref", async ({ page }) => {
    await page.goto("/?component=separator&semantic=1&asChild=1");
    await expect(page.locator("hr[data-subject]")).toHaveAttribute("role", "separator");
    await page.locator("#read-ref").click();
    await expect(page.getByLabel("Root ref", { exact: true })).toHaveText("HR");
});
