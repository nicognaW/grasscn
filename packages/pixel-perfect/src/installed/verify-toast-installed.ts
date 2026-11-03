import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { Page } from "@playwright/test";
import { chromium, expect } from "@playwright/test";
import type {
  ToastCaptureManifest,
  DecodedPixels,
} from "@ppt/installed/control-capture-protocol";
import type { InstalledTextRegistry } from "@ppt/installed/text-verification-protocol";
import { repoRoot, pixelPerfectFile, webFile } from "@ppt/paths";
import { PNG } from "pngjs";

const [consumerArg, componentArg, urlArg] = process.argv.slice(2);

assert.ok(
  consumerArg && ["sonner"].includes(componentArg) && urlArg,
  "Usage: bun src/installed/verify-toast-installed.ts <consumer> <sonner> <fixture-url>"
);

const consumer = path.resolve(consumerArg);
const ref = pixelPerfectFile(path.join("tests/reference/toast"));

// SAFETY: the fixed Toast reference path owns this fresh capture manifest read.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact Toast capture producer boundary.
const manifest = JSON.parse(
  fs.readFileSync(`${ref}/manifest.json`).toString()
) as ToastCaptureManifest;

const { cases } = manifest;
const results = [];

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

// SAFETY: the authored registry owns this fresh installed source descriptor read.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registry descriptor producer boundary.
const registry = JSON.parse(
  fs.readFileSync(webFile(path.join("registry.json"))).toString()
) as InstalledTextRegistry;

const item = registry.items.find((i) => i.name === componentArg);

// SAFETY: the initialized shadcn consumer configuration owns its optional rsc setting.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete initialized consumer configuration boundary.
const settings = JSON.parse(
  fs.readFileSync(path.join(consumer, "components.json")).toString()
) as { rsc?: boolean };

assert.ok(item);

