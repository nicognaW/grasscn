import assert from "node:assert/strict";
import { createHash } from "node:crypto";
// The CLI may convert LF/CRLF on Windows; raw source and installed hashes remain recorded.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import {
  pixelPerfectTestRoot,
  repoRoot,
  webFile,
  pixelPerfectFile,
} from "@ppt/paths";

fs.mkdirSync(pixelPerfectTestRoot, { recursive: true });

const [consumerArg, urlArg] = process.argv.slice(2);
const consumer = path.resolve(consumerArg);
const hash = (b) => createHash("sha256").update(b).digest("hex");
const require = createRequire(import.meta.url);
const { chromium, expect } = require("@playwright/test");
const { PNG } = require("pngjs");
const browser = await chromium.launch({ channel: "msedge" });

const settings = JSON.parse(
  fs.readFileSync(path.join(consumer, "components.json"))
);

const item = JSON.parse(
  fs.readFileSync(webFile(path.join("registry.json")))
).items.find((i) => i.name === "native-select");

const canonical = (b) => {
  let t = b
    .toString()
    .replaceAll("\r\n", "\n")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  if (settings.rsc === false) {
    t = t.replace(/^["']use client["'];?\s*/, "");
  }

  return t.replace(/^(?:\/\/[^\n]*\n\s*)+/, "");
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

const pageErrors = [];

let count = 0;
let page;

try {
  for (const dir of ["native-select", "native-select-extra"]) {
    const m = JSON.parse(
      fs.readFileSync(
        `${pixelPerfectFile(path.join("tests/reference", dir))}/manifest.json`
      )
    );

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
        background: c.background,
        height: c.height,
        label: c.label,
        native: "1",
        scale: c.scale,
        state: c.state,
        timeMs: c.timeMs ?? 0,
        width: c.width,
        x: c.x,
        y: c.y,
      });

      await page.goto(`${urlArg}?${q}`);
      await expect(page.locator(".mc-select-trigger")).toHaveAttribute(
        "data-mc-select-ready",
        "true"
      );
      await expect(page.locator(".mc-select-trigger-label")).toHaveText(
        c.label
      );

      for (const label of await page
        .locator(".mc-native-select-art [data-mc-label-ready]")
        .all()) {
        await expect(label).toHaveAttribute("data-mc-label-ready", "true");
      }

      await page.mouse.move(0, 0);

      if (c.state === "focus") {
        await page.locator("#subject").focus();
      } else {
        await page.evaluate(() => document.activeElement?.blur());
      }

      if (c.state.endsWith("hover")) {
        await page.locator("#subject").hover({ force: true });
      }

      await page.evaluate(
        async () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r))
          )
      );

      const actual = PNG.sync.read(
        await page.locator("#subject").screenshot({ animations: "disabled" })
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
        )
          different += 1;
      }

      if (different) {
        fs.writeFileSync(
          path.join(pixelPerfectTestRoot, "native-select-actual.png"),
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
    fs.writeFileSync(
      pixelPerfectFile(
        path.join("tests/reference", dir, "installation-verification.json")
      ),
      JSON.stringify(
        {
          browser: browser.version(),
          cases: results,
          command:
            "shadcn add http://127.0.0.1:5173/r/native-select.json --yes --overwrite",
          consumer:
            "Separate initialized shadcn consumer with independent node_modules",
          consumerRsc: settings.rsc,
          devicePixelRatio: 1,
          files,
          negativeControlMismatchedPixels: 1,
          pageErrors: [],
          renderVerificationUrl: urlArg,
          scope:
            "Closed HTMLSelect skin only; OS popup and multiple listbox remain platform-controlled.",
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
