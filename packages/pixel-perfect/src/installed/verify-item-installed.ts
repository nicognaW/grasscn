import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { packageBin } from "@grasscn/tests/tooling";
import { chromium, expect } from "@playwright/test";
import type {
  ItemVerificationTask,
  InstalledItemResult,
  DecodedPixels,
  ItemCaptureManifest,
} from "@ppt/installed/installed-compositions-protocol";
import type {
  InstalledTextRegistry,
  InstalledTextItem,
  InstalledTextFailure,
} from "@ppt/installed/text-verification-protocol";
import { webFile, repositoryFile, pixelPerfectFile } from "@ppt/paths";
import { evidenceFile } from "@ppt/runtime/evidence-paths";
import { PNG } from "pngjs";

const [consumerArgument, origin, definitionArgument, manifestArgument] =
  process.argv.slice(2);

assert.ok(
  consumerArgument && origin,
  "Usage: bun src/installed/verify-item-installed.ts <consumer> <fixture-url> [registry-item-file] [registered-native-manifest]"
);

const consumer = path.resolve(consumerArgument);
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const tasks: ItemVerificationTask[] = [];
const negativeControls: string[] = [];

let item: InstalledTextItem | undefined;

if (definitionArgument) {
  // SAFETY: the supplied registry descriptor owns the exact Item source list.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete supplied Item descriptor boundary.
  item = JSON.parse(
    fs.readFileSync(path.resolve(definitionArgument), "utf-8")
  ) as InstalledTextItem;
} else {
  // SAFETY: the authored registry document owns this existing Item lookup.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registry descriptor producer boundary.
  const registry = JSON.parse(
    fs.readFileSync(webFile(path.join("registry.json")), "utf-8")
  ) as InstalledTextRegistry;

  item = registry.items.find((item) => item.name === "item");
}

assert.ok(
  item?.name === "item",
  "Need an actual shadcn Item registry definition"
);

// SAFETY: the initialized shadcn consumer components.json owns the optional rsc setting.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete initialized consumer configuration boundary.
const settings = JSON.parse(
  fs.readFileSync(path.join(consumer, "components.json"), "utf-8")
) as { rsc?: boolean };

const canonical = (bytes: Buffer) => {
  let text = bytes
    .toString()
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  if (settings.rsc === false) {
    text = text.replace(/^["']use client["'];?\s*/, "");
  }

  return text.replace(/^(?:\/\/[^\n]*\n\s*)+/, "");
};

const files = item.files.map((file) => {
  const filename = path.basename(file.path);
  const source = fs.readFileSync(webFile(path.join(file.path)));

  const installed = fs.readFileSync(
    path.join(consumer, "src/components/ui", filename)
  );

  assert.equal(
    canonical(installed),
    canonical(source),
    `Unpermitted installed source changes: ${filename}`
  );

  return {
    comparison:
      "Equal except permitted CLI comment/use-client removal; embedded original assets unchanged",
    installedSha256: sha(installed),
    path: filename,
    sourceSha256: sha(source),
  };
});

const types = spawnSync(
  process.execPath,
  [packageBin("typescript", "tsc", consumer), "--noEmit"],
  { cwd: consumer, encoding: "utf-8" }
);

assert.equal(types.status, 0, `${types.stdout ?? ""}${types.stderr ?? ""}`);

const supportedManifests = [
  "tests/reference/item/manifest.json",
  "tests/reference/label/manifest.json",
  "tests/reference/separator/manifest.json",
];

if (manifestArgument) {
  assert.ok(
    supportedManifests.includes(manifestArgument),
    "Unsupported native manifest"
  );
}

for (const [part, directory] of [
  ["row", "item"],
  ["title", "label"],
  ["separator", "separator"],
]) {
  const manifestFile = `tests/reference/${directory}/manifest.json`;

  // SAFETY: the existing registered Item/Label/Separator selection owns this fresh capture read.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete registered Item constituent capture boundary.
  const manifest = JSON.parse(
    fs.readFileSync(evidenceFile(manifestFile), "utf-8")
  ) as ItemCaptureManifest;

  if (manifestArgument && manifestArgument !== manifestFile) {
    continue;
  }

  for (const c of manifest.cases) {
    for (const mode of part === "row"
      ? ["link", "button", ...(c.state.endsWith("hover") ? [] : ["plain"])]
      : ["link"]) {
      tasks.push({
        part,
        manifestFile,
        manifest,
        c,
        mode,
        plain: mode === "plain",
      });
    }
  }
}

const browser = await chromium.launch({ channel: "msedge" });
const browserVersion = browser.version();
const results: InstalledItemResult[] = [];
const errors: string[] = [];

let next = 0;

const failures = repositoryFile(
  path.join(".pixel-perfect-test/item-installed-pixel-failures")
);

fs.mkdirSync(failures, { recursive: true });

function compare(a: DecodedPixels, b: DecodedPixels) {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`Dimensions ${a.width}x${a.height}/${b.width}x${b.height}`);
  }

  let mismatchedPixels = 0;
  const diff = new PNG({ height: a.height, width: a.width });

  for (let i = 0; i < a.data.length; i += 4) {
    const mismatch = !a.data
      .subarray(i, i + 4)
      .equals(b.data.subarray(i, i + 4));

    mismatchedPixels += +mismatch;
    diff.data.set(
      mismatch
        ? [255, 0, 255, 255]
        : [
            Math.floor(a.data[i] / 4),
            Math.floor(a.data[i + 1] / 4),
            Math.floor(a.data[i + 2] / 4),
            255,
          ],
      i
    );
  }

  return { diff, mismatchedPixels };
}

