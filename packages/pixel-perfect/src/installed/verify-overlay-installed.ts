import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { chromium, expect } from "@playwright/test";
import type {
  DecodedPixels,
  OverlayCaptureManifest,
  OverlayCaseResult,
  InstalledOverlayDataset,
  InstalledOverlayProof,
} from "@ppt/installed/installed-compositions-protocol";
import type { InstalledTextRegistry } from "@ppt/installed/text-verification-protocol";
import { webFile, pixelPerfectFile, repositoryFile } from "@ppt/paths";
import { PNG } from "pngjs";

const [consumerArg, nameArg, urlArg] = process.argv.slice(2);

assert.ok(
  consumerArg && ["sheet", "drawer"].includes(nameArg) && urlArg,
  "Usage: bun src/installed/verify-overlay-installed.ts <consumer> <sheet|drawer> <fixture-url>"
);

const consumer = path.resolve(consumerArg);
const base = urlArg;
const names = [nameArg];
const smoke = false;
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const browser = await chromium.launch({ channel: "msedge" });

// SAFETY: the authored registry owns this fresh source descriptor read.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registry descriptor producer boundary.
const registry = JSON.parse(
  fs.readFileSync(webFile(path.join("registry.json"))).toString()
) as InstalledTextRegistry;

const item = registry.items.find((i) => i.name === nameArg);

// SAFETY: the initialized shadcn consumer components.json owns the optional rsc setting.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete initialized consumer configuration boundary.
const settings = JSON.parse(
  fs.readFileSync(path.join(consumer, "components.json")).toString()
) as { rsc?: boolean };

assert.ok(item);

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

const files = item.files.map((entry) => {
  const name = path.basename(entry.path);
  const source = fs.readFileSync(webFile(path.join(entry.path)));

  const installed = fs.readFileSync(
    path.join(consumer, "src/components/ui", name)
  );

  assert.equal(
    canonical(installed),
    canonical(source),
    `${name} changed beyond CLI transforms`
  );

  return {
    comparison:
      "Identical except CLI comment removal and use-client removal for rsc:false; data URIs unchanged",
    installedSha256: hash(installed),
    path: name,
    sourceSha256: hash(source),
  };
});

const report: InstalledOverlayProof[] = [];

function compare(a: DecodedPixels, b: DecodedPixels) {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(
      `dimensions ${a.width}x${a.height} / ${b.width}x${b.height}`
    );
  }

  let n = 0;
  const diff = new PNG({ height: a.height, width: a.width });

  for (let i = 0; i < a.data.length; i += 4) {
    const mismatch = !a.data
      .subarray(i, i + 4)
      .equals(b.data.subarray(i, i + 4));

    n += Number(mismatch);
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

  return { diff, mismatchedPixels: n };
}

