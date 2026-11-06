import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { pixelPerfectTest as test, expect } from "@grasscn/pixel-perfect/test";
import { compare } from "@ppt/harness/families/text-components-test-utils";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

import type inputOtpReference from "../reference/input-otp/manifest.json";

test.describe.configure({ mode: "parallel" });

const dir = "tests/reference/input-otp";

// SAFETY: this fixed read consumes the retained input-otp manifest represented by the exact type-only JSON import; its case-definition and capture-source hashes match the retained producers. Keep the existing fresh read and parse phase.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained-manifest contract at JSON.parse; no runtime loader, validation or generic caster.
const manifest = JSON.parse(
  readFileSync(pixelPerfectFile(`${dir}/manifest.json`), "utf-8")
) as typeof inputOtpReference;

for (const c of manifest.cases) {
  test(`InputOTP actual native EditBox slot ${c.name}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ height: 900, width: 1536 });
    await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));

    const q = new URLSearchParams({
      background: c.background,
      component: "input-otp",
      height: String(c.height),
      native: "1",
      scale: String(c.scale),
      state: c.state,
      text: c.text,
      width: String(c.width),
      x: String(c.x),
      y: String(c.y),
    });

    await page.goto(`/?${q}`);

    const subject = page.locator("[data-subject]");
    const mirror = subject.locator("input");
    const input = page.getByRole("textbox", { name: "One-time code" });

    await expect(mirror).toHaveAttribute("data-mc-ready", "true");

    if (/\P{ASCII}/u.test(c.text)) {
      await expect(mirror).toHaveAttribute("data-mc-bitmap", "true");
    }

    if (c.state.startsWith("focus")) {
      await input.focus();
    }

    await page.mouse.move(0, 0);
    await page.clock.runFor(c.caretMs);
    await expect(subject).toHaveAttribute(
      "data-active",
      String(c.state.startsWith("focus"))
    );
    await expect(mirror).toHaveAttribute("data-mc-ready", "true");
    const bytes = readFileSync(pixelPerfectFile(`${dir}/captures/${c.name}`));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);

    const actualBytes = await subject.screenshot();

    const { mismatchedPixels, diff } = compare(
      PNG.sync.read(bytes),
      PNG.sync.read(actualBytes)
    );

    writeFileSync(info.outputPath("actual.png"), actualBytes);
    writeFileSync(info.outputPath("diff.png"), PNG.sync.write(diff));
    writeFileSync(
      info.outputPath("metrics.json"),
      JSON.stringify({
        alias: "base",
        case: c.name,
        component: "input-otp",
        manifest: `${dir}/manifest.json`,
        mismatchedPixels,
        part: "slot",
        tolerance: 0,
      })
    );
    expect(mismatchedPixels).toBe(0);
  });
}

test("InputOTP comparator rejects one changed native pixel", () => {
  const e = PNG.sync.read(
    readFileSync(pixelPerfectFile(`${dir}/captures/${manifest.cases[0].name}`))
  );

  const a = PNG.sync.read(PNG.sync.write(e));

  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  a.data[0] ^= 1;
  expect(compare(e, a).mismatchedPixels).toBe(1);
});
