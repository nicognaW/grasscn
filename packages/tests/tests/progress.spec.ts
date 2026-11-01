import { test, expect } from "./verified-test";
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { minecraftProgressAssets, minecraftProgressRgba } from "../../../apps/web/registry/ui/minecraft-progress-assets";
const manifest = JSON.parse(readFileSync("tests/reference/progress/manifest.json", "utf8")) as {
    cases: {
        name: string;
        width: number;
        height: number;
        scale: number;
        background: string;
        value: number;
        color: string;
        overlay: string;
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
test("Progress comparator catches a one-pixel change", async () => {
    const expected = PNG.sync.read(await readFile(`tests/reference/progress/captures/${manifest.cases[0].name}`));
    const actual = PNG.sync.read(PNG.sync.write(expected));
    actual.data[0] ^= 1;
    expect(compare(expected, actual).mismatchedPixels).toBe(1);
});
test.describe("Progress native matrix", () => {
    test.describe.configure({ mode: "parallel" });
    for (const c of manifest.cases)
        test(`Progress native pixels: ${c.name}`, async ({ page }, testInfo) => {
            const query = new URLSearchParams({ component: "progress", scale: String(c.scale), value: String(c.value), max: "1", color: c.color, overlay: c.overlay });
            await page.goto(`/?${query}`);
            await page.addStyleTag({ content: `html,body { background: ${c.background}; }` });
            await page.mouse.move(0, 0);
            const card = page.locator('[data-slot="progress"]');
            await expect(card).toBeVisible();
            const expectedBytes = await readFile(`tests/reference/progress/captures/${c.name}`);
            expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(c.sha256);
            const actualBytes = await card.screenshot({ animations: "disabled" });
            const { diff, mismatchedPixels } = compare(PNG.sync.read(expectedBytes), PNG.sync.read(actualBytes));
            await writeFile(testInfo.outputPath("actual.png"), actualBytes);
            await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
            await writeFile(testInfo.outputPath("metrics.json"), JSON.stringify({ case: c.name, mismatchedPixels, totalPixels: c.width * c.height * c.scale * c.scale, tolerance: 0 }, null, 2));
            expect(mismatchedPixels).toBe(0);
        });
});
test("Progress retains every original boss-bar PNG", () => {
    const provenance = JSON.parse(readFileSync("tests/reference/progress/asset-provenance.json", "utf8"));
    expect(Object.keys(minecraftProgressAssets)).toHaveLength(22);
    for (const [name, uri] of Object.entries(minecraftProgressAssets)) {
        const bytes = Buffer.from(uri.split(",")[1], "base64"), image = PNG.sync.read(bytes);
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(provenance.sources[`assets/minecraft/textures/gui/sprites/boss_bar/${name}.png`].sha256);
        expect([image.width, image.height]).toEqual([182, 5]);
        const raw = Buffer.from(minecraftProgressRgba[name as keyof typeof minecraftProgressRgba], "base64");
        expect(raw.equals(image.data)).toBe(true);
        expect(createHash("sha256").update(raw).digest("hex")).toBe(provenance.sources[`assets/minecraft/textures/gui/sprites/boss_bar/${name}.png`].decodedRgbaSha256);
    }
});
test("Progress notch painter preserves the background through transparent corners", async ({ page }) => {
    await page.goto("/?component=progress&value=50&overlay=notched_6");
    const progress = page.locator("[data-subject]");
    await page.addStyleTag({ content: "html,body { background: repeating-linear-gradient(90deg, #123456 0 4px, #abcdef 4px 8px); }" });
    await expect(progress.locator("canvas")).toHaveAttribute("data-mc-progress-painted", "true");
    const rendered = PNG.sync.read(await progress.screenshot());
    await progress.locator("canvas, .mc-progress-fallback").evaluateAll(nodes => nodes.forEach(node => { (node as HTMLElement).style.visibility = "hidden"; }));
    const backdrop = PNG.sync.read(await progress.screenshot());
    const original = PNG.sync.read(Buffer.from(minecraftProgressAssets.pink_background.split(",")[1], "base64"));
    let checked = 0;
    for (let y = 0; y < 5; y++)
        for (let x = 0; x < 182; x++)
            if (!original.data[(y * 182 + x) * 4 + 3]) {
                for (let dy = 0; dy < 2; dy++)
                    for (let dx = 0; dx < 2; dx++) {
                        const index = ((y * 2 + dy) * rendered.width + x * 2 + dx) * 4;
                        expect(rendered.data.subarray(index, index + 4).equals(backdrop.data.subarray(index, index + 4))).toBe(true);
                        checked++;
                    }
            }
    expect(checked).toBeGreaterThan(0);
});
for (const scale of [1, 2, 3])
    test(`Progress asChild native pixels at scale ${scale}`, async ({ page }, testInfo) => {
        const c = manifest.cases.find(c => c.name === `progress-c18-s${scale}.png`)!;
        await page.goto(`/?component=progress&value=0.5&max=1&overlay=notched_6&asChild=1&scale=${scale}`);
        const actualBytes = await page.locator("section[data-subject]").screenshot();
        await writeFile(testInfo.outputPath("actual.png"), actualBytes);
        await writeFile(testInfo.outputPath("metrics.json"), JSON.stringify({ component: "progress", manifest: "tests/reference/progress/manifest.json", case: c.name, part: "surface", alias: "asChild" }));
        const actual = PNG.sync.read(actualBytes);
        const expected = PNG.sync.read(await readFile(`tests/reference/progress/captures/${c.name}`));
        expect(compare(expected, actual).mismatchedPixels).toBe(0);
    });
