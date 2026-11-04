import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import type { Page } from "@playwright/test";
import type * as Playwright from "@playwright/test";
import type {
  AvatarCaptureManifest,
  LegacyAvatarConsumerWindow,
  LoadingAvatarConsumerWindow,
} from "@ppt/installed/legacy-consumer-protocol";
import type {
  InstalledTextRegistry,
  InstalledTextItem,
} from "@ppt/installed/text-verification-protocol";
import { pixelPerfectTestRoot, pixelPerfectFile, webFile } from "@ppt/paths";
import type * as PngJs from "pngjs";

fs.mkdirSync(pixelPerfectTestRoot, { recursive: true });

const [consumerArg, urlArg] = process.argv.slice(2);
const consumer = path.resolve(consumerArg);
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const require = createRequire(import.meta.url);

const { chromium, expect } =
  // SAFETY: createRequire resolves the installed Playwright API at the original load point.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact installed Playwright module API boundary.
  require("@playwright/test") as typeof Playwright;

// SAFETY: createRequire resolves the installed pngjs decoder used by this comparator.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact installed pngjs module API boundary.
const { PNG } = require("pngjs") as typeof PngJs;

// SAFETY: the fixed Avatar captured-reference producer owns this fresh metadata read.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact Avatar capture producer boundary.
const m = JSON.parse(
  fs
    .readFileSync(
      pixelPerfectFile(path.join("tests/reference/avatar/manifest.json"))
    )
    .toString()
) as AvatarCaptureManifest;

const verifyAvatarCase = async (
  c: AvatarCaptureManifest["cases"][number],
  fixturePage: Page
) => {
  await fixturePage.evaluate((avatarCase) => {
    // SAFETY: the retained Avatar bridge consumes these actual captured case fields and returns void.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained Avatar consumer bridge invocation boundary.
    (window as LegacyAvatarConsumerWindow).renderCase(avatarCase);
  }, c);
  await expect(fixturePage.locator("[data-mc-avatar-face]")).toHaveAttribute(
    "data-ready",
    "true"
  );
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

  const got = PNG.sync.read(
    await fixturePage.locator("#subject").screenshot({ animations: "disabled" })
  );

  const want = PNG.sync.read(
    fs.readFileSync(
      pixelPerfectFile(path.join("tests/reference/avatar/captures", c.name))
    )
  );

  let diff = 0;

  for (let n = 0; n < want.data.length; n += 4) {
    if (!want.data.subarray(n, n + 4).equals(got.data.subarray(n, n + 4))) {
      diff += 1;
    }
  }

  if (diff) {
    fs.writeFileSync(
      path.join(pixelPerfectTestRoot, "avatar-actual.png"),
      PNG.sync.write(got)
    );
    throw new Error(`${c.name} ${diff} differing pixels`);
  }

  return {
    decodedRgbaSha256: hash(got.data),
    mismatchedPixels: 0,
    name: c.name,
  };
};

const browser = await chromium.launch({ channel: "msedge" });
const results = [];

const pageErrors: string[] = [];
let page: Page | undefined;

try {
  for (let i = 0; i < m.cases.length; i += 1) {
    if (i % 128 === 0) {
      if (page) {
        // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
        await page.close();
      }

      // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
      page = await browser.newPage({
        deviceScaleFactor: 1,
        viewport: { height: 900, width: 1536 },
      });
      page.on("pageerror", (e) => pageErrors.push(e.message));
      // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
      await page.goto(urlArg);
      // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
      await page.waitForFunction(
        () =>
          // SAFETY: this readiness read observes only the retained producer's owned bridge member before its installation has been observed.
          !!(window as LoadingAvatarConsumerWindow).renderCase
      );
    }

    const c = m.cases[i];
    // SAFETY: The existing rotation counter starts at zero, so the first processed case awaits browser.newPage before this use; every later rotation assigns the new Page before use and startup errors leave the loop. Capture that same owner for this iteration.
    /* oxlint-disable typescript/no-unsafe-type-assertion -- Exact completed browser.newPage producer/lifecycle boundary; no runtime guard. */
    const activePage = page as Page;
    /* oxlint-enable typescript/no-unsafe-type-assertion */

    // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
    results.push(await verifyAvatarCase(c, activePage));

    if (i % 128 === 127) {
      console.log(`${i + 1} matched`);
    }
  }

  if (pageErrors.length) {
    throw new Error(pageErrors.join("\n"));
  }

  // SAFETY: the authored registry owns this fresh source descriptor read at the original verification phase.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registry descriptor producer boundary.
  const registry = JSON.parse(
    fs.readFileSync(webFile(path.join("registry.json"))).toString()
  ) as InstalledTextRegistry;

  // SAFETY: the authored registry uniquely declares avatar, selected by this existing fixed/validated route; a missing item retains its original later dereference failure.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact authored registry item producer projection; fresh read and original failure timing preserved.
  const item = registry.items.find(
    (i) => i.name === "avatar"
  ) as InstalledTextItem;

  // SAFETY: the initialized shadcn consumer configuration owns these existing alias/rsc fields.
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

  // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
  changed.data[0] ^= 1;
  let mismatch = 0;

  for (let n = 0; n < changed.data.length; n += 4) {
    if (
      !changed.data.subarray(n, n + 4).equals(negative.data.subarray(n, n + 4))
    ) {
      mismatch += 1;
    }
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
