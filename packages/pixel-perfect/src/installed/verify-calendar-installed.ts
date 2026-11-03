// The CLI may convert LF/CRLF on Windows; raw source and installed hashes remain recorded.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { installedRegistryFile } from "@grasscn/tests/installed-registry-file";
import type { Page } from "@playwright/test";
import { chromium, expect } from "@playwright/test";
import type { CachedCase } from "@ppt/installed/case-cache";
import {
  installedCaseCache,
  installedConsumerIdentity,
} from "@ppt/installed/case-cache";
import type { DecodedPixels } from "@ppt/installed/installed-compositions-protocol";
import type {
  CalendarCaptureManifest,
  CalendarConsumerSettings,
  LegacyCalendarQuery,
  LegacyCalendarConsumerWindow,
} from "@ppt/installed/legacy-consumer-protocol";
import type { InstalledTextRegistry } from "@ppt/installed/text-verification-protocol";
import {
  pixelPerfectTestRoot,
  webFile,
  pixelPerfectFile,
  repositoryFile,
} from "@ppt/paths";
import { PNG } from "pngjs";

fs.mkdirSync(pixelPerfectTestRoot, { recursive: true });

const [consumerArg, component, url] = process.argv.slice(2);
const consumer = path.resolve(consumerArg);
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

assert.ok(["calendar", "date-picker"].includes(component) && url);

// SAFETY: the authored registry owns this fresh source descriptor read at the original verification phase.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registry descriptor producer boundary.
const registry = JSON.parse(
  fs.readFileSync(webFile(path.join("registry.json"))).toString()
) as InstalledTextRegistry;

const item = registry.items.find((i) => i.name === component);

// SAFETY: the initialized shadcn consumer configuration owns these existing alias/rsc fields.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete initialized consumer configuration boundary.
const settings = JSON.parse(
  fs.readFileSync(path.join(consumer, "components.json")).toString()
) as CalendarConsumerSettings;

const canonical = (b: Buffer) => {
  let t = b
    .toString()
    .replaceAll("\r\n", "\n")
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
  const b = fs.readFileSync(installedRegistryFile(f, consumer, settings));

  assert.ok(
    canonical(a) === canonical(b),
    `${name} changed beyond CLI transforms`
  );

  return {
    installedSha256: hash(b),
    path: name,
    sourcePath: f.path,
    sourceSha256: hash(a),
  };
});

const browser = await chromium.launch({ channel: "msedge" });
const pageErrors: string[] = [];

let comparisons = 0;
let page: Page | undefined;

const inputIdentity = installedConsumerIdentity(consumer);

const runtimeIdentity = {
  browser: browser.version(),
  consumer: inputIdentity,
  files,
  settings,
  url,
  verifier: hash(fs.readFileSync(import.meta.filename)),
  viewport: [1536, 900, 1],
};

const differences = function differences(a: DecodedPixels, b: DecodedPixels) {
  assert.deepEqual([a.width, a.height], [b.width, b.height]);
  let count = 0;

  for (let i = 0; i < a.data.length; i += 4) {
    count += Number(
      !a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4))
    );
  }

  return count;
};

