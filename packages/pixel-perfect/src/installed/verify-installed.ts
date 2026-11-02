// The CLI may convert LF/CRLF on Windows; raw source and installed hashes remain recorded.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { installedRegistryFile } from "@grasscn/tests/installed-registry-file";
import type { InstalledComponentSettings } from "@grasscn/tests/installed-registry-file";
import { chromium, expect } from "@playwright/test";
import type {
  ToggleReferenceCase,
  PositionedReferenceCase,
  MenuReferenceCase,
  MenubarTriggerReferenceCase,
  PopoverReferenceCase,
  DialogReferenceCase,
  FixtureReferenceCase,
  TabsReferenceCase,
  SelectReferenceCase,
  InstalledReferenceManifest,
  InstalledCaseResult,
} from "@ppt/installed/reference-case";
import type { CollapsibleReferenceCase } from "@ppt/installed/verify-collapsible-installed";
import { verifyCollapsibleCase } from "@ppt/installed/verify-collapsible-installed";
import { webFile, pixelPerfectFile } from "@ppt/paths";
import { evidenceFile } from "@ppt/runtime/evidence-paths";
import { PNG } from "pngjs";

import type registry from "../../../../apps/web/registry.json";
import type minecraftMap from "../../../../apps/web/registry/minecraft-map.json";

const [
  consumerDir,
  name,
  url,
  uiDirectory = "src/components/ui",
  referenceManifest,
] = process.argv.slice(2);

if (!consumerDir || !name || !url) {
  throw new Error(
    "Usage: bun src/installed/verify-installed.ts <initialized-consumer-dir> <item-name> <consumer-fixture-url> [installed-ui-directory]"
  );
}

// Keep the original asynchronous read/parse boundary for each concrete producer.
const readRegistryMap = async () =>
  // SAFETY: this fresh document is the authored registry map.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The exact registry map owns this JSON document.
  JSON.parse(
    await readFile(evidenceFile("registry/minecraft-map.json"), "utf-8")
  ) as typeof minecraftMap;

const readRegistryItems = async () =>
  // SAFETY: registry.json is the registry producer for the installed source list.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Specific authored registry document boundary.
  JSON.parse(
    await readFile(evidenceFile("registry.json"), "utf-8")
  ) as typeof registry;

const readReferenceManifest = async (file: string) =>
  // SAFETY: the caller checks the component's registered manifest paths before reading this capture.mjs/capture-controls.mjs document.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Registered capture producer owns the identity/case protocol.
  JSON.parse(
    await readFile(evidenceFile(file), "utf-8")
  ) as InstalledReferenceManifest;

const map = await readRegistryMap();
const component = map.components.find((c) => c.name === name);

const registeredItems = await readRegistryItems();
const item = registeredItems.items.find((candidate) => candidate.name === name);

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

const manifest = await readReferenceManifest(manifestFile);

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

// SAFETY: this is the initialized shadcn consumer configuration read by installedRegistryFile.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Actual installed consumer configuration boundary.
const consumerSettings = JSON.parse(
  await readFile(path.resolve(consumerDir, "components.json"), "utf-8")
) as InstalledComponentSettings & { rsc?: boolean };

