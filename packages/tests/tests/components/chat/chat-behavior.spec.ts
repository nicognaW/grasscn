import { test, expect } from "@grasscn/tests/test";
test("Message preserves all six slots, CJK, alignment, refs and native line dimensions", async ({ page }) => {
    await page.goto("?component=message&rich=1&align=end&label=你好世界");
    for (const slot of ["message-group", "message", "message-avatar", "message-header", "message-content", "message-footer"])
        await expect(page.locator(`[data-slot=${slot}]`).first()).toBeVisible();
    await expect(page.getByTestId("message")).toHaveAttribute("data-align", "end");
    await expect(page.getByTestId("rich-text")).toHaveText("你好世界");
    await page.locator("#read-ref").click();
    await expect(page.locator("#tag")).toHaveText("DIV");
    await page.getByLabel("Chat text").fill("こんにちは 世界");
    await expect(page.getByTestId("rich-text")).toHaveText("こんにちは 世界");
});
test("Message scalar text has original row dimensions and multiline semantics at all GUI scales", async ({ page }) => {
    for (const scale of [1, 2, 3]) {
        await page.goto(`?component=message&label=First%20line%0ASecond%20line&scale=${scale}`);
        const subject = page.locator("[data-subject]");
        await expect(subject).toHaveAttribute("data-mc-chat-ready", "true");
        await expect(subject.locator("[data-mc-label-layout-ready]")).toHaveAttribute("data-mc-label-layout-ready", "true");
        await expect(subject).toContainText("First line\nSecond line");
        expect((await subject.boundingBox())!.height).toBe(18 * scale);
    }
});
test("Bubble preserves four slots, reaction positioning and rich text", async ({ page }) => {
    await page.goto("?component=bubble&rich=1&align=end&side=top&label=你好世界");
    for (const slot of ["bubble-group", "bubble", "bubble-content", "bubble-reactions"])
        await expect(page.locator(`[data-slot=${slot}]`)).toBeVisible();
    await expect(page.getByTestId("reactions")).toHaveAttribute("data-side", "top");
    await expect(page.getByTestId("reactions")).toHaveAttribute("data-align", "end");
    await page.getByRole("button", { name: "React", exact: true }).click();
    await expect(page.locator("#events")).toHaveText("1");
});
test("Bubble asChild keeps semantic button, ref and keyboard event composition", async ({ page }) => { await page.goto("?component=bubble&asChild=1&label=Hello"); const button = page.getByRole("button", { name: "Chat action" }); await button.focus(); await page.keyboard.press("Space"); await page.keyboard.press("Enter"); await expect(page.locator("#events")).toHaveText("2"); await expect(page.locator("#tag")).toHaveText("child"); await page.locator("#read-ref").click(); await expect(page.locator("#tag")).toHaveText("BUTTON"); });
test("Bubble disabled semantic buttons remain inactive", async ({ page }) => { await page.goto("?component=bubble&asChild=1&disabled=1"); await expect(page.getByRole("button", { name: "Chat action" })).toBeDisabled(); await page.getByRole("button", { name: "Chat action" }).dispatchEvent("keydown", { key: "Enter" }); await expect(page.locator("#events")).toHaveText("0"); });
test("Chat palette and rich intrinsic children retain native canvas colors", async ({ page }) => {
    await page.goto("?component=bubble&rich=1&color=%23ff5555&label=你好");
    const subject = page.locator("[data-subject]");
    for (const glyph of await subject.locator("[data-mc-label-ready]").all())
        await expect(glyph).toHaveAttribute("data-mc-label-ready", "true");
    await expect(subject).toHaveCSS("color", "rgb(255, 85, 85)");
    await expect(subject.getByTestId("rich-text")).toBeVisible();
    const canvas = subject.locator("canvas").first();
    expect(await canvas.evaluate((node: HTMLCanvasElement) => {
        const pixels = node.getContext("2d")!.getImageData(0, 0, node.width, node.height).data;
        for (let i = 0; i < pixels.length; i += 4)
            if (pixels[i] === 255 && pixels[i + 1] === 85 && pixels[i + 2] === 85 && pixels[i + 3] === 255)
                return true;
        return false;
    })).toBe(true);
});