async function worker() {
  let page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { height: 900, width: 1536 },
  });

  let count = 0;

  page.on("pageerror", (error) => errors.push(error.message));

  while (next < tasks.length) {
    const taskIndex = next;
    next += 1;
    const { part, c, manifestFile, manifest, plain, mode } = tasks[taskIndex];

    try {
      const previousCaseCount = count;
      count += 1;

      if (previousCaseCount && count % 50 === 0) {
        await page.close();
        page = await browser.newPage({
          deviceScaleFactor: 1,
          viewport: { height: 900, width: 1536 },
        });
        page.on("pageerror", (error) => errors.push(error.message));
      }

      const q = new URLSearchParams({
        align: c.alignment ?? "left",
        background: c.background,
        component: "item",
        description: c.placeholder ?? "Survival Mode",
        height: String(c.height),
        label: c.label ?? "New World",
        part,
        scale: String(c.scale),
        selected: String(c.selected ?? false),
        state: c.state,
        text: c.text ?? "world-1",
        width: String(c.width),
        x: String(c.x),
        y: String(c.y),
      });

      const optionalWrapWidth = c.wrapWidth;

      if (optionalWrapWidth !== null && optionalWrapWidth !== undefined) {
        q.set("wrapWidth", String(c.wrapWidth));
      }

      if (plain) {
        q.set("plain", "1");
      }

      if (mode === "button") {
        q.set("button", "1");
      }

      await page.goto(`${origin}?${q}`);
      const subject = page.locator("#subject");
      await expect(subject).toHaveAttribute(
        "data-slot",
        part === "row" ? "item" : `item-${part}`
      );
      await expect(subject).toBeVisible();
      await page.mouse.move(0, 0);

      if (part === "row") {
        await expect(
          subject.locator("[data-slot=item-content]")
        ).toHaveAttribute("data-mc-item-content-ready", "true");

        for (const text of await subject
          .locator("[data-mc-label-layout-ready]")
          .all()) {
          await expect(text).toHaveAttribute(
            "data-mc-label-layout-ready",
            "true"
          );
        }

        const media = subject.locator("[data-mc-item-media-ready]");
        await expect(media).toHaveAttribute("data-mc-item-media-ready", "true");

        if (c.state === "hover") {
          await subject.hover();
        }

        if (c.state === "icon-hover") {
          const box = await subject.boundingBox();
          await page.mouse.move(box!.x + 18 * c.scale, box!.y + 18 * c.scale);
        }

        if (c.state === "focus") {
          await subject.focus();
          await page.keyboard.press("Tab");
          await page.keyboard.press("Shift+Tab");
          await expect(subject).toBeFocused();
        }

        await expect(media).toHaveAttribute(
          "data-mc-item-media-state",
          c.state === "hover" ? "1" : c.state === "icon-hover" ? "2" : "0"
        );
      } else if (part === "title") {
        await expect(subject).toHaveAttribute(
          "data-mc-label-layout-ready",
          "true"
        );
      }

      await page.addStyleTag({
        content:
          "#read-ref,#resize,#tag,#events,#actions{visibility:hidden!important}",
      });

      for (const glyph of await subject
        .locator("[data-mc-label-ready]")
        .all()) {
        await expect(glyph).toHaveAttribute("data-mc-label-ready", "true");
      }

      await page.evaluate(
        async () =>
          // oxlint-disable-next-line promise/avoid-new -- Preserve this page-realm two-frame barrier and its existing settlement value.
          new Promise((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(resolve);
            });
          })
      );

      const bytes = fs.readFileSync(
        pixelPerfectFile(
          path.join(path.dirname(manifestFile), "captures", c.name)
        )
      );

      if (sha(bytes) !== c.sha256) {
        throw new Error("Reference PNG integrity mismatch");
      }

      const expected = PNG.sync.read(bytes);
      const actualBytes = await subject.screenshot();
      const actual = PNG.sync.read(actualBytes);
      const { mismatchedPixels, diff } = compare(expected, actual);

      if (!negativeControls.includes(part)) {
        const changed = PNG.sync.read(PNG.sync.write(expected));
        changed.data[0] ^= 1;

        if (compare(expected, changed).mismatchedPixels !== 1) {
          throw new Error("One-pixel comparator negative control failed");
        }

        negativeControls.push(part);
      }

      results.push({
        decodedRgbaSha256: sha(actual.data),
        manifest: manifestFile,
        mismatchedPixels,
        mode,
        name: c.name,
        part,
        plain,
        sourceJarSha256: manifest.sourceJarSha256,
      });

      if (mismatchedPixels) {
        const id = `${part}-${mode}-${c.name}`;
        console.log(id, mismatchedPixels);
        fs.writeFileSync(path.join(failures, `actual-${id}`), actualBytes);
        fs.writeFileSync(
          path.join(failures, `diff-${id}`),
          PNG.sync.write(diff)
        );
      }
    } catch (failure) {
      // SAFETY: preserve the existing message projection from the owned Node/PNG/Playwright APIs without normalizing arbitrary rejections.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact installed Item failure message projection boundary.
      const error = failure as InstalledTextFailure;
      const message = `${part}/${plain ? "plain/" : ""}${c.name}: ${error.message}`;
      errors.push(message);
      console.log(message);
    }
  }

  await page.close();
}