const canonical = (bytes: Buffer) => {
  let text = bytes
    .toString()
    .replaceAll("\r\n", "\n")
    .replaceAll(/\/\*[\s\S]*?\*\//gu, "")
    .trim();

  if (consumerSettings.rsc === false) {
    text = text.replace(/^["']use client["'];?\s*/u, "");
  }

  return text.replace(/^(?:\/\/[^\n]*\n\s*)+/u, "");
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

const pageErrors: string[] = [];
const cases: (InstalledCaseResult | undefined)[] = [];

async function preparePage() {
  const page = await browser.newPage({
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

  return page;
}

try {
  let page = await preparePage();

  for (const referenceCase of manifest.cases) {
    if (name === "toggle" || name === "toggle-group") {
      // SAFETY: registered item dispatch selects this capture producer's case protocol; no data or checks are changed.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registered native-case boundary.
      const c = referenceCase as ToggleReferenceCase;
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

        await page.evaluate(async () => {
          const frameCompletion = Promise.withResolvers();

          try {
            requestAnimationFrame(() => {
              requestAnimationFrame(frameCompletion.resolve);
            });
          } catch (error) {
            frameCompletion.reject(error);
          }

          return frameCompletion.promise;
        });

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

      page = await preparePage();
    }

    if (name === "collapsible") {
      // SAFETY: registered item dispatch selects this capture producer's case protocol; no data or checks are changed.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registered native-case boundary.
      const c = referenceCase as CollapsibleReferenceCase;
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
      // SAFETY: registered item dispatch selects this capture producer's case protocol; no data or checks are changed.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registered native-case boundary.
      const c = referenceCase as MenuReferenceCase;
      let result: InstalledCaseResult | undefined;

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
        await subject.evaluate((node: HTMLElement) => node.focus());

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

        await page.evaluate(async () => {
          const frameCompletion2 = Promise.withResolvers();

          try {
            requestAnimationFrame(() => {
              requestAnimationFrame(frameCompletion2.resolve);
            });
          } catch (error) {
            frameCompletion2.reject(error);
          }

          return frameCompletion2.promise;
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
      // SAFETY: registered item dispatch selects this capture producer's case protocol; no data or checks are changed.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registered native-case boundary.
      const c = referenceCase as MenubarTriggerReferenceCase;
      let result: InstalledCaseResult | undefined;

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

        await page.evaluate(async () => {
          const frameCompletion3 = Promise.withResolvers();

          try {
            requestAnimationFrame(() => {
              requestAnimationFrame(frameCompletion3.resolve);
            });
          } catch (error) {
            frameCompletion3.reject(error);
          }

          return frameCompletion3.promise;
        });
        const bounds = (await trigger.boundingBox())!;
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
      // SAFETY: registered item dispatch selects this capture producer's case protocol; no data or checks are changed.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registered native-case boundary.
      const c = referenceCase as PopoverReferenceCase;

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

        return frameCompletion4.promise;
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
      cases.push({
        decodedRgbaSha256: sha(actual.data),
        mismatchedPixels: 0,
        name: c.name,
      });
      continue;
    }

    if (name === "dialog" || name === "alert-dialog") {
      // SAFETY: registered item dispatch selects this capture producer's case protocol; no data or checks are changed.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registered native-case boundary.
      const c = referenceCase as DialogReferenceCase;
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
        params.set("text", optionalText);
      }

      const optionalDisabledIndex = c.disabledIndex;

      if (
        optionalDisabledIndex !== null &&
        optionalDisabledIndex !== undefined
      ) {
        params.set("disabledIndex", String(c.disabledIndex));
      }

      if (c.checked ?? false) {
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
        // The AlertDialog capture producer always emits text; Dialog alone also records null text cases.
        const confirmationText = c.text!;

        const count =
          Number(/\P{ASCII}/u.test(c.label)) +
          (/\P{ASCII}/u.test(confirmationText)
            ? confirmationText.split("\n").length
            : 0) +
          c.labels.filter((label) => /\P{ASCII}/u.test(label)).length;

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

        if (/\P{ASCII}/u.test((c.label ?? "") + (c.text ?? ""))) {
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

      await page.evaluate(async () => {
        const frameCompletion5 = Promise.withResolvers();

        try {
          requestAnimationFrame(() => {
            requestAnimationFrame(frameCompletion5.resolve);
          });
        } catch (error) {
          frameCompletion5.reject(error);
        }

        return frameCompletion5.promise;
      });

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

    // SAFETY: remaining fixture controls dispatch by their captured element discriminator.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Registered fixture-control protocol at the capture boundary.
    const c = referenceCase as FixtureReferenceCase;

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

    await page.mouse.move(0, 0);

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

      for (const label of await subject
        .locator("[data-mc-label-ready]")
        .all()) {
        await expect(label).toHaveAttribute("data-mc-label-ready", "true");
      }
    }

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

      if (selectedCase.state === "focus") {
        await subject.focus();
      } else {
        await page.evaluate(() => {
          // SAFETY: the consumer fixture renders native HTML focus targets; null preserves the original optional blur.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Actual authored HTML focus target boundary.
          const active = document.activeElement as HTMLElement | null;

          return active?.blur();
        });
      }

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

        return frameCompletion6.promise;
      });

      for (const label of await subject
        .locator("[data-mc-label-ready]")
        .all()) {
        await expect(label).toHaveAttribute("data-mc-label-ready", "true");
      }
    }

    if (["radio-group", "switch"].includes(name)) {
      // SAFETY: the registered radio-group and switch captures both emit required numeric x/y coordinates.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact positioned capture producer boundary.
      const positionedCase = c as PositionedReferenceCase;
      await subject.evaluate(
        (node: HTMLElement, c: PositionedReferenceCase) =>
          Object.assign(node.style, {
            left: `${c.x * c.scale}px`,
            position: "fixed",
            top: `${c.y * c.scale}px`,
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

    if (c.element === "input" || c.element === "textarea") {
      const cursor = c.cursor ?? c.text.length;
      const anchor = c.anchor ?? cursor;

      await subject.evaluate(
        (node: HTMLInputElement | HTMLTextAreaElement, selection) =>
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

  interface InstallationReports {
    [manifest: string]: string | undefined;
  }

  const additionalReports: InstallationReports | undefined =
    component.pixelVerification.additionalInstallationReports;

  const reportFile =
    manifestFile === component.pixelVerification.manifest &&
    component.pixelVerification.installationReport
      ? component.pixelVerification.installationReport
      : (additionalReports?.[manifestFile] ??
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
