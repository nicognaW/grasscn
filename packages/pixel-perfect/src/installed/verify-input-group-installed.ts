import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { packageBin } from "@grasscn/tests/tooling";
import { chromium, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type {
  InputGroupCaptureManifest,
  RegisteredEntryContent,
  InputGroupEntryElement,
} from "@ppt/installed/control-capture-protocol";
import type {
  InstalledTextRegistry,
  InstalledTextItem,
} from "@ppt/installed/text-verification-protocol";
import { webFile, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const [consumerArgument, url] = process.argv.slice(2);

assert.ok(
  consumerArgument && url,
  "Usage: bun src/installed/verify-input-group-installed.ts <consumer-dir> <consumer-url>"
);

const consumer = path.resolve(consumerArgument);

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

type InstalledInputGroupCase = {
  folder: string;
  page: Page;
  reference: string;
  url: string;
} & (
  | {
      part: "input" | "textarea";
      c: Omit<
        InputGroupCaptureManifest["cases"][number],
        keyof RegisteredEntryContent
      > &
        RegisteredEntryContent;
    }
  | { part: "text" | "button"; c: InputGroupCaptureManifest["cases"][number] }
);

const inputGroupParameters = (
  c: InputGroupCaptureManifest["cases"][number],
  part: string
) => {
  const q = new URLSearchParams({
    align: c.alignment ?? "left",
    background: c.background ?? "#202020",
    component: "input-group",
    height: String(c.height ?? (part === "text" ? 9 : 20)),
    label: c.label ?? "Button",
    native: "1",
    part,
    placeholder: c.placeholder ?? "",
    scale: String(c.scale),
    state: c.state ?? "normal",
    text: c.text ?? "",
    width: String(c.width),
    x: String(c.x ?? 16),
    y: String(c.y ?? 16),
  });

  const optionalWrapWidth = c.wrapWidth;

  if (optionalWrapWidth !== null && optionalWrapWidth !== undefined) {
    q.set("wrapWidth", String(c.wrapWidth));
  }

  const optionalMaxLength = c.maxLength;

  if (optionalMaxLength !== null && optionalMaxLength !== undefined) {
    q.set("maxLength", String(c.maxLength));
  }

  return q;
};

const verifyInputGroupReferenceCase = async ({
  c,
  folder,
  page,
  part,
  reference,
  url: fixtureUrl,
}: InstalledInputGroupCase) => {
  const entry = part === "input" || part === "textarea";

  const q = inputGroupParameters(c, part);

  if (entry) {
    await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));
  }

  await page.goto(`${fixtureUrl}?${q}`);
  const subject = page.locator("#subject");
  await expect(subject).toBeVisible();

  if (entry) {
    await expect(subject).toHaveAttribute("data-mc-ready", "true");

    if (
      folder.includes("cjk") ||
      /\P{ASCII}/u.test((c.text ?? "") + (c.placeholder ?? ""))
    ) {
      await expect(subject).toHaveAttribute("data-mc-bitmap", "true");
    }
  }

  if (part === "text") {
    await expect(subject).toHaveAttribute("data-mc-label-layout-ready", "true");
  }

  {
    const glyphs = await subject.locator("[data-mc-label-ready]").all();

    const glyphReadinessResults = await Promise.allSettled(
      glyphs.map(async (line) => {
        await expect(line).toHaveAttribute("data-mc-label-ready", "true");
      })
    );

    const rejectedReadiness = glyphReadinessResults.find(
      (result) => result.status === "rejected"
    );

    if (rejectedReadiness) {
      throw rejectedReadiness.reason;
    }
  }

  if (c.state?.startsWith("focus")) {
    await subject.focus();

    if (part === "button") {
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
    }
  }

  await (c.state === "hover" ? subject.hover() : page.mouse.move(0, 0));

  if (entry) {
    const cursor = c.cursor ?? c.text.length;
    const anchor = c.anchor ?? cursor;

    await subject.evaluate(
      (node, { cursor: selectionCursor, anchor: selectionAnchor }) => {
        // SAFETY: the entry route renders an HTML input or textarea with native selection support.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact installed entry fixture HTML DOM API boundary.
        (node as InputGroupEntryElement).setSelectionRange(
          Math.min(selectionCursor, selectionAnchor),
          Math.max(selectionCursor, selectionAnchor),
          selectionCursor < selectionAnchor ? "backward" : "forward"
        );
      },
      { anchor, cursor }
    );

    if (part === "textarea") {
      await subject.evaluate(
        (node, y) => {
          node.scrollTop = y;
        },
        (c.value ?? 0) * c.scale
      );
    }

    await page.clock.runFor(c.caretMs);
    await expect(subject).toHaveAttribute("data-mc-ready", "true");
  } else {
    await page.evaluate(async () => {
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

  const expectedBytes = await readFile(
    path.join(reference, "captures", c.name)
  );

  assert.equal(sha(expectedBytes), c.sha256);

  const expected = PNG.sync.read(expectedBytes);

  const actual = PNG.sync.read(
    await subject.screenshot({ animations: "disabled" })
  );

  assert.deepEqual(
    [actual.width, actual.height],
    [expected.width, expected.height]
  );
  assert.ok(
    actual.data.equals(expected.data),
    `${folder}/${c.name}: installed pixels differ`
  );

  return {
    decodedRgbaSha256: sha(actual.data),
    mismatchedPixels: 0,
    name: c.name,
  };
};

// SAFETY: the authored registry owns this fresh installed source descriptor read.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registry descriptor producer boundary.
const registry = JSON.parse(
  await readFile(webFile(path.join("registry.json")), "utf-8")
) as InstalledTextRegistry;

// SAFETY: the authored registry uniquely declares input-group, selected by this existing fixed/validated route; a missing item retains its original later dereference failure.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact authored registry item producer projection; fresh read and original failure timing preserved.
const item = registry.items.find(
  (registryItem) => registryItem.name === "input-group"
) as InstalledTextItem;

// SAFETY: the initialized shadcn consumer configuration owns its optional rsc setting.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete initialized consumer configuration boundary.
const settings = JSON.parse(
  await readFile(path.join(consumer, "components.json"), "utf-8")
) as { rsc?: boolean };

const files = [];

const canonical = (bytes: Buffer) => {
  let s = bytes
    .toString()
    .replaceAll(/\/\*[\s\S]*?\*\//gu, "")
    .trim();

  if (settings.rsc === false) {
    s = s.replace(/^["']use client["'];?\s*/u, "");
  }

  return s.replace(/^(?:\/\/[^\n]*\n\s*)+/u, "");
};

const sourceFileReads = await Promise.allSettled(
  item.files.map(async (entry) => {
    const name = path.basename(entry.path);

    const [firstRead, secondRead] = await Promise.allSettled(
      [
        async () => await readFile(webFile(path.join(entry.path))),
        async () =>
          await readFile(path.join(consumer, "src/components/ui", name)),
      ].map(async (read) => await read())
    );

    if (firstRead.status === "rejected") {
      throw firstRead.reason;
    }

    if (secondRead.status === "rejected") {
      throw secondRead.reason;
    }

    return {
      installed: secondRead.value,
      name,
      source: firstRead.value,
    };
  })
);

for (const fileRead of sourceFileReads) {
  if (fileRead.status === "rejected") {
    throw fileRead.reason;
  }

  const { installed, name, source } = fileRead.value;

  assert.equal(
    canonical(installed),
    canonical(source),
    `${name}: source changed`
  );
  files.push({
    comparison:
      "Canonical equality except CLI comment/use-client removal; original embedded asset bytes unchanged",
    installedSha256: sha(installed),
    path: name,
    sourceSha256: sha(source),
  });
}

execFileSync(
  process.execPath,
  [packageBin("typescript", "tsc", consumer), "--noEmit"],
  { cwd: consumer, stdio: "pipe" }
);

const routes = [
  ["input", "input"],
  ["input-cjk", "input"],
  ["textarea", "textarea"],
  ["textarea-cjk", "textarea"],
  ["label", "text"],
  ["", "button"],
  ["button-cjk", "button"],
];

const directory = pixelPerfectFile(path.join("tests/reference/input-group"));

await mkdir(directory, { recursive: true });

let browser = await chromium.launch({ channel: "msedge" });
let count = 0;

const browserVersion = browser.version();

try {
  for (const [folder, part] of routes) {
    const reference = pixelPerfectFile(path.join("tests/reference", folder));

    // SAFETY: the existing input-group route list selects these actual capture producers at this read point.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact input-group constituent capture producer boundary.
    const manifest = JSON.parse(
      // oxlint-disable-next-line eslint/no-await-in-loop -- Load this route evidence before its dependent shared-browser cases run.
      await readFile(path.join(reference, "manifest.json"), "utf-8")
    ) as InputGroupCaptureManifest;

    const cases = [];
    const pageErrors: string[] = [];

    const original = PNG.sync.read(
      // oxlint-disable-next-line eslint/no-await-in-loop -- Load this route evidence before its dependent shared-browser cases run.
      await readFile(path.join(reference, "captures", manifest.cases[0].name))
    );

    const mutated = PNG.sync.read(PNG.sync.write(original));

    // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
    mutated.data[0] ^= 1;
    let changed = 0;

    for (let i = 0; i < original.data.length; i += 4) {
      changed += Number(
        !original.data
          .subarray(i, i + 4)
          .equals(mutated.data.subarray(i, i + 4))
      );
    }

    assert.equal(changed, 1);

    for (const c of manifest.cases) {
      if (count && count % 128 === 0) {
        // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
        await browser.close();
        // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
        browser = await chromium.launch({ channel: "msedge" });
        assert.equal(browser.version(), browserVersion);
      }

      // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
      const page = await browser.newPage({
        deviceScaleFactor: 1,
        viewport: { height: 900, width: folder === "input" ? 1280 : 1536 },
      });

      page.on("pageerror", (error) => pageErrors.push(error.message));

      try {
        cases.push(
          // Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
          // SAFETY: The registered entry routes select closed Input/TextArea definitions with text and caretMs in every state; the capture/layout producer preserves both fields.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion, eslint/no-await-in-loop -- Exact registered route/content correlation; broad native capture fields and missing-data runtime failures remain unchanged.
          await verifyInputGroupReferenceCase({
            c,
            folder,
            page,
            part,
            reference,
            url,
          } as InstalledInputGroupCase)
        );
        count += 1;
      } finally {
        // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
        await page.close();
      }
    }

    assert.deepEqual(pageErrors, []);

    const report = {
      browser: browserVersion,
      cases,
      command:
        "shadcn add http://127.0.0.1:5173/r/input-group.json --yes --overwrite",
      comparatorMutationDetected: true,
      consumer:
        "Separate initialized shadcn consumer with independent node_modules",
      consumerRsc: settings.rsc,
      devicePixelRatio: 1,
      files,
      pageErrors,
      sourceJarSha256: manifest.sourceJarSha256,
      typecheck: { command: "tsc --noEmit", passed: true },
    };

    // oxlint-disable-next-line eslint/no-await-in-loop -- Publish this route result before advancing the shared-browser case matrix.
    await writeFile(
      path.join(
        directory,
        `${folder || "button"}-installation-verification.json`
      ),
      `${JSON.stringify(report, null, 2)}\n`
    );
    console.log(
      `Installed Input Group ${folder || "button"}: ${cases.length} exact native cases; ${files.length} canonical sources`
    );
  }
} finally {
  await browser.close();
}