try {
  for (const [part, dir] of [
    ["cell", "calendar-day"],
    ["surface", "card"],
    ["label", "label"],
    ["arrow", "pagination-arrow"],
    ...(component === "date-picker"
      ? [
          ["trigger-ascii", "."],
          ["trigger-cjk", "button-cjk"],
        ]
      : []),
  ]) {
    // SAFETY: the existing Calendar/DatePicker constituent table selects these captured-reference producers.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact Calendar constituent capture producer boundary.
    const manifest = JSON.parse(
      fs
        .readFileSync(
          pixelPerfectFile(path.join("tests/reference", dir, "manifest.json"))
        )
        .toString()
    ) as CalendarCaptureManifest;

    const cases: CachedCase[] = [];

    let retainedCases = 0;

    const cache = installedCaseCache(
      repositoryFile(
        path.join(
          ".pixel-perfect-test",
          "installed-case-cache",
          component,
          part
        )
      ),
      {
        ...runtimeIdentity,
        manifest: hash(
          fs.readFileSync(
            pixelPerfectFile(path.join("tests/reference", dir, "manifest.json"))
          )
        ),
      }
    );

    for (const c of manifest.cases) {
      const reference = fs.readFileSync(
        pixelPerfectFile(path.join("tests/reference", dir, "captures", c.name))
      );

      assert.equal(hash(reference), c.sha256);

      const aliases =
        part === "cell" && c.state === "hover"
          ? [
              "base",
              "selected",
              "today",
              "range-start",
              "range-middle",
              "range-end",
            ]
          : ["base"];

      const fields = aliases.map((alias) =>
        alias === "base"
          ? "decodedRgbaSha256"
          : `${alias.replaceAll("-", "")}DecodedRgbaSha256`
      );

      const retained = cache.read(c.name, reference, fields);

      if (retained) {
        retainedCases += 1;
        cases.push(retained);

        if (cases.length % 128 === 0) {
          console.log("RETAINED", component, part, cases.length);
        }

        continue;
      }

      const record: CachedCase = { mismatchedPixels: 0, name: c.name };
      const images: Record<string, Buffer> = {};

      for (const alias of aliases) {
        const previousComparisonCount = comparisons;
        comparisons += 1;

        if (previousComparisonCount % 128 === 0) {
          if (page) {
            await page.close();
          }

          page = await browser.newPage({
            deviceScaleFactor: 1,
            viewport: { height: 900, width: 1536 },
          });
          page.on("pageerror", (e) => pageErrors.push(e.message));
          await page.goto(url);
          await page.waitForFunction(
            () =>
              // SAFETY: the hash-bound retained Calendar standalone consumer installs the required renderCalendarCase ABI.
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained Calendar consumer bridge boundary.
              !!(window as LegacyCalendarConsumerWindow).renderCalendarCase
          );
        }

        const q: LegacyCalendarQuery = {
          align: c.alignment ?? "left",
          background: c.background ?? manifest.background ?? "#202020",
          case: component + part + c.name + alias,
          checked: String(c.checked ?? false),
          component,
          height: String(c.height),
          label: c.label ?? "",
          native: "1",
          part,
          range: alias.startsWith("range-") ? alias.slice(6) : "",
          scale: String(c.scale),
          selected: String(alias === "selected"),
          state: alias === "base" ? c.state : "normal",
          today: String(alias === "today"),
          width: String(c.width),
          x: String(c.x ?? 16),
          y: String(c.y ?? 16),
        };

        const optionalText = c.text;

        if (optionalText !== null && optionalText !== undefined) {
          q.text = c.text!;
        }

        if (c.wrapWidth ?? 0) {
          q.wrapWidth = String(c.wrapWidth);
        }

        await page!.evaluate((calendarFields) => {
          // SAFETY: the retained Calendar bridge receives string query fields, updates history/background and renders the keyed marker.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact retained Calendar consumer bridge invocation boundary.
          (window as LegacyCalendarConsumerWindow).renderCalendarCase(
            calendarFields
          );
        }, q);
        await expect(page!.locator("#marker")).toHaveAttribute(
          "data-case",
          q.case
        );
        await expect(page!.locator("#subject")).toBeVisible();

        if (part === "label") {
          await expect(page!.locator("#subject")).toHaveAttribute(
            "data-mc-label-layout-ready",
            "true"
          );

          for (const canvas of await page!
            .locator("#subject [data-mc-label-ready]")
            .all()) {
            await expect(canvas).toHaveAttribute("data-mc-label-ready", "true");
          }
        }

        if (part === "trigger-cjk") {
          for (const canvas of await page!
            .locator("#subject [data-mc-label-ready]")
            .all()) {
            await expect(canvas).toHaveAttribute("data-mc-label-ready", "true");
          }
        }

        await page!.mouse.move(0, 0);

        if (
          alias === "base" &&
          (c.state === "hover" || c.state === "disabled-hover")
        ) {
          await page!.locator("#subject").hover({ force: true });
        }

        if (alias === "base" && c.state === "focus") {
          await page!.locator("#subject").focus();
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

          return await frameCompletion.promise;
        });

        const bytes = fs.readFileSync(
          pixelPerfectFile(
            path.join("tests/reference", dir, "captures", c.name)
          )
        );

        assert.equal(hash(bytes), c.sha256);

        const expected = PNG.sync.read(bytes);

        const actualBytes = await page!
          .locator("#subject")
          .screenshot({ animations: "disabled" });

        const actual = PNG.sync.read(actualBytes);
        const mismatch = differences(expected, actual);

        if (mismatch) {
          fs.writeFileSync(
            path.join(pixelPerfectTestRoot, `${component}-actual.png`),
            actualBytes
          );
          throw new Error(
            `${component} ${part} ${c.name} ${alias}: ${mismatch} pixels`
          );
        }

        record[
          alias === "base"
            ? "decodedRgbaSha256"
            : `${alias.replaceAll("-", "")}DecodedRgbaSha256`
        ] = hash(actual.data);
        images[
          alias === "base"
            ? "decodedRgbaSha256"
            : `${alias.replaceAll("-", "")}DecodedRgbaSha256`
        ] = actualBytes;
      }

      assert.deepEqual(pageErrors, []);
      cache.write(c.name, reference, record, images);
      cases.push(record);

      if (cases.length % 128 === 0) {
        console.log(component, part, cases.length);
      }
    }

    const expected = PNG.sync.read(
      fs.readFileSync(
        pixelPerfectFile(
          path.join("tests/reference", dir, "captures", manifest.cases[0].name)
        )
      )
    );

    const changed = PNG.sync.read(PNG.sync.write(expected));

    // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
    changed.data[0] ^= 1;
    assert.equal(differences(expected, changed), 1);
    assert.deepEqual(pageErrors, []);
    assert.equal(
      installedConsumerIdentity(consumer),
      inputIdentity,
      "Installed sources, fixtures or dependencies changed during capture"
    );

    const report = {
      browser: browser.version(),
      caseIsolation: "Fresh context every128 comparisons",
      cases,
      command: `shadcn add http://127.0.0.1:5173/r/${component}.json --yes --overwrite`,
      consumer:
        "Separate initialized Vite/React consumer with independent node_modules",
      consumerInputSha256: inputIdentity,
      consumerRsc: settings.rsc,
      devicePixelRatio: 1,
      files,
      negativeControlMismatchedPixels: 1,
      pageErrors: [],
      renderVerificationUrl: url,
      retainedCases,
      sourceJarSha256: manifest.sourceJarSha256,
      sourceManifest: path.posix.join("tests/reference", dir, "manifest.json"),
      verifierSha256: runtimeIdentity.verifier,
      viewport: { height: 900, width: 1536 },
    };

    const out = pixelPerfectFile(path.join("tests/reference", component));
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, `${part}-installation-verification.json`),
      JSON.stringify(report, null, 2)
    );
    console.log(component, part, cases.length, "references exact");
  }

  console.log(
    component,
    comparisons,
    "actual installed appearances exact; canonical",
    files.length,
    "files"
  );
} finally {
  await browser.close();
}
