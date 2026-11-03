import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

export interface CollapsibleReferenceCase {
  name: string;
  sha256: string;
  alignment?: string;
  height?: number;
  label: string;
  scale: number;
  state: string;
  width: number;
  x?: number;
  y?: number;
  wrapWidth?: number | null;
  background?: string;
}

interface InstalledCollapsibleResult {
  decodedRgbaSha256: string;
  expandedDecodedRgbaSha256?: string;
  mismatchedPixels: number;
  name: string;
}

interface InstalledCollapsibleCase {
  page: Page;
  c: CollapsibleReferenceCase;
  manifestFile: string;
  url: string;
}

const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

const collapsibleParams = (
  c: CollapsibleReferenceCase,
  body: boolean,
  expanded: boolean
) => {
  const params = new URLSearchParams({
    align: c.alignment ?? "left",
    component: "collapsible",
    height: String(c.height ?? 20),
    label: c.label ?? "Button",
    native: "1",
    part: body ? "body" : "header",
    scale: String(c.scale),
    state: c.state,
    text: body ? c.label : "",
    width: String(c.width),
    x: String(c.x ?? 16),
    y: String(c.y ?? 16),
  });

  const optionalWrapWidth = c.wrapWidth;

  if (optionalWrapWidth !== null && optionalWrapWidth !== undefined) {
    params.set("wrapWidth", String(c.wrapWidth));
  }

  if (expanded) {
    params.set("expanded", "1");
  }

  return params;
};

interface InstalledCollapsibleRendering {
  body: boolean;
  c: CollapsibleReferenceCase;
  expanded: boolean;
  expected: ReturnType<typeof PNG.sync.read>;
  page: Page;
  url: string;
}

const verifyCollapsibleRendering = async ({
  body,
  c,
  expanded,
  expected,
  page,
  url,
}: InstalledCollapsibleRendering) => {
  const params = collapsibleParams(c, body, expanded);

  await page.goto(`${url}?${params}`);
  const subject = page.locator("#subject");
  await expect(subject).toBeVisible();
  await page.addStyleTag({
    content: `html,body{background:${c.background ?? "#202020"}}#root{visibility:hidden}#subject{visibility:visible}`,
  });
  await page.mouse.move(0, 0);

  if (body) {
    await expect(
      subject.locator("[data-mc-label-layout-ready]")
    ).toHaveAttribute("data-mc-label-layout-ready", "true");
  } else {
    if (c.state === "hover") {
      await subject.hover();
    }

    if (c.state === "focus") {
      await subject.focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await expect(subject).toBeFocused();
    }
  }

  {
    const glyphs = await subject.locator("[data-mc-label-ready]").all();

    const glyphReadinessResults = await Promise.allSettled(
      glyphs.map(async (label) => {
        await expect(label).toHaveAttribute("data-mc-label-ready", "true");
      })
    );

    const rejectedReadiness = glyphReadinessResults.find(
      (result) => result.status === "rejected"
    );

    if (rejectedReadiness) {
      throw rejectedReadiness.reason;
    }
  }

  await page.evaluate(
    async () =>
      // oxlint-disable-next-line promise/avoid-new -- Browser animation frames have no native Promise API; retain the two-frame boundary.
      await new Promise<number>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      })
  );

  // SAFETY: this fixed fixture subject is visible and has completed the same
  // two-frame layout boundary before its geometry is read. Keep the original
  // failure behavior if the browser unexpectedly returns null.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Established visible fixture geometry.
  const bounds = (await subject.boundingBox()) as NonNullable<
    Awaited<ReturnType<typeof subject.boundingBox>>
  >;

  assert.deepEqual(
    [bounds.x, bounds.y],
    [(c.x ?? 16) * c.scale, (c.y ?? 16) * c.scale]
  );
  const actual = PNG.sync.read(await subject.screenshot());
  assert.deepEqual(
    [actual.width, actual.height],
    [expected.width, expected.height]
  );
  assert.ok(
    actual.data.equals(expected.data),
    `Installed Collapsible pixels differ: ${c.name} expanded:${expanded}`
  );

  return actual;
};

export const verifyCollapsibleCase = async ({
  page,
  c,
  manifestFile,
  url,
}: InstalledCollapsibleCase) => {
  const body = manifestFile === "tests/reference/label/manifest.json";

  const bytes = await readFile(
    pixelPerfectFile(path.join(path.dirname(manifestFile), "captures", c.name))
  );

  assert.equal(sha(bytes), c.sha256);
  const expected = PNG.sync.read(bytes);
  let result: InstalledCollapsibleResult | undefined;

  for (const expanded of body ? [true] : [false, true]) {
    const actual = await verifyCollapsibleRendering({
      body,
      c,
      expanded,
      expected,
      page,
      url,
    });

    if (result) {
      result.expandedDecodedRgbaSha256 = sha(actual.data);
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
