import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type {
  InstalledCaseResult,
  ToggleReferenceCase,
} from "@ppt/installed/reference-case";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

interface InstalledToggleCase {
  c: ToggleReferenceCase;
  manifestFile: string;
  name: string;
  page: Page;
  url: string;
}

interface InstalledToggleRendering extends InstalledToggleCase {
  type: string;
}

const verifyToggleRendering = async ({
  c,
  manifestFile,
  name,
  page,
  type,
  url,
}: InstalledToggleRendering) => {
  const params = new URLSearchParams({
    background: c.background,
    checked: String(c.checked),
    component: name,
    scale: String(c.scale),
    state: c.state,
    x: String(c.x),
    y: String(c.y),
  });

  if (name === "toggle-group") {
    params.set("native", "1");
    params.set("type", type);
  }

  await page.goto(`${url}?${params}`);
  const subject = page.locator("[data-subject]");
  await expect(subject).toHaveAttribute(
    "data-slot",
    name === "toggle-group" ? "toggle-group-item" : "toggle"
  );
  await page.mouse.move(0, 0);

  if (c.state.endsWith("hover")) {
    await subject.hover();
  }

  if (c.state === "focus") {
    await subject.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(subject).toBeFocused();
  }

  await page.evaluate(async () => {
    const frameCompletion = Promise.withResolvers();

    try {
      requestAnimationFrame(() => {
        requestAnimationFrame(frameCompletion.resolve);
      });
    } catch (error) {
      frameCompletion.reject(error);
    }

    return await frameCompletion.promise;
  });

  const expectedBytes = await readFile(
    pixelPerfectFile(path.join(path.dirname(manifestFile), "captures", c.name))
  );

  assert.equal(sha(expectedBytes), c.sha256);

  const expected = PNG.sync.read(expectedBytes);
  const actual = PNG.sync.read(await subject.screenshot());

  assert.deepEqual(
    [actual.width, actual.height],
    [expected.width, expected.height]
  );
  assert.ok(
    actual.data.equals(expected.data),
    `Installed Toggle pixels differ: ${c.name}`
  );

  return actual;
};

export const verifyToggleCase = async ({
  c,
  manifestFile,
  name,
  page,
  url,
}: InstalledToggleCase) => {
  await page.setViewportSize({ height: 900, width: 1536 });
  const renderings = [];

  for (const type of name === "toggle-group"
    ? ["single", "multiple"]
    : ["single"]) {
    const actual = await verifyToggleRendering({
      c,
      manifestFile,
      name,
      page,
      type,
      url,
    });

    renderings.push(sha(actual.data));
  }

  const result: Pick<
    InstalledCaseResult,
    | "decodedRgbaSha256"
    | "mismatchedPixels"
    | "name"
    | "multipleDecodedRgbaSha256"
  > = {
    decodedRgbaSha256: renderings[0],
    mismatchedPixels: 0,
    name: c.name,
  };

  if (name === "toggle-group") {
    [, result.multipleDecodedRgbaSha256] = renderings;
  }

  return result;
};
