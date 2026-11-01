// The CLI may convert LF/CRLF on Windows; raw source and installed hashes remain recorded.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { installedRegistryFile } from "@grasscn/tests/installed-registry-file";
import { chromium, expect } from "@playwright/test";
import { verifyCollapsibleCase } from "@ppt/installed/verify-collapsible-installed";
import { repoRoot, webFile, pixelPerfectFile } from "@ppt/paths";
import { evidenceFile } from "@ppt/runtime/evidence-paths";
import { PNG } from "pngjs";

const [
  consumerDir,
  name,
  url,
  uiDirectory = "src/components/ui",
  referenceManifest,
] = process.argv.slice(2);

if (!consumerDir || !name || !url) {
  throw new Error(
    "Usage: bun src/installed/verify-installed.mjs <initialized-consumer-dir> <item-name> <consumer-fixture-url> [installed-ui-directory]"
  );
}

const json = async (file) =>
  JSON.parse(await readFile(evidenceFile(file), "utf-8"));

const map = await json("registry/minecraft-map.json");
const component = map.components.find((c) => c.name === name);

const item = (await json("registry.json")).items.find(
  (item) => item.name === name
);

assert.ok(
  component?.pixelVerification.manifest && item,
  "Need a registered item with an independent native manifest"
);

const manifestFile = referenceManifest ?? component.pixelVerification.manifest;

assert.ok(
  [
    component.pixelVerification.manifest,
    ...(component.pixelVerification.additionalManifests ?? []),
  ].includes(manifestFile),
  "Reference manifest must be registered on the component"
);

const manifest = await json(manifestFile);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

const consumerSettings = JSON.parse(
  await readFile(path.resolve(consumerDir, "components.json"), "utf-8")
);

const canonical = (bytes) => {
  let text = bytes
    .toString()
    .replaceAll("\r\n", "\n")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  if (consumerSettings.rsc === false) {
    text = text.replace(/^["']use client["'];?\s*/, "");
  }

  return text.replace(/^(?:\/\/[^\n]*\n\s*)+/, "");
};

const files = [];

for (const entry of item.files) {
  const filename = path.basename(entry.path);

  const installed = await readFile(
    installedRegistryFile(entry, consumerDir, consumerSettings, uiDirectory)
  );

  const source = await readFile(webFile(path.join(entry.path)));
  assert.ok(
    canonical(installed) === canonical(source),
    `${filename} changed beyond permitted CLI transforms`
  );
  files.push({
    comparison:
      "Equal except CLI line-ending conversion, comment removal and use-client removal for rsc:false; data URIs unchanged",
    installedSha256: sha(installed),
    path: filename,
    sourcePath: entry.path,
    sourceSha256: sha(source),
  });
}

let browser = await chromium.launch({ channel: "msedge" });
const browserVersion = browser.version();
let page;

const pageErrors = [];
const cases = [];

async function preparePage() {
  page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { height: 900, width: 1280 },
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  if (["tabs", "select"].includes(name)) {
    await page.addInitScript(() => {
      Date.now = () =>
        Number(new URLSearchParams(location.search).get("timeMs") ?? 0);
    });
  }

  if (name === "input" || name === "textarea") {
    await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));
  }

  if (
    name === "collapsible" ||
    name === "menubar" ||
    name === "context-menu" ||
    name === "dropdown-menu" ||
    name === "popover" ||
    name === "alert-dialog" ||
    name === "dialog" ||
    name === "tooltip" ||
    name === "tabs" ||
    name === "select" ||
    name === "radio-group" ||
    name === "switch" ||
    manifest.effectiveAssets
  ) {
    await page.setViewportSize({ height: 900, width: 1536 });
  }
}

