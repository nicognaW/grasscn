import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { minecraftBadgeAssets } from "@grasscn/web/ui/minecraft-badge-assets";
import { compare } from "@ppt/harness/families/text-components-test-utils";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

test.describe.configure({ mode: "parallel" });

const directory = "tests/reference/badge-advancement";

const manifest = JSON.parse(
  readFileSync(pixelPerfectFile(`${directory}/manifest.json`), "utf-8")
);

test("Badge advancement comparator detects one changed pixel", () => {
  const a = PNG.sync.read(
    readFileSync(
      pixelPerfectFile(`${directory}/captures/${manifest.cases[0].name}`)
    )
  );

  const b = PNG.sync.read(PNG.sync.write(a));

  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  b.data[0] ^= 1;
  expect(compare(a, b).mismatchedPixels).toBe(1);
});

for (const c of manifest.cases) {
  test(`Badge original advancement artwork/item/title ${c.name}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ height: 900, width: 1536 });
    await page.goto(
      `/?${new URLSearchParams({ achievement: c.state, component: "badge-advancement", earned: String(c.checked), label: c.label, scale: String(c.scale) })}`
    );
    const subject = page.locator("[data-subject]");
    await expect(subject).toHaveAttribute("data-slot", "badge");
    await page.mouse.move(0, 0);

    const bytes = readFileSync(
      pixelPerfectFile(`${directory}/captures/${c.name}`)
    );

    expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);

    const actual = await subject.screenshot();
    const result = compare(PNG.sync.read(bytes), PNG.sync.read(actual));

    writeFileSync(info.outputPath("actual.png"), actual);
    writeFileSync(info.outputPath("diff.png"), PNG.sync.write(result.diff));
    writeFileSync(
      info.outputPath("metrics.json"),
      JSON.stringify({
        case: c.name,
        component: "badge",
        manifest: `${directory}/manifest.json`,
        mismatchedPixels: result.mismatchedPixels,
        scope:
          "Original AdvancementWidget hover appearance at native117x26; default compact web geometry separately tested",
      })
    );
    expect(result.mismatchedPixels).toBe(0);
  });
}

test("Badge embeds unchanged original advancement frames/panels and diamond artwork", () => {
  const provenance = JSON.parse(
    readFileSync(
      pixelPerfectFile(`${directory}/asset-provenance.json`),
      "utf-8"
    )
  );

  for (const record of provenance) {
    const bytes = Buffer.from(
      minecraftBadgeAssets[
        record.key as keyof typeof minecraftBadgeAssets
      ].split(",")[1],
      "base64"
    );

    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      record.sha256
    );
  }
});
