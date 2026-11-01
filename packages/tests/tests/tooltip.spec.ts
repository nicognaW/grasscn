import {resolveRepositoryPath, testRoot} from '../../../workspace-paths.mjs'
import { test, expect } from "./verified-test";
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
const manifest = JSON.parse(readFileSync(resolveRepositoryPath("tests/reference/tooltip/manifest.json", testRoot), "utf8")) as {
    cases: {
        name: string;
        text: string;
        wrapWidth: number;
        background: string;
        x: number;
        y: number;
        width: number;
        height: number;
        scale: number;
        renderedLines: string[];
        sha256: string;
    }[];
};
function compare(expected: PNG, actual: PNG) {
    expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
    const diff = new PNG({ width: expected.width, height: expected.height });
    let mismatchedPixels = 0;
    for (let i = 0; i < expected.data.length; i += 4) {
        const mismatch = !actual.data.subarray(i, i + 4).equals(expected.data.subarray(i, i + 4));
        mismatchedPixels += Number(mismatch);
        diff.data.set(mismatch ? [255, 0, 255, 255] : [expected.data[i] >> 2, expected.data[i + 1] >> 2, expected.data[i + 2] >> 2, 255], i);
    }
    return { diff, mismatchedPixels };
}
test("Tooltip comparator detects one changed pixel", async () => {
    const expected = PNG.sync.read(await readFile(resolveRepositoryPath(`tests/reference/tooltip/captures/${manifest.cases[0].name}`, testRoot)));
    const actual = PNG.sync.read(PNG.sync.write(expected));
    actual.data[0] ^= 1;
    expect(compare(expected, actual).mismatchedPixels).toBe(1);
});
test("Tooltip supports hover, keyboard focus, Escape and trigger activation", async ({ page }) => {
    await page.goto("/?component=tooltip&text=Tooltip");
    const trigger = page.locator("#tooltip-trigger"), content = page.locator('[data-slot="tooltip-content"]');
    await expect(content).toHaveCount(0);
    await trigger.hover();
    await expect(content).toBeVisible();
    await expect(trigger).not.toHaveAttribute("aria-describedby");
    await expect(content).toContainText("Tooltip");
    await page.keyboard.press("Escape");
    await expect(content).toHaveCount(0);
    await page.mouse.move(0, 0);
    await trigger.focus();
    await expect(content).toBeVisible();
    await trigger.click();
    await expect(page.getByLabel("Activations", { exact: true })).toHaveText("1");
    await expect(content).toHaveCount(0);
});
test("Tooltip preserves controlled state, asChild and the real content ref", async ({ page }) => {
    await page.goto("/?component=tooltip&controlled=1&asChild=1&text=Tooltip");
    await page.locator("#external-open").click();
    const content = page.locator('[data-slot="tooltip-content"]');
    await expect(content).toBeVisible();
    await page.locator("#read-ref").evaluate(element => (element as HTMLButtonElement).click());
    await expect(page.getByLabel("Root ref", { exact: true })).toHaveText("DIV");
    await expect(content.locator(".mc-tooltip-line")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Tooltip open", { exact: true })).toHaveText("false");
});
test("Tooltip honors hover delay and accepts rich children", async ({ page }) => {
    const clockTime = new Date("2030-01-01T00:00:00Z");
    await page.clock.install({ time: clockTime });
    await page.clock.pauseAt(new Date(clockTime.getTime() + 60_000));
    await page.goto("/?component=tooltip&delay=500&rich=1");
    const trigger = page.locator("#tooltip-trigger");
    await expect(trigger).toBeVisible();
    const bounds = (await trigger.boundingBox())!;
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.clock.runFor(400);
    await expect(page.locator('[data-slot="tooltip-content"]')).toHaveCount(0);
    await page.clock.runFor(200);
    await expect(page.getByText("Rich tooltip", { exact: true }).first()).toBeVisible();
});
test("Tooltip wraps and stays inside a mobile viewport at each edge", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const side of ["top", "bottom", "left", "right"]) {
        await page.goto(`/?component=tooltip&open=1&scale=3&side=${side}&edge=${side}&text=${encodeURIComponent("Use this component to show a helpful description.")}`);
        const content = page.locator('[data-slot="tooltip-content"]');
        await expect(content).toBeVisible();
        await expect.poll(async () => {
            const box = (await content.boundingBox())!;
            return box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844;
        }).toBe(true);
    }
});
for (const c of manifest.cases)
    test(`Tooltip native pixels: ${c.name}`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 1536, height: 900 });
        await page.goto(`/?${new URLSearchParams({ component: "tooltip", open: "1", text: c.text, wrapWidth: String(c.wrapWidth), scale: String(c.scale) })}`);
        await page.addStyleTag({ content: `html,body { background: ${c.background}; } #root { visibility: hidden; } [data-mc-positioner] { transform: translate(${c.x * c.scale}px, ${c.y * c.scale}px) !important; }` });
        const content = page.locator('[data-slot="tooltip-content"]');
        await expect(content).toBeVisible();
        await expect(content.locator("canvas")).toHaveAttribute("data-mc-tooltip-painted", "true");
        await expect(content.locator("canvas")).toHaveAttribute("data-mc-backdrop", [1, 3, 5].map(start => parseInt(c.background.slice(start, start + 2), 16)).join(","));
        await expect(content.locator("canvas")).toHaveAttribute("data-mc-location", [c.x * c.scale, c.y * c.scale].join(","));
        await page.mouse.move(0, 0);
        const expectedBytes = await readFile(resolveRepositoryPath(`tests/reference/tooltip/captures/${c.name}`, testRoot));
        expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(c.sha256);
        const actualBytes = await content.screenshot({ animations: "disabled" });
        const { diff, mismatchedPixels } = compare(PNG.sync.read(expectedBytes), PNG.sync.read(actualBytes));
        await writeFile(testInfo.outputPath("actual.png"), actualBytes);
        await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
        await writeFile(testInfo.outputPath("metrics.json"), JSON.stringify({ case: c.name, mismatchedPixels, totalPixels: c.width * c.height * c.scale * c.scale, tolerance: 0 }, null, 2));
        expect(mismatchedPixels).toBe(0);
    });
