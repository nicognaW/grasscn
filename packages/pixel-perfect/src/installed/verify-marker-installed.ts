import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import type * as Playwright from "@playwright/test";
import type { Page } from "@playwright/test";
import type { MarkerCaptureManifest } from "@ppt/installed/constituent-capture-protocol";
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

// SAFETY: the initialized shadcn components.json owns the existing rsc setting.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete initialized consumer configuration boundary.
const settings = JSON.parse(
  fs.readFileSync(path.join(consumer, "components.json")).toString()
) as { rsc?: boolean };

// SAFETY: registry.json owns the installed source descriptor metadata read here.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registry descriptor producer boundary.
const registry = JSON.parse(
  fs.readFileSync(webFile(path.join("registry.json"))).toString()
) as InstalledTextRegistry;

const item = registry.items.find((i) => i.name === "marker");

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

let count = 0;
let page: Page | undefined;

try {
  for (const dir of ["label", "separator"]) {
    // SAFETY: the existing marker manifest selection reads its captured-reference producer at this point.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact marker capture producer boundary.
    const m = JSON.parse(
      fs
        .readFileSync(
          `${pixelPerfectFile(path.join("tests/reference", dir))}/manifest.json`
        )
        .toString()
    ) as MarkerCaptureManifest;

    const results = [];

    for (const c of m.cases) {
      const previousCaseCount = count;
      count += 1;

      if (previousCaseCount % 128 === 0) {
        if (page) {
          await page.close();
        }

        page = await browser.newPage({
          deviceScaleFactor: 1,
          viewport: { height: 900, width: 1536 },
        });
        page.on("pageerror", (e) => pageErrors.push(e.message));
        await page.addInitScript(
          () =>
            (Date.now = () =>
              Number(new URLSearchParams(location.search).get("timeMs") ?? 0))
        );
      }

      const q = new URLSearchParams({
        align: c.alignment ?? "left",
        background: c.background,
        height: String(c.height),
        label: c.label ?? "",
        native: "1",
        part: dir === "label" ? "text" : "line",
        scale: String(c.scale),
        state: c.state,
        timeMs: String(c.timeMs ?? 0),
        width: String(c.width),
        x: String(c.x),
        y: String(c.y),
        ...((c.wrapWidth ?? 0) ? { wrapWidth: String(c.wrapWidth) } : {}),
      });

      await page!.goto(`${urlArg}?${q}`);

      if (dir === "label") {
        await expect(
          page!.locator("[data-mc-label-layout-ready]")
        ).toHaveAttribute("data-mc-label-layout-ready", "true");

        for (const label of await page!
          .locator("[data-mc-label-ready]")
          .all()) {
          await expect(label).toHaveAttribute("data-mc-label-ready", "true");
        }
      }

      await page!.mouse.move(0, 0);

      if (c.state === "focus") {
        await page!.locator("#subject").focus();
      } else {
        await page!.evaluate(() =>
          // SAFETY: this fixture focuses HTML subject controls; preserve the existing optional active-element blur.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Focused HTML fixture element DOM API boundary.
          (document.activeElement as HTMLElement | null)?.blur()
        );
      }

      if (c.state.endsWith("hover")) {
        await page!.locator("#subject").hover({ force: true });
      }

      await page!.evaluate(async () => {
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

      const actual = PNG.sync.read(
        await page!.locator("#subject").screenshot({ animations: "disabled" })
      );

      const expected = PNG.sync.read(
        fs.readFileSync(
          `${pixelPerfectFile(path.join("tests/reference", dir))}/captures/${
            c.name
          }`
        )
      );

      assert.deepEqual(
        [actual.width, actual.height],
        [expected.width, expected.height]
      );
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
      let different = 0;

      for (let i = 0; i < expected.data.length; i += 4) {
        if (
          !actual.data
            .subarray(i, i + 4)
            .equals(expected.data.subarray(i, i + 4))
        ) {
          different += 1;
        }
      }

      if (different) {
        fs.writeFileSync(
          path.join(pixelPerfectTestRoot, "marker-actual.png"),
          PNG.sync.write(actual)
        );
        throw new Error(`${c.name} ${different} pixels`);
      }

      results.push({
        decodedRgbaSha256: createHash("sha256")
          .update(actual.data)
          .digest("hex"),
        mismatchedPixels: 0,
        name: c.name,
      });

      if (results.length % 128 === 0) {
        console.log(dir, results.length, "exact");
      }
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
    let changedPixels = 0;

    for (let i = 0; i < expected.data.length; i += 4) {
      changedPixels += Number(
        !expected.data
          .subarray(i, i + 4)
          .equals(changed.data.subarray(i, i + 4))
      );
    }

    assert.equal(changedPixels, 1);
    assert.deepEqual(pageErrors, []);
    fs.mkdirSync(pixelPerfectFile(path.join("tests/reference/marker")), {
      recursive: true,
    });
    fs.writeFileSync(
      pixelPerfectFile(
        path.join(
          "tests/reference/marker",
          dir === "label"
            ? "text-installation-verification.json"
            : "line-installation-verification.json"
        )
      ),
      JSON.stringify(
        {
          browser: browser.version(),
          cases: results,
          command:
            "shadcn add http://127.0.0.1:5173/r/marker.json --yes --overwrite",
          consumer:
            "Separate initialized shadcn consumer with independent node_modules",
          consumerRsc: settings.rsc,
          devicePixelRatio: 1,
          files,
          negativeControlMismatchedPixels: 1,
          pageErrors: [],
          renderVerificationUrl: urlArg,
          scope:
            "Original Label text and nativeHeader/FooterSeparator pixels in declared Marker constituent cases; full marker arrangements remain compositions.",
          sourceJarSha256: m.sourceJarSha256,
          viewport: { height: 900, width: 1536 },
        },
        null,
        2
      )
    );
    console.log(dir, results.length, "exact");
  }
} finally {
  await browser.close();
}
