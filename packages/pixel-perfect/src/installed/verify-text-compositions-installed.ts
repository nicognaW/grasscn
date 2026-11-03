import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { InstalledComponentSettings } from "@grasscn/tests/installed-registry-file";
import { packageBin } from "@grasscn/tests/tooling";
import { chromium, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type {
  InstalledTextRegistry,
  InstalledTextItem,
  ComposedTextCaptureManifest,
  InstalledComposedTextResult,
  InstalledTextFailure,
} from "@ppt/installed/text-verification-protocol";
import { webFile, pixelPerfectFile, repositoryFile } from "@ppt/paths";
import { PNG } from "pngjs";

const [consumerArgument, name, origin, descriptorArgument] =
  process.argv.slice(2);

const supported = ["code-block", "trace", "message-scroller", "spinner"];

assert.ok(
  consumerArgument && supported.includes(name) && origin,
  "Usage: bun src/installed/verify-text-compositions-installed.ts <consumer> <component> <fixture-url> [registry-item-file]"
);

const consumer = path.resolve(consumerArgument);

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

let item: InstalledTextItem | undefined;

if (descriptorArgument) {
  // SAFETY: the supplied descriptor owns this verifier's exact shadcn item source list.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete supplied registry item descriptor boundary.
  item = JSON.parse(
    fs.readFileSync(path.resolve(descriptorArgument), "utf-8")
  ) as InstalledTextItem;
} else {
  // SAFETY: the authored registry document owns this item lookup; missing items retain their original later failure.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete registry document boundary.
  const registry = JSON.parse(
    fs.readFileSync(webFile(path.join("registry.json")), "utf-8")
  ) as InstalledTextRegistry;

  item = registry.items.find((candidate) => candidate.name === name);
}

// SAFETY: this is the initialized shadcn consumer configuration; preserve its optional rsc behavior.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete initialized consumer settings boundary.
const settings = JSON.parse(
  fs.readFileSync(path.join(consumer, "components.json"), "utf-8")
) as InstalledComponentSettings & { rsc?: boolean };

const canonical = (bytes: Buffer) => {
  let text = bytes
    .toString()
    .replaceAll(/\/\*[\s\S]*?\*\//gu, "")
    .trim();

  if (settings.rsc === false) {
    text = text.replace(/^["']use client["'];?\s*/u, "");
  }

  return text.replace(/^(?:\/\/[^\n]*\n\s*)+/u, "");
};

const files = item!.files.map((file) => {
  const filename = path.basename(file.path);

  let directorySelection: "hooks" | "lib" | "components/ui";

  if (file.type === "registry:hook") {
    directorySelection = "hooks";
  } else if (file.type === "registry:lib") {
    directorySelection = "lib";
  } else {
    directorySelection = "components/ui";
  }

  const directory = directorySelection;

  const source = fs.readFileSync(webFile(path.join(file.path)));

  const installed = fs.readFileSync(
    path.join(consumer, "src", directory, filename)
  );

  assert.equal(
    canonical(installed),
    canonical(source),
    `Installed source differs: ${file.path}`
  );

  return {
    comparison:
      "Equal except permitted CLI comment/use-client removal; embedded original font and texture bytes unchanged",
    installedSha256: sha(installed),
    path: filename,
    sourcePath: file.path,
    sourceSha256: sha(source),
  };
});

const types = spawnSync(
  process.execPath,
  [packageBin("typescript", "tsc", consumer), "--noEmit"],
  { cwd: consumer, encoding: "utf-8" }
);

assert.equal(types.status, 0, (types.stdout ?? "") + (types.stderr ?? ""));

const directory = name === "spinner" ? name : "message";

// SAFETY: this fixed synchronous read selects the native message/spinner capture producer after the consumer typecheck.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Actual text-family capture producer boundary.
const manifest = JSON.parse(
  fs.readFileSync(
    pixelPerfectFile(path.join("tests/reference", directory, "manifest.json")),
    "utf-8"
  )
) as ComposedTextCaptureManifest;

const browser = await chromium.launch({ channel: "msedge" });
const browserVersion = browser.version();
const results: InstalledComposedTextResult[] = [];
const errors: string[] = [];

let next = 0;

const compare = function compare(expected: PNG, actual: PNG) {
  assert.deepEqual(
    [actual.width, actual.height],
    [expected.width, expected.height]
  );
  let count = 0;

  for (let i = 0; i < expected.data.length; i += 4) {
    count += +!expected.data
      .subarray(i, i + 4)
      .equals(actual.data.subarray(i, i + 4));
  }

  return count;
};

const verifyComposedTextCase = async (
  c: ComposedTextCaptureManifest["cases"][number],
  page: Page
) => {
  const url = new URL(origin);
  url.search = "";

  for (const [key, value] of Object.entries(c)) {
    if (typeof value === "string" || typeof value === "number") {
      url.searchParams.set(key, String(value));
    }
  }

  url.searchParams.set("component", name);
  url.searchParams.set("native", "1");
  await page.goto(url.href);
  const subject = page.locator("#subject");
  let slotSelection: string;

  if (name === "code-block") {
    slotSelection = "code-block-content";
  } else if (name === "trace") {
    slotSelection = "trace-line";
  } else if (name === "message-scroller") {
    slotSelection = "message-scroller-item";
  } else {
    slotSelection = name;
  }

  await expect(subject).toHaveAttribute("data-slot", slotSelection);
  await expect(subject).toBeVisible();

  if (name === "code-block") {
    await expect(subject.locator("[data-mc-selectable-ready]")).toHaveAttribute(
      "data-mc-selectable-ready",
      "true"
    );
  }

  if (name === "message-scroller") {
    await expect(subject.locator("[data-mc-chat-ready]")).toHaveAttribute(
      "data-mc-chat-ready",
      "true"
    );
  }

  for (const node of await subject
    .locator("[data-mc-label-layout-ready]")
    .all()) {
    await expect(node).toHaveAttribute("data-mc-label-layout-ready", "true");
  }

  for (const node of await subject.locator("[data-mc-label-ready]").all()) {
    await expect(node).toHaveAttribute("data-mc-label-ready", "true");
  }

  await page.evaluate(async () => {
    await document.fonts.ready;

    const images = [...document.querySelectorAll(".mc-surface>span")]
      .map(
        (node) =>
          /url\(["']?(?<imageUrl>.*?)["']?\)/u.exec(
            getComputedStyle(node).backgroundImage
          )?.[1]
      )
      .filter((imageSource): imageSource is string => Boolean(imageSource));

    await Promise.all(
      images.map(async (src) => {
        const imageCompletion = Promise.withResolvers();

        try {
          const image = new Image();
          image.onload = image.onerror = imageCompletion.resolve;
          // The same Boolean predicate excludes absent or empty captured URLs before this native setter.
          image.src = src;
        } catch (error) {
          imageCompletion.reject(error);
        }

        return await imageCompletion.promise;
      })
    );
    const frameCompletion = Promise.withResolvers();

    try {
      requestAnimationFrame(() => {
        requestAnimationFrame(frameCompletion.resolve);
      });
    } catch (error) {
      frameCompletion.reject(error);
    }

    await frameCompletion.promise;
  });

  const expectedBytes = fs.readFileSync(
    pixelPerfectFile(
      path.join("tests/reference", directory, "captures", c.name)
    )
  );

  assert.equal(sha(expectedBytes), c.sha256, "Native PNG integrity");

  const actualBytes = await subject.screenshot();
  const actual = PNG.sync.read(actualBytes);
  const mismatchedPixels = compare(PNG.sync.read(expectedBytes), actual);

  results.push({
    decodedRgbaSha256: sha(actual.data),
    mismatchedPixels,
    name: c.name,
  });

  if (mismatchedPixels) {
    console.log(name, c.name, mismatchedPixels);

    const failures = repositoryFile(
      path.join(
        ".pixel-perfect-test/text-components-integration/next-pixel-failures"
      )
    );

    fs.mkdirSync(failures, { recursive: true });
    fs.writeFileSync(path.join(failures, `${name}-${c.name}`), actualBytes);
  }
};

const worker = async function worker() {
  let page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { height: 900, width: 1536 },
  });

  let count = 0;

  page.on("pageerror", (error) => errors.push(error.message));

  while (next < manifest.cases.length) {
    const taskIndex = next;
    next += 1;
    const c = manifest.cases[taskIndex];

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

      await verifyComposedTextCase(c, page);
    } catch (error) {
      // SAFETY: the owned Node/PNG and Playwright operations expose message; keep the original property access and failure coercion.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Narrow message projection at this concrete verifier failure boundary.
      const failure = error as InstalledTextFailure;
      errors.push(`${c.name}: ${failure.message}`);
      console.log(name, c.name, failure.message);
    }
  }

  await page.close();
};

try {
  await Promise.all([worker(), worker()]);
} finally {
  await browser.close();
}

assert.deepEqual(errors, []);

assert.equal(results.length, manifest.cases.length);

assert.ok(
  results.every((c) => c.mismatchedPixels === 0),
  "Pixel failures"
);

const expected = PNG.sync.read(
  fs.readFileSync(
    pixelPerfectFile(
      path.join(
        "tests/reference",
        directory,
        "captures",
        manifest.cases[0].name
      )
    )
  )
);

const mutated = PNG.sync.read(PNG.sync.write(expected));

// oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
mutated.data[0] ^= 1;

assert.equal(compare(expected, mutated), 1);

const file =
  name === "spinner"
    ? "installation-verification.json"
    : `${name}-installation-verification.json`;

fs.writeFileSync(
  pixelPerfectFile(path.join("tests/reference", directory, file)),
  `${JSON.stringify(
    {
      browser: browserVersion,
      caseIsolation:
        "Two workers; pages closed every50 cases; all browsers closed finally",
      cases: results,
      command: `shadcn add <local-registry>/r/${name}.json --yes --overwrite`,
      comparatorNegativeControl:
        "One changed RGBA channel yields exactly one mismatched pixel",
      consumer:
        "Separate initialized React/Vite shadcn consumer with independent physical npm dependencies",
      consumerRsc: settings.rsc,
      devicePixelRatio: 1,
      files,
      pageErrors: errors,
      sourceJarSha256: manifest.sourceJarSha256,
      typecheck: { command: "tsc --noEmit", exitCode: 0 },
      viewport: [1536, 900],
    },
    null,
    2
  )}\n`
);

console.log(
  `${name}: ${results.length} installed native appearances exact; ${
    files.length
  } canonical sources; types pass`
);
