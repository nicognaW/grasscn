import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import type * as Playwright from "@playwright/test";
import type { Page } from "@playwright/test";
import type { AttachmentCaptureManifest } from "@ppt/installed/constituent-capture-protocol";
import type { InstalledTextRegistry } from "@ppt/installed/text-verification-protocol";
import { pixelPerfectTestRoot, webFile, pixelPerfectFile } from "@ppt/paths";
import type * as PngJs from "pngjs";

fs.mkdirSync(pixelPerfectTestRoot, { recursive: true });

const [consumerArg, urlArg] = process.argv.slice(2);
const consumer = path.resolve(consumerArg);
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const require = createRequire(import.meta.url);

const { chromium, expect } =
  // SAFETY: createRequire resolves the installed Playwright package at this unchanged load point.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact installed Playwright module API boundary.
  require("@playwright/test") as typeof Playwright;

// SAFETY: createRequire resolves the installed pngjs decoder used by this comparator.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact installed pngjs module API boundary.
const { PNG } = require("pngjs") as typeof PngJs;
const browser = await chromium.launch({ channel: "msedge" });

// SAFETY: registry.json owns the installed source descriptor metadata read here.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registry descriptor producer boundary.
const registry = JSON.parse(
  fs.readFileSync(webFile(path.join("registry.json"))).toString()
) as InstalledTextRegistry;

const item = registry.items.find((i) => i.name === "attachment");

// SAFETY: the initialized shadcn components.json owns the existing rsc setting.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete initialized consumer configuration boundary.
const settings = JSON.parse(
  fs.readFileSync(path.join(consumer, "components.json")).toString()
) as { rsc?: boolean };

