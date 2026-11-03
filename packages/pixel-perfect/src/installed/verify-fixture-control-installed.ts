import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import type {
  FixtureReferenceCase,
  PositionedReferenceCase,
  TabsReferenceCase,
  SelectReferenceCase,
  InstalledReferenceManifest,
} from "@ppt/installed/reference-case";
import { pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

interface InstalledFixtureControlCase {
  c: FixtureReferenceCase;
  manifest: InstalledReferenceManifest;
  manifestFile: string;
  name: string;
  page: Page;
  url: string;
}

const controlParameters = (c: FixtureReferenceCase, name: string) => {
  const params = new URLSearchParams({
    checked: String(c.checked ?? false),
    component: c.element ?? name,
    label: c.label ?? "",
    scale: String(c.scale),
    state: c.state,
    width: String(c.width),
  });

  if (name === "radio-group") {
    params.set("component", "radio-group-item");
  }

  if (c.element === "slider") {
    params.set("value", String(Math.round(c.value * 1000)));
  }

  if (c.element === "input" || c.element === "textarea") {
    params.set("text", c.text);
    params.set("placeholder", c.placeholder ?? "");

    const optionalMaxLength = c.maxLength;

    if (optionalMaxLength !== null && optionalMaxLength !== undefined) {
      params.set("maxLength", String(c.maxLength));
    }

    if (c.element === "textarea") {
      params.set("height", String(c.height));
    }
  }

  if (c.element === "tooltip") {
    params.set("text", c.text);
    params.set("wrapWidth", String(c.wrapWidth));
    params.set("open", "1");
  }

  return params;
};

const appendSurfaceParameters = (
  params: URLSearchParams,
  c: FixtureReferenceCase
) => {
  if (c.element === "card") {
    params.set("height", String(c.height));

    const optionalText = c.text;

    if (optionalText !== null && optionalText !== undefined) {
      params.set("text", optionalText);
    }
  }

  if (c.element === "label") {
    params.set("height", String(c.height));
    params.set("alignment", c.alignment ?? "left");

    const optionalWrapWidth = c.wrapWidth;

    if (optionalWrapWidth !== null && optionalWrapWidth !== undefined) {
      params.set("wrapWidth", String(c.wrapWidth));
    }
  }

  if (c.element === "scroll-area") {
    params.set("height", String(c.height));
    params.set("contentHeight", String(c.contentHeight));
    params.set("scroll", String(c.value));
  }

  if (c.element === "progress") {
    params.set("value", String(c.value));
    params.set("max", "1");
    params.set("color", c.color);
    params.set("overlay", c.overlay);
  }
};

const appendSelectionParameters = (
  params: URLSearchParams,
  c: FixtureReferenceCase,
  name: string
) => {
  if (name === "tabs") {
    // SAFETY: the existing item-name branch selects its registered TabsReferenceCase capture format.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Specific registered manifest protocol.
    const selectedCase = c as TabsReferenceCase;

    for (const key of [
      "selected",
      "selectedIndex",
      "targetIndex",
      "disabledIndex",
      "timeMs",
      "contentHeight",
    ] as const) {
      const optionalParameter = selectedCase[key];

      if (optionalParameter !== null && optionalParameter !== undefined) {
        params.set(key, String(selectedCase[key]));
      }
    }

    if (selectedCase.labels) {
      params.set("labels", JSON.stringify(selectedCase.labels));
    }
  }

  if (name === "select") {
    // SAFETY: the existing item-name branch selects its registered SelectReferenceCase capture format.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Specific registered manifest protocol.
    const selectedCase = c as SelectReferenceCase;

    params.set("height", String(selectedCase.height));

    for (const key of ["selectedIndex", "disabledIndex", "timeMs"] as const) {
      const optionalParameter = selectedCase[key];

      if (optionalParameter !== null && optionalParameter !== undefined) {
        params.set(key, String(selectedCase[key]));
      }
    }

    if (selectedCase.labels) {
      params.set("labels", JSON.stringify(selectedCase.labels));
    }
  }
};

const prepareControlAppearance = async (
  c: FixtureReferenceCase,
  manifest: InstalledReferenceManifest,
  name: string,
  page: Page,
  subject: Locator
) => {
  if (c.element === "progress" && c.overlay !== "progress") {
    await expect(subject.locator("canvas")).toHaveAttribute(
      "data-mc-progress-painted",
      "true"
    );
  }

  if (c.element === "scroll-area") {
    await expect(subject).toHaveAttribute("data-mc-scroll-ready", "true");
    const viewport = subject.locator('[data-slot="scroll-area-viewport"]');
    await expect
      .poll(() => viewport.evaluate((node) => node.scrollTop))
      .toBe(c.value * c.scale);
  }

  if (c.element === "label") {
    await subject.evaluate(
      (node: HTMLElement, position) => {
        Object.assign(node.style, {
          left: `${position.x}px`,
          position: "fixed",
          top: `${position.y}px`,
        });
      },
      { x: c.x * c.scale, y: c.y * c.scale }
    );
    await page.addStyleTag({
      content: `html,body { background: ${c.background}; }`,
    });
    await page.addStyleTag({
      content: "#root > :not([data-subject]) { visibility: hidden; }",
    });
    await expect(subject).toHaveAttribute("data-mc-label-layout-ready", "true");

    {
      const glyphs = await subject.locator("[data-mc-label-ready]").all();

      const glyphReadinessResults = await Promise.allSettled(
        glyphs.map(async (line) => {
          await expect(line).toHaveAttribute("data-mc-label-ready", "true");
        })
      );

      const rejectedReadiness = glyphReadinessResults.find(
        (result) => result.status === "rejected"
      );

      if (rejectedReadiness) {
        throw rejectedReadiness.reason;
      }
    }
  }

  if ((name === "input" || name === "textarea") && manifest.effectiveAssets) {
    await subject.evaluate(
      (node: HTMLElement, position) => {
        Object.assign(node.style, {
          left: `${position.x}px`,
          position: "fixed",
          top: `${position.y}px`,
        });
      },
      { x: c.x! * c.scale, y: c.y! * c.scale }
    );
    await expect(subject).toHaveAttribute("data-mc-bitmap", "true");
  }

  if (name === "button" && manifest.effectiveAssets) {
    await page.addStyleTag({
      content: "#root > :not([data-subject]) { visibility: hidden; }",
    });
    await subject.evaluate(
      (node: HTMLElement, position) => {
        Object.assign(node.style, {
          left: `${position.x}px`,
          position: "fixed",
          top: `${position.y}px`,
        });
      },
      { x: c.x! * c.scale, y: c.y! * c.scale }
    );
    await expect(subject.locator("[data-mc-label-ready]")).toHaveAttribute(
      "data-mc-label-ready",
      "true"
    );
  }

  if (
    ["card", "separator", "scroll-area", "progress"].includes(c.element ?? "")
  ) {
    await page.addStyleTag({
      content: `html,body { background: ${c.background}; }`,
    });
  }

  if (c.element === "tooltip") {
    await page.addStyleTag({
      content: `html,body { background: ${c.background}; } #root { visibility: hidden; } [data-mc-positioner] { transform: translate(${c.x * c.scale}px, ${c.y * c.scale}px) !important; }`,
    });
    await expect(subject.locator("canvas")).toHaveAttribute(
      "data-mc-tooltip-painted",
      "true"
    );
    await expect(subject.locator("canvas")).toHaveAttribute(
      "data-mc-backdrop",
      [1, 3, 5]
        .map((start) =>
          Number.parseInt(c.background.slice(start, start + 2), 16)
        )
        .join(",")
    );
    await expect(subject.locator("canvas")).toHaveAttribute(
      "data-mc-location",
      [c.x * c.scale, c.y * c.scale].join(",")
    );
  }

  if (c.element === "input" || c.element === "textarea") {
    await expect(subject).toHaveAttribute("data-mc-ready", "true");
  }
};

const prepareTabsControlState = async (
  c: FixtureReferenceCase,
  name: string,
  page: Page,
  subject: Locator
) => {
  if (name === "tabs") {
    // SAFETY: the existing item-name branch selects its registered TabsReferenceCase capture format.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Specific registered manifest protocol.
    const selectedCase = c as TabsReferenceCase;

    await subject.evaluate(
      (node: HTMLElement, p) =>
        Object.assign(node.style, {
          left: `${p.x}px`,
          position: "fixed",
          top: `${p.y}px`,
          visibility: "visible",
          width: `${p.width}px`,
        }),
      {
        width: selectedCase.width * selectedCase.scale,
        x: selectedCase.x * selectedCase.scale,
        y: selectedCase.y * selectedCase.scale,
      }
    );
    await page.addStyleTag({
      content: `html,body{background:${selectedCase.background}} #root{visibility:hidden} [data-subject]{visibility:visible}`,
    });

    if (selectedCase.element === "tabs-trigger") {
      await expect(subject).toHaveAttribute("data-mc-tab-ready", "true");

      if (selectedCase.state.endsWith("hover")) {
        await subject.hover();
      }

      if (selectedCase.state === "focus") {
        await subject.focus();
      }
    } else {
      const list =
        (selectedCase.contentHeight ?? 0)
          ? subject.locator('[data-slot="tabs-list"]')
          : subject;

      await expect(list).toHaveAttribute("data-mc-tabs-ready", "true");
      const target = list.getByRole("tab").nth(selectedCase.targetIndex ?? 0);

      if (selectedCase.state === "hover") {
        await target.hover();
      }

      if (selectedCase.state === "focus") {
        await target.focus();
      }
    }

    for (const label of await subject.locator("[data-mc-label-ready]").all()) {
      await expect(label).toHaveAttribute("data-mc-label-ready", "true");
    }
  }
};

const prepareSelectControlState = async (
  c: FixtureReferenceCase,
  name: string,
  page: Page,
  subject: Locator
) => {
  if (name === "select") {
    // SAFETY: the existing item-name branch selects its registered SelectReferenceCase capture format.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Specific registered manifest protocol.
    const selectedCase = c as SelectReferenceCase;

    await subject.evaluate(
      (node: HTMLElement, p) =>
        Object.assign(node.style, {
          height: `${p.height}px`,
          left: `${p.x}px`,
          position: "fixed",
          top: `${p.y}px`,
          width: `${p.width}px`,
        }),
      {
        height: selectedCase.height * selectedCase.scale,
        width: selectedCase.width * selectedCase.scale,
        x: selectedCase.x * selectedCase.scale,
        y: selectedCase.y * selectedCase.scale,
      }
    );
    await page.addStyleTag({
      content: `html,body{background:${selectedCase.background}} #root{visibility:hidden;${selectedCase.element === "select-list" ? "opacity:0;" : ""}} [data-subject]{visibility:visible} [data-mc-positioner]{left:0!important;top:0!important;transform:none!important}`,
    });
    await expect(subject).toHaveAttribute("data-mc-select-ready", "true");

    await (selectedCase.state === "focus"
      ? subject.focus()
      : page.evaluate(() => {
          // SAFETY: the consumer fixture renders native HTML focus targets; null preserves the original optional blur.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Actual authored HTML focus target boundary.
          const active = document.activeElement as HTMLElement | null;

          return active?.blur();
        }));

    if (selectedCase.state.endsWith("hover")) {
      await (
        selectedCase.element === "select-list"
          ? subject.getByRole("option").nth(selectedCase.targetIndex ?? 0)
          : subject
      ).hover();
    }

    // Retain the captured list focus state after Base UI hover navigation.
    if (
      selectedCase.element === "select-list" &&
      selectedCase.state !== "focus"
    ) {
      await page.evaluate(() => {
        // SAFETY: the consumer fixture renders native HTML focus targets; null preserves the original optional blur.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Actual authored HTML focus target boundary.
        const active = document.activeElement as HTMLElement | null;

        return active?.blur();
      });
    }

    if (selectedCase.element === "select-list") {
      await subject.locator('[data-slot="select-viewport"]').evaluate(
        (node, value) => {
          node.scrollTop = value;
        },
        (selectedCase.value ?? 0) * selectedCase.scale
      );
    }

    await page.evaluate(async () => {
      const frameCompletion6 = Promise.withResolvers();

      try {
        requestAnimationFrame(() => {
          requestAnimationFrame(frameCompletion6.resolve);
        });
      } catch (error) {
        frameCompletion6.reject(error);
      }

      return await frameCompletion6.promise;
    });

    for (const label of await subject.locator("[data-mc-label-ready]").all()) {
      await expect(label).toHaveAttribute("data-mc-label-ready", "true");
    }
  }
};

const prepareChoiceControlState = async (
  c: FixtureReferenceCase,
  name: string,
  page: Page,
  subject: Locator
) => {
  if (["radio-group", "switch"].includes(name)) {
    // SAFETY: the registered radio-group and switch captures both emit required numeric x/y coordinates.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact positioned capture producer boundary.
    const positionedCase = c as PositionedReferenceCase;
    await subject.evaluate(
      (node: HTMLElement, placementCase: PositionedReferenceCase) =>
        Object.assign(node.style, {
          left: `${placementCase.x * placementCase.scale}px`,
          position: "fixed",
          top: `${placementCase.y * placementCase.scale}px`,
        }),
      positionedCase
    );
    await page.addStyleTag({
      content: `html,body{background:${c.background}} #root{visibility:hidden} [data-subject]{visibility:visible}`,
    });

    if (c.state === "focus") {
      await subject.focus();
    }

    if (c.state === "hover") {
      await subject.hover();
    }
  }

  if (
    !["tabs", "select", "radio-group", "switch"].includes(name) &&
    c.state === "hover"
  ) {
    await (
      c.element === "scroll-area"
        ? subject.locator('[data-slot="scroll-area-scrollbar"]')
        : subject
    ).hover();
  }

  if (
    !["tabs", "select", "radio-group", "switch"].includes(name) &&
    c.state.startsWith("focus")
  ) {
    await page.keyboard.press("Tab");

    if (c.state === "focus-locked") {
      await page.keyboard.press("Enter");
    }
  }
};

const prepareEntryControlSelection = async (
  c: FixtureReferenceCase,
  page: Page,
  subject: Locator
) => {
  if (c.element === "input" || c.element === "textarea") {
    const cursor = c.cursor ?? c.text.length;
    const anchor = c.anchor ?? cursor;

    await subject.evaluate(
      (node: HTMLInputElement | HTMLTextAreaElement, selection) => {
        node.setSelectionRange(
          Math.min(selection.cursor, selection.anchor),
          Math.max(selection.cursor, selection.anchor),
          selection.cursor < selection.anchor ? "backward" : "forward"
        );
      },
      { anchor, cursor }
    );

    if (c.element === "textarea") {
      await subject.evaluate(
        (node, scroll) => {
          node.scrollTop = scroll;
        },
        (c.value ?? 0) * c.scale
      );
    }

    await page.clock.runFor(c.caretMs);
    await expect(subject).toHaveAttribute("data-mc-ready", "true");
  }
};

export const verifyFixtureControlCase = async ({
  c,
  manifest,
  manifestFile,
  name,
  page,
  url,
}: InstalledFixtureControlCase) => {
  const params = controlParameters(c, name);

  appendSurfaceParameters(params, c);

  appendSelectionParameters(params, c, name);

  await page.goto(`${url}?${params}`);
  const subject = page.locator("[data-subject]");
  await subject.waitFor();

  await prepareControlAppearance(c, manifest, name, page, subject);

  await page.mouse.move(0, 0);

  await prepareTabsControlState(c, name, page, subject);

  await prepareSelectControlState(c, name, page, subject);

  await prepareChoiceControlState(c, name, page, subject);

  await prepareEntryControlSelection(c, page, subject);

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
    `Installed pixels differ: ${c.name}`
  );

  return {
    decodedRgbaSha256: sha(actual.data),
    mismatchedPixels: 0,
    name: c.name,
  };
};
