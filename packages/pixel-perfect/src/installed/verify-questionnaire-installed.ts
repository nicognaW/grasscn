import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { Page } from "@playwright/test";
import { chromium, expect } from "@playwright/test";
import type {
  QuestionnaireCaptureManifest,
  QuestionnaireCaseResult,
  QuestionnairePartProof,
  LabelCaptureManifest,
} from "@ppt/installed/installed-compositions-protocol";
import type { InstalledTextRegistry } from "@ppt/installed/text-verification-protocol";
import { pixelPerfectTestRoot, webFile, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

fs.mkdirSync(pixelPerfectTestRoot, { recursive: true });

const [consumerArg, urlArg, partsArg] = process.argv.slice(2);
const consumer = path.resolve(consumerArg);
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

// SAFETY: the authored registry owns this fresh source descriptor read.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registry descriptor producer boundary.
const registry = JSON.parse(
  fs.readFileSync(webFile(path.join("registry.json"))).toString()
) as InstalledTextRegistry;

const item = registry.items.find((i) => i.name === "questionnaire");

// SAFETY: the initialized shadcn consumer components.json owns the optional rsc setting.
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
const browser = await chromium.launch({ channel: "msedge" });

let count = 0;
let page: Page | undefined;

try {
  for (const [part, dir] of [
    ["title", "label"],
    ["description", "label"],
    ["error", "label"],
    ["progress", "label"],
    ["checkbox", "controls"],
    ["action", "."],
    ["action", "button-cjk"],
    ["input", "input"],
  ].filter(
    ([constituentPart]) =>
      !partsArg || partsArg.split(",").includes(constituentPart)
  )) {
    // SAFETY: the existing part directory table selects the Label/Controls/Button/Input capture producers.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact Questionnaire constituent capture producer boundary.
    const m = JSON.parse(
      fs
        .readFileSync(
          `${pixelPerfectFile(path.join("tests/reference", dir))}/manifest.json`
        )
        .toString()
    ) as QuestionnaireCaptureManifest;

    const cases = [];

    for (const c of m.cases) {
      const record: QuestionnaireCaseResult = {
        mismatchedPixels: 0,
        name: c.name,
      };

      let questionnaireActions: readonly ("next" | "previous" | "skip" | "submit" | "radio")[];

      if (part === "action") {
        questionnaireActions = (["next", "previous", "skip", "submit"] as const);
      } else if (part === "checkbox") {
        questionnaireActions = (["next", "radio"] as const);
      } else {
        questionnaireActions = (["next"] as const);
      }

      for (const action of questionnaireActions) {
        let shouldCreatePage = part === "input";

        if (!shouldCreatePage) {
          const previousCount = count;
          count += 1;
          shouldCreatePage = previousCount % 64 === 0;
        }

        if (shouldCreatePage) {
          if (page) {
            await page.close();
          }

          page = await browser.newPage({
            deviceScaleFactor: 1,
            viewport: { height: 900, width: 1536 },
          });
          page.on("pageerror", (e) => pageErrors.push(e.message));

          if (part === "input") {
            await page.clock.install({
              time: new Date("2026-10-28T00:00:00Z"),
            });
            await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));
          }
        }

        const q = new URLSearchParams({
          action,
          align: c.alignment ?? "left",
          background: c.background ?? m.background ?? "#202020",
          checked: String(c.checked ?? false),
          height: String(c.height ?? 20),
          label: c.label ?? "",
          native: "1",
          part,
          placeholder: c.placeholder ?? "",
          scale: String(c.scale),
          state: c.state,
          text: c.text ?? "",
          width: String(c.width),
          x: String(c.x ?? 16),
          y: String(c.y ?? 16),
        });

        if (action === "radio") {
          q.set("radio", "1");
        }

        if (c.wrapWidth ?? 0) {
          q.set("wrapWidth", String(c.wrapWidth));
        }

        const optionalMaxLength = c.maxLength;

        if (optionalMaxLength !== null && optionalMaxLength !== undefined) {
          q.set("maxLength", String(c.maxLength));
        }

        await page!.goto(`${urlArg}?${q}`);
        const subject = page!.locator("#subject");
        await expect(subject).toBeVisible();

        if (["title", "description", "error", "progress"].includes(part)) {
          await expect(subject).toHaveAttribute(
            "data-mc-label-layout-ready",
            "true"
          );
        }

        if (part === "input") {
          await expect(subject).toHaveAttribute("data-mc-ready", "true");
        }

        await page!.mouse.move(0, 0);

        if (c.state.startsWith("focus")) {
          await (
            part === "checkbox" ? subject.locator("input") : subject
          ).focus();
        }

        if (c.state === "hover") {
          await (
            part === "checkbox" ? subject.locator("input") : subject
          ).hover();
        }

        if (part === "input") {
          const cursor = c.cursor ?? c.text!.length;
          const anchor = c.anchor ?? cursor;

          await subject.evaluate(
            (input: HTMLInputElement, p) => {
              // SAFETY: the input constituent fixture renders #subject as an HTML input with selection support.
              input.setSelectionRange(
                Math.min(p.cursor, p.anchor),
                Math.max(p.cursor, p.anchor),
                p.cursor < p.anchor ? "backward" : "forward"
              );
            },
            { anchor, cursor }
          );
          await page!.clock.runFor(c.caretMs!);
          await expect(subject).toHaveAttribute("data-mc-ready", "true");
        } else {
          for (const glyph of await subject
            .locator("[data-mc-label-ready]")
            .all()) {
            await expect(glyph).toHaveAttribute("data-mc-label-ready", "true");
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
        }

        const bytes = fs.readFileSync(
          `${pixelPerfectFile(path.join("tests/reference", dir))}/captures/${
            c.name
          }`
        );

        if (hash(bytes) !== c.sha256) {
          throw new Error(`Native reference hash changed ${c.name}`);
        }

        const actualBytes = await subject.screenshot({
          animations: "disabled",
        });

        const a = PNG.sync.read(actualBytes);
        const b = PNG.sync.read(bytes);

        if (a.width !== b.width || a.height !== b.height) {
          throw new Error(
            `Dimensions ${part} ${c.name} ${[a.width, a.height]} expected ${[
              b.width,
              b.height,
            ]}`
          );
        }

        let n = 0;

        for (let i = 0; i < b.data.length; i += 4) {
          n += Number(
            !a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4))
          );
        }

        if (n) {
          fs.writeFileSync(
            path.join(pixelPerfectTestRoot, "questionnaire-actual.png"),
            actualBytes
          );
          throw new Error(`${part} ${c.name} ${n} pixels`);
        }

        const field: keyof QuestionnaireCaseResult =
          action === "next"
            ? "decodedRgbaSha256"
            : `${action}DecodedRgbaSha256`;

        record[field] = hash(a.data);
      }

      cases.push(record);

      if (cases.length % 64 === 0) {
        console.log(part, dir, cases.length, "exact");
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
    let n = 0;

    for (let i = 0; i < expected.data.length; i += 4) {
      n += Number(
        !expected.data
          .subarray(i, i + 4)
          .equals(changed.data.subarray(i, i + 4))
      );
    }

    assert.equal(n, 1);
    assert.deepEqual(pageErrors, []);
    const target = pixelPerfectFile(path.join("tests/reference/questionnaire"));
    fs.mkdirSync(target, { recursive: true });

    const report = {
      browser: browser.version(),
      cases,
      command:
        "shadcn add http://127.0.0.1:5173/r/questionnaire.json --yes --overwrite",
      consumer:
        "Separate initialized shadcn consumer with independent node_modules",
      consumerRsc: settings.rsc,
      devicePixelRatio: 1,
      files,
      negativeControlMismatchedPixels: 1,
      pageErrors: [],
      renderVerificationUrl: urlArg,
      sourceJarSha256: m.sourceJarSha256,
      sourceManifest: path.posix.join("tests/reference", dir, "manifest.json"),
      viewport: { height: 900, width: 1536 },
    };

    fs.writeFileSync(
      path.join(
        target,
        part === "action"
          ? `${
              dir === "." ? "action-ascii" : "action-cjk"
            }-installation-verification.json`
          : `${part}-installation-verification.json`
      ),
      JSON.stringify(report, null, 2)
    );
    console.log(part, dir, cases.length, "exact");
  }
} finally {
  await browser.close();
}

