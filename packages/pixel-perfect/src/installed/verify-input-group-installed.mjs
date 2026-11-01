import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { packageBin } from "@grasscn/tests/tooling";
import { chromium, expect } from "@playwright/test";
import { repoRoot, webFile, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";
const [consumerArgument, url] = process.argv.slice(2);
assert.ok(
  consumerArgument && url,
  "Usage: bun src/installed/verify-input-group-installed.mjs <consumer-dir> <consumer-url>"
);
const root = repoRoot,
  consumer = path.resolve(consumerArgument),
  sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const item = JSON.parse(
    await readFile(webFile(path.join("registry.json")), "utf8")
  ).items.find((item) => item.name === "input-group"),
  settings = JSON.parse(
    await readFile(path.join(consumer, "components.json"), "utf8")
  ),
  files = [];
const canonical = (bytes) => {
  let s = bytes
    .toString()
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
  if (settings.rsc === false) s = s.replace(/^["']use client["'];?\s*/, "");
  return s.replace(/^(?:\/\/[^\n]*\n\s*)+/, "");
};
for (const entry of item.files) {
  const name = path.basename(entry.path),
    source = await readFile(webFile(path.join(entry.path))),
    installed = await readFile(path.join(consumer, "src/components/ui", name));
  assert.equal(
    canonical(installed),
    canonical(source),
    `${name}: source changed`
  );
  files.push({
    path: name,
    sourceSha256: sha(source),
    installedSha256: sha(installed),
    comparison:
      "Canonical equality except CLI comment/use-client removal; original embedded asset bytes unchanged",
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
  ],
  directory = pixelPerfectFile(path.join("tests/reference/input-group"));
await mkdir(directory, { recursive: true });
let browser = await chromium.launch({ channel: "msedge" }),
  count = 0;
const browserVersion = await browser.version();
try {
  for (const [folder, part] of routes) {
    const reference = pixelPerfectFile(path.join("tests/reference", folder)),
      manifest = JSON.parse(
        await readFile(path.join(reference, "manifest.json"), "utf8")
      ),
      cases = [],
      pageErrors = [];
    const original = PNG.sync.read(
        await readFile(path.join(reference, "captures", manifest.cases[0].name))
      ),
      mutated = PNG.sync.read(PNG.sync.write(original));
    mutated.data[0] ^= 1;
    let changed = 0;
    for (let i = 0; i < original.data.length; i += 4)
      changed += Number(
        !original.data
          .subarray(i, i + 4)
          .equals(mutated.data.subarray(i, i + 4))
      );
    assert.equal(changed, 1);
    for (const c of manifest.cases) {
      if (count && count % 128 === 0) {
        await browser.close();
        browser = await chromium.launch({ channel: "msedge" });
        assert.equal(await browser.version(), browserVersion);
      }
      const page = await browser.newPage({
        viewport: { width: folder === "input" ? 1280 : 1536, height: 900 },
        deviceScaleFactor: 1,
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      try {
        const entry = part === "input" || part === "textarea",
          q = new URLSearchParams({
            component: "input-group",
            native: "1",
            part,
            scale: String(c.scale),
            state: c.state ?? "normal",
            width: String(c.width),
            height: String(c.height ?? (part === "text" ? 9 : 20)),
            x: String(c.x ?? 16),
            y: String(c.y ?? 16),
            background: c.background ?? "#202020",
            label: c.label ?? "Button",
            text: c.text ?? "",
            placeholder: c.placeholder ?? "",
            align: c.alignment ?? "left",
          });
        if (c.wrapWidth != null) q.set("wrapWidth", String(c.wrapWidth));
        if (c.maxLength != null) q.set("maxLength", String(c.maxLength));
        if (entry) {
          await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") });
          await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));
        }
        await page.goto(`${url}?${q}`);
        const subject = page.locator("#subject");
        await expect(subject).toBeVisible();
        if (entry) {
          await expect(subject).toHaveAttribute("data-mc-ready", "true");
          if (
            folder.includes("cjk") ||
            /[^\x00-\x7f]/.test((c.text ?? "") + (c.placeholder ?? ""))
          )
            await expect(subject).toHaveAttribute("data-mc-bitmap", "true");
        }
        if (part === "text")
          await expect(subject).toHaveAttribute(
            "data-mc-label-layout-ready",
            "true"
          );
        for (const line of await subject.locator("[data-mc-label-ready]").all())
          await expect(line).toHaveAttribute("data-mc-label-ready", "true");
        if (c.state?.startsWith("focus")) {
          await subject.focus();
          if (part === "button") {
            await page.keyboard.press("Tab");
            await page.keyboard.press("Shift+Tab");
          }
        }
        if (c.state === "hover") await subject.hover();
        else await page.mouse.move(0, 0);
        if (entry) {
          const cursor = c.cursor ?? c.text.length,
            anchor = c.anchor ?? cursor;
          await subject.evaluate(
            (node, { cursor, anchor }) =>
              node.setSelectionRange(
                Math.min(cursor, anchor),
                Math.max(cursor, anchor),
                cursor < anchor ? "backward" : "forward"
              ),
            { cursor, anchor }
          );
          if (part === "textarea")
            await subject.evaluate(
              (node, y) => {
                node.scrollTop = y;
              },
              (c.value ?? 0) * c.scale
            );
          await page.clock.runFor(c.caretMs);
          await expect(subject).toHaveAttribute("data-mc-ready", "true");
        } else
          await page.evaluate(
            () =>
              new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve))
              )
          );
        const expectedBytes = await readFile(
          path.join(reference, "captures", c.name)
        );
        assert.equal(sha(expectedBytes), c.sha256);
        const expected = PNG.sync.read(expectedBytes),
          actual = PNG.sync.read(
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
        cases.push({
          name: c.name,
          mismatchedPixels: 0,
          decodedRgbaSha256: sha(actual.data),
        });
        count++;
      } finally {
        await page.close();
      }
    }
    assert.deepEqual(pageErrors, []);
    const report = {
      command:
        "shadcn add http://127.0.0.1:5173/r/input-group.json --yes --overwrite",
      consumer:
        "Separate initialized shadcn consumer with independent node_modules",
      consumerRsc: settings.rsc,
      browser: browserVersion,
      devicePixelRatio: 1,
      sourceJarSha256: manifest.sourceJarSha256,
      files,
      cases,
      pageErrors,
      typecheck: { command: "tsc --noEmit", passed: true },
      comparatorMutationDetected: true,
    };
    await writeFile(
      path.join(
        directory,
        `${folder || "button"}-installation-verification.json`
      ),
      JSON.stringify(report, null, 2) + "\n"
    );
    console.log(
      `Installed Input Group ${folder || "button"}: ${cases.length} exact native cases; ${files.length} canonical sources`
    );
  }
} finally {
  await browser.close();
}