try {
  const pending = [...names];
  await Promise.all(
    Array.from({ length: Math.min(2, names.length) }, async () => {
      while (pending.length) {
        const name = pending.shift()!;
        const errors: string[] = [];

        let page = await browser.newPage({
          deviceScaleFactor: 1,
          viewport: { height: 900, width: 1536 },
        });

        let count = 0;

        page.on("pageerror", (e) => errors.push(e.message));
        const all: InstalledOverlayDataset[] = [];

        for (const dir of ["card", "label"]) {
          const folder = pixelPerfectFile(path.join("tests/reference", dir));

          // SAFETY: the fixed Card/Label directory table selects these captured-reference producers.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact Overlay constituent capture producer boundary.
          const m = JSON.parse(
            fs.readFileSync(path.join(folder, "manifest.json")).toString()
          ) as OverlayCaptureManifest;

          const { cases } = m;
          const records: OverlayCaseResult[] = [];

          for (const c of smoke ? cases.slice(0, 2) : cases) {
            const parts =
              dir === "label" ? ["title", "description"] : ["surface"];

            const record: OverlayCaseResult = { name: c.name };

            for (const part of parts) {
              const previousCaseCount = count;
              count += 1;

              if (previousCaseCount > 0 && count % 64 === 0) {
                await page.close();
                page = await browser.newPage({
                  deviceScaleFactor: 1,
                  viewport: { height: 900, width: 1536 },
                });
                page.on("pageerror", (e) => errors.push(e.message));
              }

              const q = new URLSearchParams({
                align: c.alignment ?? "left",
                background: c.background,
                component: name,
                height: String(c.height),
                native: "1",
                part,
                scale: String(c.scale),
                width: String(c.width),
                x: String(c.x),
                y: String(c.y),
              });

              const optionalLabel = c.label;

              if (optionalLabel !== null && optionalLabel !== undefined) {
                q.set("label", c.label!);
              }

              const optionalText = c.text;

              if (optionalText !== null && optionalText !== undefined) {
                q.set("text", c.text!);
              }

              const optionalWrapWidth = c.wrapWidth;

              if (
                optionalWrapWidth !== null &&
                optionalWrapWidth !== undefined
              ) {
                q.set("wrapWidth", String(c.wrapWidth));
              }

              await page.goto(`${base}?${q}`);
              await page.mouse.move(0, 0);
              await page.addStyleTag({
                content: "#root{visibility:hidden}#subject{visibility:visible}",
              });
              await page.addStyleTag({
                content: `[data-slot="${name}-overlay"]{visibility:hidden!important}[data-slot="${name}-content"]{visibility:hidden}#subject{visibility:visible}`,
              });
              const target = page.locator("#subject");
              await expect(target).toBeVisible();

              if (dir === "label") {
                await expect(target).toHaveAttribute(
                  "data-mc-label-layout-ready",
                  "true"
                );

                for (const line of await target
                  .locator("[data-mc-label-ready]")
                  .all()) {
                  await expect(line).toHaveAttribute(
                    "data-mc-label-ready",
                    "true"
                  );
                }
              }

              await page.evaluate(
                async () =>
                  {
                    const frameCompletion = Promise.withResolvers();

                    try {
                      requestAnimationFrame(() => {
                        requestAnimationFrame(frameCompletion.resolve);
                      });
                    } catch (error) {
                      frameCompletion.reject(error);
                    }

                    return frameCompletion.promise;
                  }
              );

              const expectedBytes = fs.readFileSync(
                path.join(folder, "captures", c.name)
              );

              if (hash(expectedBytes) !== c.sha256) {
                throw new Error(`reference hash ${c.name}`);
              }

              const actualBytes = await target.screenshot({
                animations: "disabled",
              });

              const actual = PNG.sync.read(actualBytes);
              const expected = PNG.sync.read(expectedBytes);
              const result = compare(expected, actual);

              // Keep capture artifacts outside the consumer's Vite/Tailwind watch root.
              const out = repositoryFile(
                path.join(
                  ".pixel-perfect-test",
                  "installed-verification",
                  path.basename(consumer),
                  name,
                  `${part}-${c.name}`
                )
              );

              fs.mkdirSync(out, { recursive: true });
              fs.writeFileSync(
                path.join(out, "metrics.json"),
                JSON.stringify({
                  case: c.name,
                  mismatchedPixels: result.mismatchedPixels,
                  part,
                  tolerance: 0,
                  totalPixels: actual.width * actual.height,
                })
              );

              if (result.mismatchedPixels) {
                fs.writeFileSync(path.join(out, "actual.png"), actualBytes);
                fs.writeFileSync(
                  path.join(out, "diff.png"),
                  PNG.sync.write(result.diff)
                );
                throw new Error(
                  `${name} ${dir} ${part} ${c.name}: ${result.mismatchedPixels} pixels`
                );
              }

              record[
                part === "description"
                  ? "descriptionDecodedRgbaSha256"
                  : "decodedRgbaSha256"
              ] = hash(actual.data);
              record.mismatchedPixels = 0;
            }

            records.push(record);
          }

          const expected = PNG.sync.read(
            fs.readFileSync(path.join(folder, "captures", cases[0].name))
          );

          const mutated = PNG.sync.read(PNG.sync.write(expected));

          mutated.data[0] ^= 1;

          if (compare(expected, mutated).mismatchedPixels !== 1) {
            throw new Error("Comparator negative control failed");
          }

          all.push({
            cases: records,
            manifest: `tests/reference/${dir}/manifest.json`,
            negativeControlMismatchedPixels: 1,
          });
        }

        if (errors.length) {
          throw new Error(errors.join("\n"));
        }

        report.push({
          browser: browser.version(),
          datasets: all,
          name,
          pageErrors: errors,
        });
        console.log(
          name,
          all.map((d) => `${d.manifest}:${d.cases.length}`).join(" ")
        );
        await page.close();
      }
    })
  );

  for (const r of report) {
    for (const dataset of r.datasets) {
      // SAFETY: the dataset retains the Card/Label manifest path from the existing capture loop.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact Overlay report capture producer boundary.
      const manifest = JSON.parse(
        fs
          .readFileSync(pixelPerfectFile(path.join(dataset.manifest)))
          .toString()
      ) as OverlayCaptureManifest;

      const proof = {
        browser: r.browser,
        caseIsolation: "Fresh page/context every64 comparisons",
        cases: dataset.cases,
        command: `shadcn add http://127.0.0.1:5173/r/${nameArg}.json --yes --overwrite`,
        consumer:
          "Separate initialized shadcn Vite/React consumer with independent node_modules",
        consumerRsc: settings.rsc,
        devicePixelRatio: 1,
        files,
        negativeControlMismatchedPixels: 1,
        pageErrors: r.pageErrors,
        renderVerificationUrl: base,
        sourceJarSha256: manifest.sourceJarSha256,
        sourceManifest: dataset.manifest,
        viewport: { height: 900, width: 1536 },
      };

      const filename = pixelPerfectFile(
        path.join(
          "tests/reference",
          nameArg,
          dataset.manifest.includes("/card/")
            ? "panel-installation-verification.json"
            : "text-installation-verification.json"
        )
      );

      fs.writeFileSync(filename, `${JSON.stringify(proof, null, 2)}\n`);
    }
  }

  console.log(
    `Installed ${nameArg}: all original native pixels and ${files.length} canonical source files match`
  );
} finally {
  await browser.close();
}