// Publish the combined report consumed by the registry evidence check only after
// all four text parts have been verified in this invocation.
const textParts = ["title", "description", "error", "progress"];

if (
  !partsArg ||
  textParts.every((part) => partsArg.split(",").includes(part))
) {
  const directory = pixelPerfectFile(
    path.join("tests/reference/questionnaire")
  );

  const reports = textParts.map(
    (part) =>
      // SAFETY: the earlier loop writes each text part proof with these source, browser and case result fields.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact verifier-owned Questionnaire part report boundary.
      JSON.parse(
        fs.readFileSync(
          path.join(directory, `${part}-installation-verification.json`),
          "utf-8"
        )
      ) as QuestionnairePartProof
  );

  const base = reports[0];

  // SAFETY: the combined text proof reads the existing Label captured-reference producer here.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact Label captured-reference producer boundary.
  const manifest = JSON.parse(
    fs.readFileSync(
      pixelPerfectFile(path.join("tests/reference/label/manifest.json")),
      "utf-8"
    )
  ) as LabelCaptureManifest;

  for (const report of reports) {
    assert.deepEqual(report.files, files);
    assert.deepEqual(report.pageErrors, []);
    assert.equal(report.browser, base.browser);
    assert.equal(report.cases.length, manifest.cases.length);
  }

  const cases = manifest.cases.map((sample) => {
    const bytes = fs.readFileSync(
      pixelPerfectFile(path.join("tests/reference/label/captures", sample.name))
    );

    assert.equal(hash(bytes), sample.sha256);
    const expected = hash(PNG.sync.read(bytes).data);

    const records = reports.map((report) =>
      report.cases.find((record) => record.name === sample.name)
    );

    for (const record of records) {
      assert.equal(record!.mismatchedPixels, 0);
      assert.equal(record!.decodedRgbaSha256, expected);
    }

    return {
      ...records[0],
      ...Object.fromEntries(
        textParts
          .slice(1)
          .map((part, index) => [
            `${part}DecodedRgbaSha256`,
            records[index + 1]!.decodedRgbaSha256,
          ])
      ),
    };
  });

  fs.writeFileSync(
    path.join(directory, "text-installation-verification.json"),
    `${JSON.stringify({ ...base, cases, parts: textParts }, null, 2)}\n`
  );
}