const canonical = (bytes: Buffer) => {
  let t = bytes
    .toString()
    .replaceAll(/\/\*[\s\S]*?\*\//gu, "")
    .trim();

  if (settings.rsc === false) {
    t = t.replace(/^["']use client["'];?\s*/u, "");
  }

  return t.replace(/^(?:\/\/[^\n]*\n\s*)+/u, "");
};

const files = item.files.map((file) => {
  const basename = path.basename(file.path);

  const installedPath =
    file.type === "registry:hook"
      ? `src/hooks/${basename}`
      : `src/components/ui/${basename}`;

  const source = fs.readFileSync(webFile(path.join(file.path)));
  const installed = fs.readFileSync(path.join(consumer, installedPath));

  assert.equal(
    canonical(installed),
    canonical(source),
    `${file.path} changed beyond CLI transforms`
  );

  return {
    path: basename,
    ...(file.type === "registry:hook" ? { sourcePath: file.path } : {}),
    installedPath,
    sourceSha256: sha(source),
    installedSha256: sha(installed),
    comparison:
      "Identical except CLI comments and use-client removal for rsc:false; embedded assets unchanged",
  };
});

const comparator = (a: DecodedPixels, b: DecodedPixels) => {
  assert.deepEqual([a.width, a.height], [b.width, b.height]);
  let n = 0;

  for (let i = 0; i < a.data.length; i += 4) {
    if (!a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4))) {
      n += 1;
    }
  }

  return n;
};

const control = PNG.sync.read(
  fs.readFileSync(`${ref}/captures/${manifest.cases[0].name}`)
);

const mutation = PNG.sync.read(PNG.sync.write(control));

// oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
mutation.data[0] ^= 1;

assert.equal(comparator(control, mutation), 1);

const browser = await chromium.launch({ channel: "msedge" });

try {
  let index = 0;
  let page: Page | undefined;
  let errors: string[] = [];

  for (const c of cases) {
    const previousCaseCount = index;
    index += 1;

    if (previousCaseCount % 64 === 0) {
      if (page) {
        await page.close();
      }

      page = await browser.newPage({
        deviceScaleFactor: 1,
        viewport: { height: 900, width: 1536 },
      });
      page.on("pageerror", (e) => errors.push(e.message));
      await page.clock.install({ time: new Date("2026-10-30T00:00:00Z") });
      await page.clock.pauseAt(new Date("2026-10-30T00:00:01Z"));
    }

    errors = [];
    const component = componentArg;

    const q = new URLSearchParams({
      background: c.background,
      component,
      count: String(c.selectedIndex ?? 1),
      height: String(c.height),
      label: c.label,
      native: "1",
      scale: String(c.scale),
      width: String(c.width),
      x: String(c.x),
      y: String(c.y),
    });

    const optionalText = c.text;

    if (optionalText !== null && optionalText !== undefined) {
      q.set("text", c.text);
    }

    await page.goto(`${urlArg}?${q}`);

    if (component === "sonner") {
      await expect(page.locator("#created")).toHaveText(
        String(c.selectedIndex ?? 1)
      );
    }

    await page.clock.fastForward(0);
    await page.addStyleTag({
      content:
        "#root{visibility:hidden}#subject,[data-sonner-toast],[data-mc-sonner-ghost]{visibility:visible}",
    });
    const subject = page.locator("#subject");
    await expect(subject).toBeVisible();
    await expect(
      page.locator(
        component === "sonner" ? "[data-sonner-toast]" : '[data-slot="toast"]'
      )
    ).toHaveCount(c.selectedIndex ?? 1);
    await expect(page.locator("[data-mc-toast-ready]")).toHaveCount(
      c.selectedIndex ?? 1
    );

    for (const canvas of await page.locator("[data-mc-toast-ready]").all()) {
      await expect(canvas).toHaveAttribute("data-mc-toast-ready", "true");
    }

    if (c.state === "exiting") {
      await page.clock.fastForward(600);
      await page.locator("#close").evaluate((n: HTMLElement) => {
        // SAFETY: the Sonner fixture #close is its HTML close button; retain the existing direct click call.
        n.click();
      });
      await page.clock.fastForward(component === "sonner" ? 16 : 0);
      await expect(
        page
          .locator(
            component === "sonner"
              ? "[data-sonner-toast]"
              : '[data-slot="toast"]'
          )
          .first()
      ).toHaveAttribute(
        component === "sonner" ? "data-removed" : "data-state",
        component === "sonner" ? "true" : "closed"
      );
    }

    await page.clock.fastForward(c.timeMs);

    if (c.state !== "exiting" || c.timeMs < 600) {
      await expect(page.locator("[data-mc-toast-ready]")).toHaveCount(
        c.selectedIndex ?? 1
      );

      for (const canvas of await page.locator("[data-mc-toast-ready]").all()) {
        await expect(canvas).toHaveAttribute("data-mc-toast-ready", "true");
      }
    }

    await page.evaluate(() => window.dispatchEvent(new Event("resize")));

    const actualBytes = await subject.screenshot({ animations: "disabled" });
    const actual = PNG.sync.read(actualBytes);
    const expectedBytes = fs.readFileSync(`${ref}/captures/${c.name}`);
    const expected = PNG.sync.read(expectedBytes);

    if (sha(expectedBytes) !== c.sha256) {
      throw new Error(`Native reference changed ${c.name}`);
    }

    if (actual.width !== expected.width || actual.height !== expected.height) {
      throw new Error(
        `Dimensions ${c.name}: ${actual.width}x${actual.height} / ${expected.width}x${expected.height}`
      );
    }

    const mismatchedPixels = comparator(expected, actual);
    const diff = new PNG({ height: actual.height, width: actual.width });

    for (let i = 0; i < actual.data.length; i += 4) {
      const mismatch = !actual.data
        .subarray(i, i + 4)
        .equals(expected.data.subarray(i, i + 4));

      diff.data.set(
        mismatch
          ? [255, 0, 255, 255]
          : [
              Math.floor(expected.data[i] / 4),
              Math.floor(expected.data[i + 1] / 4),
              Math.floor(expected.data[i + 2] / 4),
              255,
            ],
        i
      );
    }

    if (mismatchedPixels) {
      const out = path.join(
        repoRoot,
        ".pixel-perfect-test/installed-verification",
        componentArg
      );

      fs.mkdirSync(out, { recursive: true });
      fs.writeFileSync(path.join(out, `actual-${c.name}`), actualBytes);
      fs.writeFileSync(path.join(out, `diff-${c.name}`), PNG.sync.write(diff));
      console.log(
        c.name,
        mismatchedPixels,
        JSON.stringify(
          await page.locator('[data-slot="toast"]').evaluateAll((nodes) =>
            nodes.map((n): { rect: unknown; text: string | null } => ({
              rect: n.getBoundingClientRect().toJSON(),
              text: n.textContent,
            }))
          )
        )
      );
    }

    results.push({
      decodedRgbaSha256: sha(actual.data),
      mismatchedPixels,
      name: c.name,
      pageErrors: errors,
    });

    if (index % 64 === 0) {
      console.log("Compared", index, "native cases");
    }
  }

  assert.ok(
    results.every((c) => c.mismatchedPixels === 0),
    "Installed pixels differ"
  );
  assert.deepEqual(
    results.flatMap((c) => c.pageErrors),
    []
  );

  const report = {
    browser: browser.version(),
    caseIsolation: "Fresh page/context every64 cases",
    cases: results.map(({ name, mismatchedPixels, decodedRgbaSha256 }) => ({
      decodedRgbaSha256,
      mismatchedPixels,
      name,
    })),
    clock:
      "Paused browser clock, exact600ms squared native phase via fastForward and resize event",
    command: `shadcn add http://127.0.0.1:5173/r/${componentArg}.json --yes --overwrite`,
    consumer:
      "Separate initialized Vite/React shadcn consumer with independent node_modules",
    consumerRsc: settings.rsc,
    devicePixelRatio: 1,
    files,
    negativeControlMismatchedPixels: 1,
    pageErrors: [],
    renderVerificationUrl: urlArg,
    sourceJarSha256: manifest.sourceJarSha256,
    sourceManifest: "tests/reference/toast/manifest.json",
    viewport: { height: 900, width: 1536 },
  };

  const target = pixelPerfectFile(path.join("tests/reference", componentArg));
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(
    path.join(target, "installation-verification.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );
  console.log(
    `Installed ${componentArg}: ${results.length} native cases match exactly; ${files.length} canonical source files and one-pixel comparator control verified`
  );
} finally {
  await browser.close();
}