const canonical = (b: Buffer) => {
  let t = b
    .toString()
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  if (settings.rsc === false) {
    t = t.replace(/^["']use client["'];?\s*/, "");
  }

  return t.replace(/^(?:\/\/[^\n]*\n\s*)+/, "");
};

const files = item!.files.map((f) => {
  const name = path.basename(f.path);
  const a = fs.readFileSync(webFile(path.join(f.path)));
  const b = fs.readFileSync(path.join(consumer, "src/components/ui", name));

  assert.ok(
    canonical(a) === canonical(b),
    `${name} changed beyond CLI transforms`
  );

  return { installedSha256: hash(b), path: name, sourceSha256: hash(a) };
});

const pageErrors: string[] = [];

try {
  let page: Page | undefined;

  for (const [part, dir] of [
    ["row", "item"],
    ["action", "."],
    ["action", "button-cjk"],
  ]) {
    // SAFETY: the existing attachment manifest selection reads its captured-reference producer at this point.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact attachment capture producer boundary.
    const m = JSON.parse(
      fs
        .readFileSync(
          `${pixelPerfectFile(path.join("tests/reference", dir))}/manifest.json`
        )
        .toString()
    ) as AttachmentCaptureManifest;

    const cases = [];

    for (let i = 0; i < m.cases.length; i += 1) {
      if (i % 64 === 0) {
        if (page) {
          await page.close();
        }

        page = await browser.newPage({
          deviceScaleFactor: 1,
          viewport: { height: 900, width: 1536 },
        });
      }

      page!.on("pageerror", (e) => pageErrors.push(e.message));

      const c = m.cases[i];

      const q = new URLSearchParams({
        background: c.background ?? m.background ?? "#202020",
        description: c.placeholder ?? "Survival Mode",
        height: String(c.height ?? 20),
        label: c.label,
        native: "1",
        part,
        scale: String(c.scale),
        selected: String(c.selected ?? false),
        state: c.state,
        text: c.text ?? "world-1",
        width: String(c.width),
        x: String(c.x ?? 16),
        y: String(c.y ?? 16),
      });

      await page!.goto(`${urlArg}?${q}`);
      const subject = page!.locator("#subject");
      await expect(subject).toBeVisible();
      await page!.mouse.move(0, 0);

      if (part === "row") {
        await expect(
          subject.locator("[data-slot=attachment-content]")
        ).toHaveAttribute("data-mc-item-content-ready", "true");

        for (const label of await subject
          .locator("[data-mc-label-layout-ready]")
          .all()) {
          await expect(label).toHaveAttribute(
            "data-mc-label-layout-ready",
            "true"
          );
        }

        await expect(
          subject.locator("[data-mc-item-media-ready]")
        ).toHaveAttribute("data-mc-item-media-ready", "true");

        if (c.state === "hover") {
          await subject.hover();
        }

        if (c.state === "icon-hover") {
          const b = await subject.boundingBox();
          await page!.mouse.move(b!.x + 18 * c.scale, b!.y + 18 * c.scale);
        }

        if (c.state === "focus") {
          await subject.focus();
          await page!.keyboard.press("Tab");
          await page!.keyboard.press("Shift+Tab");
          await expect(subject).toBeFocused();
        }

        await expect(
          subject.locator("[data-mc-item-media-ready]")
        ).toHaveAttribute(
          "data-mc-item-media-state",
          c.state === "hover" ? "1" : c.state === "icon-hover" ? "2" : "0"
        );
      } else {
        if (c.state === "hover") {
          await subject.hover();
        }

        if (c.state === "focus") {
          await subject.focus();
        }
      }

      for (const glyph of await subject
        .locator("[data-mc-label-ready]")
        .all()) {
        await expect(glyph).toHaveAttribute("data-mc-label-ready", "true");
      }

      await page!.evaluate(
        async () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r))
          )
      );

      const a = PNG.sync.read(await subject.screenshot());

      const b = PNG.sync.read(
        fs.readFileSync(
          `${pixelPerfectFile(path.join("tests/reference", dir))}/captures/${
            c.name
          }`
        )
      );

      assert.deepEqual([a.width, a.height], [b.width, b.height]);
      assert.equal(
        hash(
          fs.readFileSync(
            pixelPerfectFile(
              path.join("tests/reference", dir, "captures", c.name)
            )
          )
        ),
        c.sha256
      );
      let n = 0;

      for (let p = 0; p < a.data.length; p += 4) {
        n += Number(
          !a.data.subarray(p, p + 4).equals(b.data.subarray(p, p + 4))
        );
      }

      if (n) {
        fs.writeFileSync(
          path.join(pixelPerfectTestRoot, "attachment-actual.png"),
          PNG.sync.write(a)
        );
        throw new Error(`${part} ${c.name} ${n} pixels`);
      }

      cases.push({
        decodedRgbaSha256: createHash("sha256").update(a.data).digest("hex"),
        mismatchedPixels: 0,
        name: c.name,
      });
    }

    const expected = PNG.sync.read(
      fs.readFileSync(
        pixelPerfectFile(
          path.join("tests/reference", dir, "captures", m.cases[0].name)
        )
      )
    );

    const changed = PNG.sync.read(PNG.sync.write(expected));

    changed.data[0] ^= 1;
    let different = 0;

    for (let i = 0; i < expected.data.length; i += 4) {
      different += Number(
        !expected.data
          .subarray(i, i + 4)
          .equals(changed.data.subarray(i, i + 4))
      );
    }

    assert.equal(different, 1);
    assert.deepEqual(pageErrors, []);
    const target = pixelPerfectFile(path.join("tests/reference/attachment"));
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(
      path.join(
        target,
        part === "row"
          ? "row-installation-verification.json"
          : dir === "."
            ? "action-ascii-installation-verification.json"
            : "action-cjk-installation-verification.json"
      ),
      JSON.stringify(
        {
          browser: browser.version(),
          cases,
          command:
            "shadcn add http://127.0.0.1:5173/r/attachment.json --yes --overwrite",
          consumer:
            "Separate initialized shadcn consumer with independent node_modules",
          consumerRsc: settings.rsc,
          devicePixelRatio: 1,
          files,
          negativeControlMismatchedPixels: 1,
          pageErrors: [],
          renderVerificationUrl: urlArg,
          sourceJarSha256: m.sourceJarSha256,
          sourceManifest: path.posix.join(
            "tests/reference",
            dir,
            "manifest.json"
          ),
          viewport: { height: 900, width: 1536 },
        },
        null,
        2
      )
    );
    console.log(part, dir, cases.length, "exact");
  }
} finally {
  await browser.close();
}