await Promise.all([worker(), worker()]);

await browser.close();

assert.deepEqual(errors, []);

assert.ok(
  results.every((result) => result.mismatchedPixels === 0),
  "Installed Item pixels differ"
);

for (const [manifestFile, output, _part] of [
  [
    "tests/reference/item/manifest.json",
    "installation-verification.json",
    "row",
  ],
  [
    "tests/reference/label/manifest.json",
    "title-installation-verification.json",
    "title",
  ],
  [
    "tests/reference/separator/manifest.json",
    "separator-installation-verification.json",
    "separator",
  ],
]) {
  if (manifestArgument && manifestArgument !== manifestFile) {
    continue;
  }

  // SAFETY: the existing registered Item/Label/Separator selection owns this fresh capture read.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete registered Item constituent capture boundary.
  const manifest = JSON.parse(
    fs.readFileSync(evidenceFile(manifestFile), "utf-8")
  ) as ItemCaptureManifest;

  const cases = manifest.cases.map((c) => {
    const matching = results.filter(
      (result) => result.manifest === manifestFile && result.name === c.name
    );

    const primary = matching.find((result) => result.mode === "link");

    assert.ok(primary);
    assert.ok(
      matching.every(
        (result) => result.decodedRgbaSha256 === primary.decodedRgbaSha256
      ),
      `Element aliases differ: ${c.name}`
    );

    const button = matching.find((result) => result.mode === "button");
    const plain = matching.find((result) => result.mode === "plain");

    return {
      decodedRgbaSha256: primary.decodedRgbaSha256,
      mismatchedPixels: 0,
      name: c.name,
      ...(button ? { buttonDecodedRgbaSha256: button.decodedRgbaSha256 } : {}),
      ...(plain ? { plainDecodedRgbaSha256: plain.decodedRgbaSha256 } : {}),
    };
  });

  fs.writeFileSync(
    pixelPerfectFile(path.join("tests/reference/item", output)),
    `${JSON.stringify(
      {
        browser: browserVersion,
        caseIsolation:
          "Two workers; fresh page every50 cases; all browsers closed finally; fixture controls hidden after keyboard focus before screenshots",
        cases,
        command: "shadcn add <local-registry>/r/item.json --yes --overwrite",
        comparatorNegativeControls: negativeControls,
        consumer:
          "Separate initialized Vite/React shadcn consumer with independent npm dependencies",
        consumerRsc: settings.rsc,
        devicePixelRatio: 1,
        files,
        pageErrors: errors,
        sourceJarSha256: manifest.sourceJarSha256,
        typecheck: { command: "bun --bun tsc --noEmit", exitCode: 0 },
        viewport: [1536, 900],
      },
      null,
      2
    )}\n`
  );
}

console.log(
  `Installed Item: ${results.length} native appearances exact;${files.length} canonical sources;types pass;no browser errors`
);
