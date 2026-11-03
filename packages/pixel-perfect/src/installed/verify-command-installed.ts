import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { packageBin } from "@grasscn/tests/tooling";
import { chromium, expect } from "@playwright/test";
import type { CommandCaptureManifest } from "@ppt/installed/control-capture-protocol";
import type { InstalledTextRegistry } from "@ppt/installed/text-verification-protocol";
import { webFile, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const [consumerArgument, url] = process.argv.slice(2);

assert.ok(
  consumerArgument && url,
  "Usage: bun src/installed/verify-command-installed.ts <consumer-dir> <consumer-url>"
);

const consumer = path.resolve(consumerArgument);

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

// SAFETY: the authored registry owns this existing awaited source descriptor read.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registry descriptor producer boundary.
const registry = JSON.parse(
  await readFile(webFile(path.join("registry.json")), "utf-8")
) as InstalledTextRegistry;

const item = registry.items.find(
  (registryItem) => registryItem.name === "command"
);

// SAFETY: the initialized shadcn consumer configuration owns its optional rsc setting.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete initialized consumer configuration boundary.
const settings = JSON.parse(
  await readFile(path.join(consumer, "components.json"), "utf-8")
) as { rsc?: boolean };

const files = [];

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

for (const entry of item!.files) {
  const name = path.basename(entry.path);
  const source = await readFile(webFile(path.join(entry.path)));

  const installed = await readFile(
    path.join(consumer, "src/components/ui", name)
  );

  assert.equal(
    canonical(installed),
    canonical(source),
    `${name}: CLI changed source`
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

await mkdir(pixelPerfectFile(path.join("tests/reference/command")), {
  recursive: true,
});

let browser = await chromium.launch({ channel: "msedge" });
let count = 0;

const browserVersion = browser.version();

try {
  for (const [folder, reportName] of [
    ["suggestions", "menu"],
    ["input", "input"],
    ["input-cjk", "input-cjk"],
  ]) {
    const directory = pixelPerfectFile(path.join("tests/reference", folder));

    // SAFETY: the existing command route list selects these actual capture producers at this read point.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact command constituent capture producer boundary.
    const manifest = JSON.parse(
      await readFile(path.join(directory, "manifest.json"), "utf-8")
    ) as CommandCaptureManifest;

    const cases = [];
    const pageErrors: string[] = [];

    const first = PNG.sync.read(
      await readFile(path.join(directory, "captures", manifest.cases[0].name))
    );

    const changed = PNG.sync.read(PNG.sync.write(first));

    // oxlint-disable-next-line eslint/no-bitwise -- Intentional one-bit fault in the cloned PNG data byte; the comparator below must detect exactly one changed pixel.
    changed.data[0] ^= 1;
    let altered = 0;

    for (let i = 0; i < first.data.length; i += 4) {
      altered += Number(
        !first.data.subarray(i, i + 4).equals(changed.data.subarray(i, i + 4))
      );
    }

    assert.equal(altered, 1);

    for (const c of manifest.cases) {
      if (count && count % 128 === 0) {
        await browser.close();
        browser = await chromium.launch({ channel: "msedge" });
        assert.equal(browser.version(), browserVersion);
      }

      const page = await browser.newPage({
        deviceScaleFactor: 1,
        viewport: { height: 900, width: folder === "input" ? 1280 : 1536 },
      });

      page.on("pageerror", (error) => pageErrors.push(error.message));

      try {
        const menu = folder === "suggestions";

        const query = new URLSearchParams({
          background: c.background ?? "#202020",
          component: "command",
          height: String(c.height),
          native: "1",
          part: menu ? "list" : "input",
          scale: String(c.scale),
          state: c.state,
          width: String(c.width),
          x: String(c.x ?? 16),
          y: String(c.y ?? 16),
        });

        if (menu) {
          query.set("labels", JSON.stringify(c.labels));
          query.set(
            "surface",
            c.element === "menu-panel" ? "popup" : "suggestions"
          );
          query.set("selectedIndex", String(c.selectedIndex));
        } else {
          query.set("text", c.text!);
          query.set("placeholder", c.placeholder ?? "");

          const optionalMaxLength = c.maxLength;

          if (optionalMaxLength !== null && optionalMaxLength !== undefined) {
            query.set("maxLength", String(c.maxLength));
          }

          await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") });
          await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));
        }

        await page.goto(`${url}?${query}`);

        const subject = page.locator(
          menu ? '[data-slot="command-list"]' : '[data-slot="command-input"]'
        );

        if (menu) {
          await expect(subject).toHaveAttribute("data-mc-menu-ready", "true");
          await subject.focus();

          await (c.state.endsWith("hover") ?
            subject.getByRole("option").nth(c.targetIndex!).hover()
          :
            page.mouse.move(0, 0)
          );

          await subject.evaluate(
            (node, scroll) => {
              node.scrollTop = scroll;
            },
            (c.value ?? 0) * 12 * c.scale
          );
          await expect(
            subject.locator('[data-mc-menu-text-ready="false"]')
          ).toHaveCount(0, { timeout: 15_000 });

          for (const line of await subject
            .locator("[data-mc-menu-unicode-ready]")
            .all()) {
            await expect(line).toHaveAttribute(
              "data-mc-menu-unicode-ready",
              "true"
            );
          }

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
        } else {
          await expect(subject).toHaveAttribute("data-mc-ready", "true");

          if (folder === "input-cjk") {
            await expect(subject).toHaveAttribute("data-mc-bitmap", "true");
          }

          if (c.state.startsWith("focus")) {
            await subject.focus();
          }

          await (c.state === "hover" ?
            subject.hover()
          :
            page.mouse.move(0, 0)
          );

          const cursor = c.cursor ?? c.text!.length;
          const anchor = c.anchor ?? cursor;

          await subject.evaluate(
            (
              node: HTMLInputElement | HTMLTextAreaElement,
              { cursor: selectionCursor, anchor: selectionAnchor }
            ) => {
              // SAFETY: the entry route renders an HTML input or textarea with native selection support.
              node.setSelectionRange(
                Math.min(selectionCursor, selectionAnchor),
                Math.max(selectionCursor, selectionAnchor),
                selectionCursor < selectionAnchor ? "backward" : "forward"
              );
            },
            { anchor, cursor }
          );
          await page.clock.runFor(c.caretMs!);
          await expect(subject).toHaveAttribute("data-mc-ready", "true");
        }

        const expectedBytes = await readFile(
          path.join(directory, "captures", c.name)
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
          `Installed Command ${folder}: ${c.name} differs`
        );
        cases.push({
          decodedRgbaSha256: sha(actual.data),
          mismatchedPixels: 0,
          name: c.name,
        });
        count += 1;
      } finally {
        await page.close();
      }
    }

    assert.deepEqual(pageErrors, []);

    const report = {
      browser: browserVersion,
      cases,
      command:
        "shadcn add http://127.0.0.1:5173/r/command.json --yes --overwrite",
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

    await writeFile(
      pixelPerfectFile(
        path.join(
          "tests/reference/command",
          `${reportName}-installation-verification.json`
        )
      ),
      `${JSON.stringify(report, null, 2)}\n`
    );
    console.log(
      `Installed Command ${folder}: ${cases.length} exact native cases; ${files.length} canonical sources`
    );
  }
} finally {
  await browser.close();
}
