import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, expect } from "@playwright/test";
import {
  pixelPerfectTestRoot,
  repoRoot,
  resolveRepositoryPath,
  packageBin,
} from "@ppt/paths";
import { PNG } from "pngjs";
const [consumerArgument, name, origin, definition] = process.argv.slice(2);
if (!consumerArgument || !["message", "bubble"].includes(name) || !origin)
  throw Error(
    "Usage: bun src/installed/verify-chat-installed.mjs <consumer> <message|bubble> <fixture-url> [registry-item-file]"
  );
const repo = repoRoot,
  consumer = path.resolve(consumerArgument),
  item = definition
    ? JSON.parse(fs.readFileSync(definition, "utf8"))
    : JSON.parse(
        fs.readFileSync(
          resolveRepositoryPath(path.join("registry.json")),
          "utf8"
        )
      ).items.find((i) => i.name === name),
  settings = JSON.parse(
    fs.readFileSync(path.join(consumer, "components.json"), "utf8")
  ),
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  canonical = (b) => {
    let t = b
      .toString()
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim();
    if (settings.rsc === false) t = t.replace(/^["']use client["'];?\s*/, "");
    return t.replace(/^(?:\/\/[^\n]*\n\s*)+/, "");
  },
  files = item.files.map((f) => {
    const base = path.basename(f.path),
      source = fs.readFileSync(resolveRepositoryPath(path.join(f.path))),
      installed = fs.readFileSync(
        path.join(consumer, "src/components/ui", base)
      );
    assert.equal(
      canonical(source),
      canonical(installed),
      base + " installed source mismatch"
    );
    return {
      path: base,
      sourceSha256: sha(source),
      installedSha256: sha(installed),
      comparison:
        "Equal except permitted CLI comment/use-client removal; embedded original resources unchanged",
    };
  }),
  types = spawnSync(
    process.execPath,
    [packageBin("typescript", "tsc", consumer), "--noEmit"],
    { cwd: consumer, encoding: "utf8" }
  );
assert.equal(types.status, 0, types.stdout + types.stderr);
const manifest = JSON.parse(
    fs.readFileSync(
      resolveRepositoryPath(path.join("tests/reference/message/manifest.json")),
      "utf8"
    )
  ),
  tasks = manifest.cases.map((c) => ({ c, part: name }));
const browser = await chromium.launch({ channel: "msedge" }),
  browserVersion = await browser.version(),
  results = [],
  errors = [];
let next = 0;
fs.mkdirSync(path.join(pixelPerfectTestRoot, "chat"), { recursive: true });
function compare(a, b) {
  if (a.width !== b.width || a.height !== b.height) throw Error("dimensions");
  let count = 0;
  for (let i = 0; i < a.data.length; i += 4)
    count += +!a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4));
  return count;
}
async function worker() {
  let page = await browser.newPage({
      viewport: { width: 1536, height: 900 },
      deviceScaleFactor: 1,
    }),
    i = 0;
  page.on("pageerror", (e) => errors.push({ error: e.message }));
  while (next < tasks.length) {
    const { c, part } = tasks[next++];
    try {
      if (i++ && i % 50 === 0) {
        await page.close();
        page = await browser.newPage({
          viewport: { width: 1536, height: 900 },
          deviceScaleFactor: 1,
        });
        page.on("pageerror", (e) => errors.push({ error: e.message }));
      }
      const q = new URLSearchParams();
      for (const [key, value] of Object.entries(c))
        if (typeof value === "string" || typeof value === "number")
          q.set(key, String(value));
      q.set("part", part);
      await page.goto(origin + "?" + q);
      const subject = page.locator("#subject");
      await expect(subject).toBeVisible();
      if (part === "selectable")
        await expect(
          subject.locator("[data-mc-selectable-ready]")
        ).toHaveAttribute("data-mc-selectable-ready", "true");
      else {
        await expect(subject).toHaveAttribute("data-mc-chat-ready", "true");
        await expect(
          subject.locator("[data-mc-label-layout-ready]")
        ).toHaveAttribute("data-mc-label-layout-ready", "true");
      }
      for (const glyph of await subject.locator("[data-mc-label-ready]").all())
        await expect(glyph).toHaveAttribute("data-mc-label-ready", "true");
      await page.evaluate(
        () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r))
          )
      );
      const actual = await subject.screenshot(),
        count = compare(
          PNG.sync.read(
            fs.readFileSync(
              resolveRepositoryPath(
                path.join("tests/reference/message/captures", c.name)
              )
            )
          ),
          PNG.sync.read(actual)
        );
      results.push({
        name: c.name,
        part,
        mismatchedPixels: count,
        decodedRgbaSha256: sha(PNG.sync.read(actual).data),
      });
      if (count) {
        console.log(c.name, part, count);
        fs.writeFileSync(
          path.join(pixelPerfectTestRoot, "chat", `${part}-${c.name}`),
          actual
        );
      }
    } catch (e) {
      errors.push({ name: c.name, part, error: e.message });
      console.log(c.name, part, e.message);
    }
  }
  await page.close();
}
await Promise.all([worker(), worker()]);
await browser.close();
assert.deepEqual(errors, []);
assert.ok(results.every((r) => r.mismatchedPixels === 0));
const first = PNG.sync.read(
    fs.readFileSync(
      resolveRepositoryPath(
        path.join("tests/reference/message/captures", manifest.cases[0].name)
      )
    )
  ),
  mutated = PNG.sync.read(PNG.sync.write(first));
mutated.data[0] ^= 1;
assert.equal(compare(first, mutated), 1);
fs.writeFileSync(
  resolveRepositoryPath(
    path.join(
      "tests/reference/message",
      name === "message"
        ? "installation-verification.json"
        : "bubble-installation-verification.json"
    )
  ),
  JSON.stringify(
    {
      command:
        "shadcn add <local-registry>/r/" + name + ".json --yes --overwrite",
      consumer:
        "Separate initialized Vite/React consumer with independent npm dependencies",
      consumerRsc: settings.rsc,
      browser: browserVersion,
      viewport: [1536, 900],
      devicePixelRatio: 1,
      sourceJarSha256: manifest.sourceJarSha256,
      typecheck: { command: "tsc --noEmit", exitCode: 0 },
      comparatorNegativeControl:
        "One altered RGBA channel yields exactly one mismatch",
      files,
      cases: results,
      pageErrors: errors,
    },
    null,
    2
  ) + "\n"
);
console.log(
  name +
    ": " +
    results.length +
    " native pixels exact;" +
    files.length +
    " canonical files;types pass"
);
