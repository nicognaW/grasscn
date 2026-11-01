import {resolveRepositoryPath, testRoot} from '../../../workspace-paths.mjs'
import { pixelPerfectTest as test, expect } from "./verified-test";
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { minecraftSeparatorAssets } from "../../../apps/web/registry/ui/minecraft-separator-assets";
const manifest = JSON.parse(readFileSync(resolveRepositoryPath("tests/reference/separator/manifest.json", testRoot), "utf8")) as {
    cases: {
        name: string;
        width: number;
        height: number;
        scale: number;
        background: string;
        x: number;
        y: number;
        state: string;
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
test("Separator comparator catches a one-pixel change", async () => {
    const expected = PNG.sync.read(await readFile(resolveRepositoryPath(`tests/reference/separator/captures/${manifest.cases[0].name}`, testRoot)));
    const actual = PNG.sync.read(PNG.sync.write(expected));
    actual.data[0] ^= 1;
    expect(compare(expected, actual).mismatchedPixels).toBe(1);
});
for (const asChild of [false, true])
    for (const c of manifest.cases)
        test(`Separator native pixels (${asChild ? "hr" : "div"}): ${c.name}`, async ({ page }, testInfo) => {
            const query = new URLSearchParams({ component: "separator", width: String(c.width), scale: String(c.scale), state: c.state });
            if (asChild)
                query.set("asChild", "1");
            await page.goto(`/?${query}`);
            await page.addStyleTag({ content: `html,body { background: ${c.background}; } #root > :not([data-subject]) { visibility: hidden; } [data-subject] { position: fixed; left: ${c.x * c.scale}px; top: ${c.y * c.scale}px; }` });
            await page.mouse.move(0, 0);
            const card = page.locator('[data-slot="separator"]');
            await expect(card).toBeVisible();
            const expectedBytes = await readFile(resolveRepositoryPath(`tests/reference/separator/captures/${c.name}`, testRoot));
            expect(createHash("sha256").update(expectedBytes).digest("hex")).toBe(c.sha256);
            const actualBytes = await card.screenshot({ animations: "disabled" });
            const { diff, mismatchedPixels } = compare(PNG.sync.read(expectedBytes), PNG.sync.read(actualBytes));
            await writeFile(testInfo.outputPath("actual.png"), actualBytes);
            await writeFile(testInfo.outputPath("diff.png"), PNG.sync.write(diff));
            await writeFile(testInfo.outputPath("metrics.json"), JSON.stringify({ case: c.name, mismatchedPixels, totalPixels: c.width * c.height * c.scale * c.scale, tolerance: 0 }, null, 2));
            expect(mismatchedPixels).toBe(0);
        });
test("Separator embeds unchanged original title and in-world textures", () => {
    const provenance = JSON.parse(readFileSync(resolveRepositoryPath("tests/reference/separator/asset-provenance.json", testRoot), "utf8"));
    for (const edge of ["header", "footer"] as const) {
        const bytes = Buffer.from(minecraftSeparatorAssets[edge].split(",")[1], "base64");
        const sha = createHash("sha256").update(bytes).digest("hex");
        expect(sha).toBe(provenance.sources[`assets/minecraft/textures/gui/${edge}_separator.png`].sha256);
        expect(sha).toBe(provenance.sources[`assets/minecraft/textures/gui/inworld_${edge}_separator.png`].sha256);
        const image = PNG.sync.read(bytes);
        expect([image.width, image.height]).toEqual([32, 2]);
    }
});
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
