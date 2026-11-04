import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import type * as Playwright from "@playwright/test";
import type { Page } from "@playwright/test";
import type { AttachmentCaptureManifest } from "@ppt/installed/constituent-capture-protocol";
import type {
  InstalledTextRegistry,
  InstalledTextItem,
} from "@ppt/installed/text-verification-protocol";
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

const buildAttachmentQuery = (
  c: AttachmentCaptureManifest["cases"][number],
  part: string,
  m: AttachmentCaptureManifest
) => {
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

  return q;
};

const browser = await chromium.launch({ channel: "msedge" });

// SAFETY: registry.json owns the installed source descriptor metadata read here.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registry descriptor producer boundary.
const registry = JSON.parse(
  fs.readFileSync(webFile(path.join("registry.json"))).toString()
) as InstalledTextRegistry;

// SAFETY: the authored registry uniquely declares attachment, selected by this existing fixed/validated route; a missing item retains its original later dereference failure.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact authored registry item producer projection; fresh read and original failure timing preserved.
const item = registry.items.find(
  (i) => i.name === "attachment"
) as InstalledTextItem;

// SAFETY: the initialized shadcn components.json owns the existing rsc setting.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete initialized consumer configuration boundary.
const settings = JSON.parse(
  fs.readFileSync(path.join(consumer, "components.json")).toString()
) as { rsc?: boolean };

const canonical = (b: Buffer) => {
  let t = b
    .toString()
    .replaceAll(/\/\*[\s\S]*?\*\//gu, "")
    .trim();

  if (settings.rsc === false) {
    t = t.replace(/^["']use client["'];?\s*/u, "");
  }

  return t.replace(/^(?:\/\/[^\n]*\n\s*)+/u, "");
};

const files = item.files.map((f) => {
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

  const verifyAttachmentCase = async (
    c: AttachmentCaptureManifest["cases"][number],
    part: string,
    dir: string,
    m: AttachmentCaptureManifest,
    fixturePage: Page
  ) => {
    const q = buildAttachmentQuery(c, part, m);

    await fixturePage.goto(`${urlArg}?${q}`);
    const subject = fixturePage.locator("#subject");
    await expect(subject).toBeVisible();
    await fixturePage.mouse.move(0, 0);

    if (part === "row") {
      await expect(
        subject.locator("[data-slot=attachment-content]")
      ).toHaveAttribute("data-mc-item-content-ready", "true");

      {
        const readyElements = await subject
          .locator("[data-mc-label-layout-ready]")
          .all();

        const readinessResults = await Promise.allSettled(
          readyElements.map(async (label) => {
            await expect(label).toHaveAttribute(
              "data-mc-label-layout-ready",
              "true"
            );
          })
        );

        const rejectedReadiness = readinessResults.find(
          (result) => result.status === "rejected"
        );

        if (rejectedReadiness) {
          throw rejectedReadiness.reason;
        }
      }

      await expect(
        subject.locator("[data-mc-item-media-ready]")
      ).toHaveAttribute("data-mc-item-media-ready", "true");

      if (c.state === "hover") {
        await subject.hover();
      }

      if (c.state === "icon-hover") {
        const b = await subject.boundingBox();
        await fixturePage.mouse.move(b!.x + 18 * c.scale, b!.y + 18 * c.scale);
      }

      if (c.state === "focus") {
        await subject.focus();
        await fixturePage.keyboard.press("Tab");
        await fixturePage.keyboard.press("Shift+Tab");
        await expect(subject).toBeFocused();
      }

      let mediaStateSelection: string;

      if (c.state === "hover") {
        mediaStateSelection = "1";
      } else if (c.state === "icon-hover") {
        mediaStateSelection = "2";
      } else {
        mediaStateSelection = "0";
      }

      await expect(
        subject.locator("[data-mc-item-media-ready]")
      ).toHaveAttribute("data-mc-item-media-state", mediaStateSelection);
    } else {
      if (c.state === "hover") {
        await subject.hover();
      }

      if (c.state === "focus") {
        await subject.focus();
      }
    }

    {
      const readyElements = await subject
        .locator("[data-mc-label-ready]")
        .all();

      const readinessResults = await Promise.allSettled(
        readyElements.map(async (glyph) => {
          await expect(glyph).toHaveAttribute("data-mc-label-ready", "true");
        })
      );

      const rejectedReadiness = readinessResults.find(
        (result) => result.status === "rejected"
      );

      if (rejectedReadiness) {
        throw rejectedReadiness.reason;
      }
    }

    await fixturePage.evaluate(async () => {
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
      n += Number(!a.data.subarray(p, p + 4).equals(b.data.subarray(p, p + 4)));
    }

    if (n) {
      fs.writeFileSync(
        path.join(pixelPerfectTestRoot, "attachment-actual.png"),
        PNG.sync.write(a)
      );
      throw new Error(`${part} ${c.name} ${n} pixels`);
    }

    return {
      decodedRgbaSha256: createHash("sha256").update(a.data).digest("hex"),
      mismatchedPixels: 0,
      name: c.name,
    };
  };

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
          // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
          await page.close();
        }

        // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
        page = await browser.newPage({
          deviceScaleFactor: 1,
          viewport: { height: 900, width: 1536 },
        });
      }

      page!.on("pageerror", (e) => pageErrors.push(e.message));

      const c = m.cases[i];

      // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
      cases.push(await verifyAttachmentCase(c, part, dir, m, page!));
    }

    const expected = PNG.sync.read(
      fs.readFileSync(
        pixelPerfectFile(
          path.join("tests/reference", dir, "captures", m.cases[0].name)
        )
      )
    );

    const changed = PNG.sync.read(PNG.sync.write(expected));

    // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
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
    let reportFilenameSelection: string;

    if (part === "row") {
      reportFilenameSelection = "row-installation-verification.json";
    } else if (dir === ".") {
      reportFilenameSelection = "action-ascii-installation-verification.json";
    } else {
      reportFilenameSelection = "action-cjk-installation-verification.json";
    }

    fs.writeFileSync(
      path.join(target, reportFilenameSelection),
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
