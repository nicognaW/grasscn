import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import {
  pixelPerfectTestRoot,
  repoRoot,
  pixelPerfectFile,
  webFile,
} from "@ppt/paths";

fs.mkdirSync(pixelPerfectTestRoot, { recursive: true });

const [consumerArg, urlArg] = process.argv.slice(2);
const consumer = path.resolve(consumerArg);
const hash = (b) => createHash("sha256").update(b).digest("hex");
const require = createRequire(import.meta.url);
const { chromium, expect } = require("@playwright/test");
const { PNG } = require("pngjs");

const m = JSON.parse(
  fs.readFileSync(
    pixelPerfectFile(path.join("tests/reference/avatar/manifest.json"))
  )
);

const browser = await chromium.launch({ channel: "msedge" });
const results = [];

const pageErrors = [];
let page;

try {
  for (let i = 0; i < m.cases.length; i += 1) {
    if (i % 128 === 0) {
      if (page) {
        await page.close();
      }

      page = await browser.newPage({
        deviceScaleFactor: 1,
        viewport: { height: 900, width: 1536 },
      });
      page.on("pageerror", (e) => pageErrors.push(e.message));
      await page.goto(urlArg);
      await page.waitForFunction(() => !!window.renderCase);
    }

    const c = m.cases[i];
    await page.evaluate((c) => window.renderCase(c), c);
    await expect(page.locator("[data-mc-avatar-face]")).toHaveAttribute(
      "data-ready",
      "true"
    );
    await page.evaluate(
      async () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r))
        )
    );

    const got = PNG.sync.read(
      await page.locator("#subject").screenshot({ animations: "disabled" })
    );

    const want = PNG.sync.read(
      fs.readFileSync(
        pixelPerfectFile(path.join("tests/reference/avatar/captures", c.name))
      )
    );

    let diff = 0;

    for (let n = 0; n < want.data.length; n += 4) {
      if (!want.data.subarray(n, n + 4).equals(got.data.subarray(n, n + 4)))
        diff += 1;
    }

    if (diff) {
      fs.writeFileSync(
        path.join(pixelPerfectTestRoot, "avatar-actual.png"),
        PNG.sync.write(got)
      );
      throw new Error(`${c.name} ${diff} differing pixels`);
    }

    results.push({
      decodedRgbaSha256: hash(got.data),
      mismatchedPixels: 0,
      name: c.name,
    });

    if (i % 128 === 127) {
      console.log(`${i + 1} matched`);
    }
  }

  if (pageErrors.length) {
    throw new Error(pageErrors.join("\n"));
  }

  const item = JSON.parse(
    fs.readFileSync(webFile(path.join("registry.json")))
  ).items.find((i) => i.name === "avatar");

  const settings = JSON.parse(
    fs.readFileSync(path.join(consumer, "components.json"))
  );

  const canonical = (b) => {
    let t = b
      .toString()
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

    if (canonical(a) !== canonical(b)) {
      throw new Error(`${name} canonical mismatch`);
    }

    return { installedSha256: hash(b), path: name, sourceSha256: hash(a) };
  });

  const negative = PNG.sync.read(
    fs.readFileSync(
      pixelPerfectFile(
        path.join("tests/reference/avatar/captures", m.cases[0].name)
      )
    )
  );

  const changed = PNG.sync.read(PNG.sync.write(negative));

  changed.data[0] ^= 1;
  let mismatch = 0;

  for (let n = 0; n < changed.data.length; n += 4) {
    if (
      !changed.data.subarray(n, n + 4).equals(negative.data.subarray(n, n + 4))
    )
      mismatch += 1;
  }

  if (mismatch !== 1) {
    throw new Error("Negative comparator");
  }

  fs.writeFileSync(
    pixelPerfectFile(
      path.join("tests/reference/avatar/installation-verification.json")
    ),
    JSON.stringify(
      {
        browser: browser.version(),
        cases: results,
        command:
          "shadcn add http://127.0.0.1:5173/r/avatar.json --yes --overwrite",
        consumer:
          "Separate initialized shadcn consumer with independent node_modules",
        consumerRsc: settings.rsc,
        devicePixelRatio: 1,
        files,
        negativeControlMismatchedPixels: 1,
        pageErrors: [],
        renderVerificationUrl: urlArg,
        sourceJarSha256: m.sourceJarSha256,
        sourceManifest: "tests/reference/avatar/manifest.json",
      },
      null,
      2
    )
  );
  console.log(`${results.length} exact public avatar cases`);
} finally {
  await browser.close();
}
