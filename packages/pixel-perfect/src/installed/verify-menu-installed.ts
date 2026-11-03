import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type {
  MenuReferenceCase,
  MenubarTriggerReferenceCase,
  InstalledCaseResult,
} from "@ppt/installed/reference-case";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

interface InstalledMenuCase {
  c: MenuReferenceCase;
  manifestFile: string;
  name: string;
  page: Page;
  url: string;
}

interface InstalledMenuRendering extends InstalledMenuCase {
  kind: string;
}

const verifyMenuRendering = async ({
  c,
  kind,
  manifestFile,
  name,
  page,
  url,
}: InstalledMenuRendering) => {
  const params = new URLSearchParams({
    checked: String(c.checked ?? false),
    component: name,
    height: String(c.height),
    label: c.label ?? "",
    labels: JSON.stringify(c.labels ?? []),
    native: "1",
    part: kind,
    scale: String(c.scale),
    state: c.state,
    surface: c.element === "suggestion-list" ? "suggestions" : "popup",
    width: String(c.width),
    x: String(c.x),
    y: String(c.y),
  });

  await page.goto(`${url}?${params}`);

  if (name === "context-menu") {
    await expect(page.locator("#context-hit")).toBeVisible();
    await page.mouse.click(c.x * c.scale, c.y * c.scale, {
      button: "right",
    });
    await page.locator('[data-slot="context-menu-content"]').waitFor();
    await page.mouse.move(0, 0);
  }

  await page.addStyleTag({
    content: `html,body{background:${c.background}} #root{visibility:hidden}`,
  });
  const subject = page.locator(`[data-slot="${name}-content"]`);
  await expect(subject).toHaveAttribute("data-mc-menu-ready", "true");
  await page.mouse.move(0, 0);
  await subject.evaluate((node: HTMLElement) => {
    node.focus();
  });

  if (Number(c.selectedIndex) >= 0) {
    await subject.getByRole("menuitem").nth(c.selectedIndex!).focus();
  }

  if (c.state === "focus") {
    await subject
      .locator(
        '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]'
      )
      .first()
      .focus();
  }

  if (c.state.endsWith("hover")) {
    await subject.getByRole("menuitem").nth(c.targetIndex!).hover();
  }

  await subject.evaluate(
    (node, value) => {
      node.scrollTop = value;
    },
    (c.value ?? 0) * 12 * c.scale
  );
  await expect(
    subject.locator('[data-mc-menu-text-ready="false"]')
  ).toHaveCount(0);

  for (const line of await subject
    .locator("[data-mc-menu-unicode-ready]")
    .all()) {
    await expect(line).toHaveAttribute("data-mc-menu-unicode-ready", "true");
  }

  for (const icon of await subject
    .locator("[data-mc-menu-sprite-ready]")
    .all()) {
    await expect(icon).toHaveAttribute("data-mc-menu-sprite-ready", "true");
  }

  await page.evaluate(async () => {
    const frameCompletion2 = Promise.withResolvers();

    try {
      requestAnimationFrame(() => {
        requestAnimationFrame(frameCompletion2.resolve);
      });
    } catch (error) {
      frameCompletion2.reject(error);
    }

    return await frameCompletion2.promise;
  });
  const bounds = (await subject.boundingBox())!;
  assert.equal(bounds.x, c.x * c.scale);
  assert.equal(bounds.y, c.y * c.scale);

  const bytes = await readFile(
    pixelPerfectFile(path.join(path.dirname(manifestFile), "captures", c.name))
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
    `Installed Menu pixels differ: ${c.name} ${kind}`
  );

  return actual;
};

interface InstalledMenubarTriggerRendering extends InstalledMenubarTriggerCase {
  open: boolean;
}

const verifyMenubarTriggerRendering = async ({
  c,
  manifestFile,
  name,
  open,
  page,
  url,
}: InstalledMenubarTriggerRendering) => {
  const params = new URLSearchParams({
    component: name,
    label: c.label,
    scale: String(c.scale),
    state: open ? "normal" : c.state,
    triggerPixels: "1",
    width: String(c.width),
    x: String(c.x ?? 16),
    y: String(c.y ?? 16),
  });

  if (open) {
    params.set("open", "1");
  }

  await page.goto(`${url}?${params}`);
  const trigger = page.locator('[data-slot="menubar-trigger"]').first();
  await expect(trigger).toBeVisible();
  await page.addStyleTag({
    content: '[data-slot="menubar-content"]{visibility:hidden}',
  });
  await page.mouse.move(0, 0);

  if (c.state === "hover" && !open) {
    await trigger.hover();
  }

  if (c.state === "focus") {
    await page.keyboard.press("Tab");
    await expect(trigger).toBeFocused();
  }

  for (const line of await trigger.locator("[data-mc-label-ready]").all()) {
    await expect(line).toHaveAttribute("data-mc-label-ready", "true");
  }

  await page.evaluate(async () => {
    const frameCompletion3 = Promise.withResolvers();

    try {
      requestAnimationFrame(() => {
        requestAnimationFrame(frameCompletion3.resolve);
      });
    } catch (error) {
      frameCompletion3.reject(error);
    }

    return await frameCompletion3.promise;
  });
  const bounds = (await trigger.boundingBox())!;
  assert.deepEqual(
    [bounds.x, bounds.y],
    [(c.x ?? 16) * c.scale, (c.y ?? 16) * c.scale]
  );

  const bytes = await readFile(
    pixelPerfectFile(path.join(path.dirname(manifestFile), "captures", c.name))
  );

  assert.equal(sha(bytes), c.sha256);

  const expected = PNG.sync.read(bytes);
  const actual = PNG.sync.read(await trigger.screenshot());

  assert.deepEqual(
    [actual.width, actual.height],
    [expected.width, expected.height]
  );
  assert.ok(
    actual.data.equals(expected.data),
    `Installed Menubar trigger pixels differ: ${c.name} open:${open}`
  );

  return actual;
};

export const verifyMenuCase = async ({
  c,
  manifestFile,
  name,
  page,
  url,
}: InstalledMenuCase) => {
  let result: InstalledCaseResult | undefined;

  for (const kind of c.element === "menu-checkbox"
    ? ["menu-checkbox", "menu-radio"]
    : [c.element]) {
    const actual = await verifyMenuRendering({
      c,
      kind,
      manifestFile,
      name,
      page,
      url,
    });

    if (result) {
      result.radioDecodedRgbaSha256 = sha(actual.data);
    } else {
      result = {
        decodedRgbaSha256: sha(actual.data),
        mismatchedPixels: 0,
        name: c.name,
      };
    }
  }

  return result;
};

interface InstalledMenubarTriggerCase {
  c: MenubarTriggerReferenceCase;
  manifestFile: string;
  name: string;
  page: Page;
  url: string;
}

export const verifyMenubarTriggerCase = async ({
  c,
  manifestFile,
  name,
  page,
  url,
}: InstalledMenubarTriggerCase) => {
  let result: InstalledCaseResult | undefined;

  for (const open of c.state === "hover" ? [false, true] : [false]) {
    const actual = await verifyMenubarTriggerRendering({
      c,
      manifestFile,
      name,
      open,
      page,
      url,
    });

    if (result) {
      result.openDecodedRgbaSha256 = sha(actual.data);
    } else {
      result = {
        decodedRgbaSha256: sha(actual.data),
        mismatchedPixels: 0,
        name: c.name,
      };
    }
  }

  return result;
};