try {
  await preparePage();

  for (const c of manifest.cases) {
    if (name === "toggle" || name === "toggle-group") {
      await page.setViewportSize({ height: 900, width: 1536 });
      const renderings = [];

      for (const type of name === "toggle-group"
        ? ["single", "multiple"]
        : ["single"]) {
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

        await page.evaluate(
          async () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve))
            )
        );

        const expectedBytes = await readFile(
          pixelPerfectFile(
            path.join(path.dirname(manifestFile), "captures", c.name)
          )
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
        renderings.push(sha(actual.data));
      }

      cases.push({
        decodedRgbaSha256: renderings[0],
        mismatchedPixels: 0,
        name: c.name,
        ...(name === "toggle-group"
          ? { multipleDecodedRgbaSha256: renderings[1] }
          : {}),
      });
      continue;
    }

    if (cases.length > 0 && cases.length % 64 === 0) {
      console.log(
        `Installed ${name}: ${cases.length}/${manifest.cases.length} exact reference cases verified`
      );
      await page.close();

      if (cases.length % 256 === 0) {
        await browser.close();
        browser = await chromium.launch({ channel: "msedge" });
        assert.equal(
          browser.version(),
          browserVersion,
          "Browser version changed during verification"
        );
      }

      await preparePage();
    }

    if (name === "collapsible") {
      cases.push(await verifyCollapsibleCase({ c, manifestFile, page, url }));
      continue;
    }

    if (
      name === "dropdown-menu" ||
      name === "context-menu" ||
      (name === "menubar" &&
        ![
          "tests/reference/manifest.json",
          "tests/reference/button-cjk/manifest.json",
        ].includes(manifestFile))
    ) {
      let result;

      for (const kind of c.element === "menu-checkbox"
        ? ["menu-checkbox", "menu-radio"]
        : [c.element]) {
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
        await subject.evaluate((node) => node.focus());

        if (c.selectedIndex >= 0) {
          await subject.getByRole("menuitem").nth(c.selectedIndex).focus();
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
          await subject.getByRole("menuitem").nth(c.targetIndex).hover();
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
          await expect(line).toHaveAttribute(
            "data-mc-menu-unicode-ready",
            "true"
          );
        }

        for (const icon of await subject
          .locator("[data-mc-menu-sprite-ready]")
          .all()) {
          await expect(icon).toHaveAttribute(
            "data-mc-menu-sprite-ready",
            "true"
          );
        }

        await page.evaluate(
          async () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve))
            )
        );
        const bounds = await subject.boundingBox();
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
          `Installed Menu pixels differ: ${c.name} ${kind}`
        );

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

      cases.push(result);
      continue;
    }

    if (name === "menubar") {
      let result;

      for (const open of c.state === "hover" ? [false, true] : [false]) {
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

        for (const line of await trigger
          .locator("[data-mc-label-ready]")
          .all()) {
          await expect(line).toHaveAttribute("data-mc-label-ready", "true");
        }

        await page.evaluate(
          async () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve))
            )
        );
        const bounds = await trigger.boundingBox();
        assert.deepEqual(
          [bounds.x, bounds.y],
          [(c.x ?? 16) * c.scale, (c.y ?? 16) * c.scale]
        );

        const bytes = await readFile(
          pixelPerfectFile(
            path.join(path.dirname(manifestFile), "captures", c.name)
          )
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

      cases.push(result);
      continue;
    }

    if (name === "popover") {
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
        params.set("text", c.text);
        params.set("label", c.label);
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

      await page.evaluate(
        async () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          )
      );
      const bounds = await subject.boundingBox();
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
      cases.push({
        decodedRgbaSha256: sha(actual.data),
        mismatchedPixels: 0,
        name: c.name,
      });
      continue;
    }

    if (name === "dialog" || name === "alert-dialog") {
      const confirmation = name === "alert-dialog";

      const params = new URLSearchParams({
        component: name,
        label: c.label,
        labels: JSON.stringify(c.labels),
        native: "1",
        scale: String(c.scale),
        state: c.state,
      });

      if (confirmation) {
        params.set("native", "1");
        params.set("blur", String(c.value));
      } else {
        params.set("wrapWidth", String(c.wrapWidth));
      }

      const optionalText = c.text;

      if (optionalText !== null && optionalText !== undefined) {
        params.set("text", c.text);
      }

      const optionalDisabledIndex = c.disabledIndex;

      if (
        optionalDisabledIndex !== null &&
        optionalDisabledIndex !== undefined
      ) {
        params.set("disabledIndex", String(c.disabledIndex));
      }

      if (c.checked) {
        params.set("patterned", "1");
      }

      await page.goto(`${url}?${params}`);
      await page.addStyleTag({
        content: `html,body{background:${c.background}} #root{opacity:0}`,
      });
      const dialog = page.getByRole(confirmation ? "alertdialog" : "dialog");
      await expect(dialog).toHaveAttribute(
        confirmation ? "data-mc-confirmation-ready" : "data-mc-dialog-ready",
        "true"
      );

      if (confirmation) {
        const count =
          Number(/[^\u0000-\u007F]/.test(c.label)) +
          (/[^\u0000-\u007F]/.test(c.text) ? c.text.split("\n").length : 0) +
          c.labels.filter((label) => /[^\u0000-\u007F]/.test(label)).length;

        if (count) {
          await expect(dialog.locator("[data-mc-label-ready]")).toHaveCount(
            count
          );

          for (const line of await dialog
            .locator("[data-mc-label-ready]")
            .all()) {
            await expect(line).toHaveAttribute("data-mc-label-ready", "true");
          }
        }

        await expect(
          page.locator('[data-slot="alert-dialog-overlay"]')
        ).toHaveAttribute("data-mc-confirmation-gpu-ready", "true");
      } else {
        await expect(
          page.locator('[data-slot="dialog-overlay"]')
        ).toHaveAttribute("data-mc-backdrop-ready", "true");

        if (/[^\u0000-\u007F]/.test((c.label ?? "") + (c.text ?? ""))) {
          await expect(
            dialog.locator("[data-mc-dialog-unicode-ready]")
          ).toHaveCount(3);

          for (const line of await dialog
            .locator("[data-mc-dialog-unicode-ready]")
            .all()) {
            await expect(line).toHaveAttribute(
              "data-mc-dialog-unicode-ready",
              "true"
            );
          }
        }
      }

      await page.mouse.move(0, 0);
      const button = dialog.getByRole("button").nth(c.targetIndex ?? 0);

      if (c.state === "hover") {
        await button.hover();
      }

      if (c.state === "focus") {
        await button.focus();
      }

      await page.evaluate(
        async () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          )
      );

      const bytes = await readFile(
        pixelPerfectFile(
          path.join(path.dirname(manifestFile), "captures", c.name)
        )
      );

      assert.equal(sha(bytes), c.sha256);

      const expected = PNG.sync.read(bytes);
      const actual = PNG.sync.read(await page.screenshot());

      assert.deepEqual(
        [actual.width, actual.height],
        [expected.width, expected.height]
      );
      assert.ok(
        actual.data.equals(expected.data),
        `Installed pixels differ: ${c.name}`
      );
      cases.push({
        decodedRgbaSha256: sha(actual.data),
        mismatchedPixels: 0,
        name: c.name,
      });
      continue;
    }

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

    if (c.element === "card") {
      params.set("height", String(c.height));

      const optionalText = c.text;

      if (optionalText !== null && optionalText !== undefined) {
        params.set("text", c.text);
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

    if (name === "tabs") {
      for (const key of [
        "selected",
        "selectedIndex",
        "targetIndex",
        "disabledIndex",
        "timeMs",
        "contentHeight",
      ]) {
        const optionalParameter = c[key];

        if (optionalParameter !== null && optionalParameter !== undefined) {
          params.set(key, String(c[key]));
        }
      }

      if (c.labels) {
        params.set("labels", JSON.stringify(c.labels));
      }
    }

    if (name === "select") {
      params.set("height", String(c.height));

      for (const key of ["selectedIndex", "disabledIndex", "timeMs"]) {
        const optionalParameter = c[key];

        if (optionalParameter !== null && optionalParameter !== undefined) {
          params.set(key, String(c[key]));
        }
      }

      if (c.labels) {
        params.set("labels", JSON.stringify(c.labels));
      }
    }

    await page.goto(`${url}?${params}`);
    const subject = page.locator("[data-subject]");
    await subject.waitFor();

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
        (node, position) => {
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
      await expect(subject).toHaveAttribute(
        "data-mc-label-layout-ready",
        "true"
      );

      for (const line of await subject.locator("[data-mc-label-ready]").all()) {
        await expect(line).toHaveAttribute("data-mc-label-ready", "true");
      }
    }

    if ((name === "input" || name === "textarea") && manifest.effectiveAssets) {
      await subject.evaluate(
        (node, position) => {
          Object.assign(node.style, {
            left: `${position.x}px`,
            position: "fixed",
            top: `${position.y}px`,
          });
        },
        { x: c.x * c.scale, y: c.y * c.scale }
      );
      await expect(subject).toHaveAttribute("data-mc-bitmap", "true");
    }

    if (name === "button" && manifest.effectiveAssets) {
      await page.addStyleTag({
        content: "#root > :not([data-subject]) { visibility: hidden; }",
      });
      await subject.evaluate(
        (node, position) => {
          Object.assign(node.style, {
            left: `${position.x}px`,
            position: "fixed",
            top: `${position.y}px`,
          });
        },
        { x: c.x * c.scale, y: c.y * c.scale }
      );
      await expect(subject.locator("[data-mc-label-ready]")).toHaveAttribute(
        "data-mc-label-ready",
        "true"
      );
    }

    if (["card", "separator", "scroll-area", "progress"].includes(c.element)) {
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

    await page.mouse.move(0, 0);

    if (name === "tabs") {
      await subject.evaluate(
        (node, p) =>
          Object.assign(node.style, {
            left: `${p.x}px`,
            position: "fixed",
            top: `${p.y}px`,
            visibility: "visible",
            width: `${p.width}px`,
          }),
        { width: c.width * c.scale, x: c.x * c.scale, y: c.y * c.scale }
      );
      await page.addStyleTag({
        content: `html,body{background:${c.background}} #root{visibility:hidden} [data-subject]{visibility:visible}`,
      });

      if (c.element === "tabs-trigger") {
        await expect(subject).toHaveAttribute("data-mc-tab-ready", "true");

        if (c.state.endsWith("hover")) {
          await subject.hover();
        }

        if (c.state === "focus") {
          await subject.focus();
        }
      } else {
        const list = c.contentHeight
          ? subject.locator('[data-slot="tabs-list"]')
          : subject;

        await expect(list).toHaveAttribute("data-mc-tabs-ready", "true");
        const target = list.getByRole("tab").nth(c.targetIndex ?? 0);

        if (c.state === "hover") {
          await target.hover();
        }

        if (c.state === "focus") {
          await target.focus();
        }
      }

      for (const label of await subject
        .locator("[data-mc-label-ready]")
        .all()) {
        await expect(label).toHaveAttribute("data-mc-label-ready", "true");
      }
    }

    if (name === "select") {
      await subject.evaluate(
        (node, p) =>
          Object.assign(node.style, {
            height: `${p.height}px`,
            left: `${p.x}px`,
            position: "fixed",
            top: `${p.y}px`,
            width: `${p.width}px`,
          }),
        {
          height: c.height * c.scale,
          width: c.width * c.scale,
          x: c.x * c.scale,
          y: c.y * c.scale,
        }
      );
      await page.addStyleTag({
        content: `html,body{background:${c.background}} #root{visibility:hidden;${c.element === "select-list" ? "opacity:0;" : ""}} [data-subject]{visibility:visible} [data-mc-positioner]{left:0!important;top:0!important;transform:none!important}`,
      });
      await expect(subject).toHaveAttribute("data-mc-select-ready", "true");

      if (c.state === "focus") {
        await subject.focus();
      } else {
        await page.evaluate(() => document.activeElement?.blur());
      }

      if (c.state.endsWith("hover")) {
        await (
          c.element === "select-list"
            ? subject.getByRole("option").nth(c.targetIndex ?? 0)
            : subject
        ).hover();
      }

      // Retain the captured list focus state after Base UI hover navigation.
      if (c.element === "select-list" && c.state !== "focus") {
        await page.evaluate(() => document.activeElement?.blur());
      }

      if (c.element === "select-list") {
        await subject.locator('[data-slot="select-viewport"]').evaluate(
          (node, value) => {
            node.scrollTop = value;
          },
          (c.value ?? 0) * c.scale
        );
      }

      await page.evaluate(
        async () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          )
      );

      for (const label of await subject
        .locator("[data-mc-label-ready]")
        .all()) {
        await expect(label).toHaveAttribute("data-mc-label-ready", "true");
      }
    }

    if (["radio-group", "switch"].includes(name)) {
      await subject.evaluate(
        (node, c) =>
          Object.assign(node.style, {
            left: `${c.x * c.scale}px`,
            position: "fixed",
            top: `${c.y * c.scale}px`,
          }),
        c
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

    if (c.element === "input" || c.element === "textarea") {
      const cursor = c.cursor ?? c.text.length;
      const anchor = c.anchor ?? cursor;

      await subject.evaluate(
        (node, selection) =>
          node.setSelectionRange(
            Math.min(selection.cursor, selection.anchor),
            Math.max(selection.cursor, selection.anchor),
            selection.cursor < selection.anchor ? "backward" : "forward"
          ),
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

    const expectedBytes = await readFile(
      pixelPerfectFile(
        path.join(path.dirname(manifestFile), "captures", c.name)
      )
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
    cases.push({
      decodedRgbaSha256: sha(actual.data),
      mismatchedPixels: 0,
      name: c.name,
    });
  }

  assert.deepEqual(pageErrors, []);

  const report = {
    browser: browserVersion,
    caseIsolation:
      "Fresh page/context every64 cases; browser restarted every256 cases",
    cases,
    command: `shadcn add http://localhost:5173/r/${name}.json --yes --overwrite`,
    consumer: "separate initialized shadcn Vite/React consumer",
    consumerRsc: consumerSettings.rsc,
    devicePixelRatio: 1,
    files,
    pageErrors,
    sourceJarSha256: manifest.sourceJarSha256,
  };

  const reportFile =
    manifestFile === component.pixelVerification.manifest &&
    component.pixelVerification.installationReport
      ? component.pixelVerification.installationReport
      : (component.pixelVerification.additionalInstallationReports?.[
          manifestFile
        ] ??
        path.join(
          path.dirname(manifestFile),
          "installation-verification.json"
        ));

  await writeFile(
    evidenceFile(reportFile),
    `${JSON.stringify(report, null, 2)}\n`
  );
  console.log(
    `Installed ${name}: ${cases.length} native cases match exactly; ${files.length} sources match permitted CLI transforms; no browser errors`
  );
} finally {
  await browser.close();
}
