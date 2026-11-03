import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { PopoverReferenceCase } from "@ppt/installed/reference-case";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

interface InstalledPopoverCase {
  c: PopoverReferenceCase;
  manifestFile: string;
  page: Page;
  url: string;
}

export const verifyPopoverCase = async ({ c, manifestFile, page, url }: InstalledPopoverCase) => {
  const params = new URLSearchParams({
    component: "popover",
    height: String(c.height),
    native: "1",
    scale: String(c.scale),
    width: String(c.width),
    x: String(c.x),
    y: String(c.y),
  });

  const optionalText = c.text;

  if (optionalText !== null && optionalText !== undefined) {
    params.set("text", optionalText);
    params.set("label", c.label!);
  }

  await page.goto(`${url}?${params}`);
  await page.addStyleTag({
    content: `html,body{background:${c.background}} #root{opacity:0}`,
  });
  await page.mouse.move(0, 0);
  const subject = page.locator('[data-slot="popover-content"]');
  await expect(subject).toHaveAttribute("data-mc-popover-ready", "true");
  await expect(
    subject.locator('[data-mc-popover-text-ready="false"]')
  ).toHaveCount(0);

  for (const line of await subject
    .locator("[data-mc-popover-unicode-ready]")
    .all()) {
    await expect(line).toHaveAttribute(
      "data-mc-popover-unicode-ready",
      "true"
    );
  }

  await page.evaluate(async () => {
    const frameCompletion4 = Promise.withResolvers();

    try {
      requestAnimationFrame(() => {
        requestAnimationFrame(frameCompletion4.resolve);
      });
    } catch (error) {
      frameCompletion4.reject(error);
    }

    return await frameCompletion4.promise;
  });
  const bounds = (await subject.boundingBox())!;
  assert.equal(bounds.x, c.x * c.scale);
  assert.equal(bounds.y, c.y * c.scale);

  const bytes = await readFile(
    pixelPerfectFile(
      path.join(path.dirname(manifestFile), "captures", c.name)
    )
  );

  assert.equal(sha(bytes), c.sha256);

  const expected = PNG.sync.read(bytes);
  const actual = PNG.sync.read(await subject.screenshot());

  assert.deepEqual(
    [actual.width, actual.height],
    [expected.width, expected.height]
  );
  assert.ok(
    actual.data.equals(expected.data),
    `Installed Popover pixels differ: ${c.name}`
  );
  return {
    decodedRgbaSha256: sha(actual.data),
    mismatchedPixels: 0,
    name: c.name,
  };
};
