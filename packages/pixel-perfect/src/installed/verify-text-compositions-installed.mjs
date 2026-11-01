import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, expect } from "@playwright/test";
import { repoRoot, resolveRepositoryPath, packageBin } from "@ppt/paths";
import { PNG } from "pngjs";
const [consumerArgument, name, origin, descriptorArgument] =
    process.argv.slice(2),
  supported = ["code-block", "trace", "message-scroller", "spinner"];
assert.ok(
  consumerArgument && supported.includes(name) && origin,
  "Usage: bun src/installed/verify-text-compositions-installed.mjs <consumer> <component> <fixture-url> [registry-item-file]"
);
const repo = repoRoot,
  consumer = path.resolve(consumerArgument),
  sha = (bytes) => createHash("sha256").update(bytes).digest("hex"),
  item = descriptorArgument
    ? JSON.parse(fs.readFileSync(path.resolve(descriptorArgument), "utf8"))
    : JSON.parse(
        fs.readFileSync(
          resolveRepositoryPath(path.join("registry.json")),
          "utf8"
        )
      ).items.find((i) => i.name === name),
  settings = JSON.parse(
    fs.readFileSync(path.join(consumer, "components.json"), "utf8")
  ),
  canonical = (bytes) => {
    let text = bytes
      .toString()
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim();
    if (settings.rsc === false)
      text = text.replace(/^["']use client["'];?\s*/, "");
    return text.replace(/^(?:\/\/[^\n]*\n\s*)+/, "");
  };
const files = item.files.map((file) => {
  const filename = path.basename(file.path),
    directory =
      file.type === "registry:hook"
        ? "hooks"
        : file.type === "registry:lib"
          ? "lib"
          : "components/ui",
    source = fs.readFileSync(resolveRepositoryPath(path.join(file.path))),
    installed = fs.readFileSync(
      path.join(consumer, "src", directory, filename)
    );
  assert.equal(
    canonical(installed),
    canonical(source),
    "Installed source differs: " + file.path
  );
  return {
    path: filename,
    sourcePath: file.path,
    sourceSha256: sha(source),
    installedSha256: sha(installed),
    comparison:
      "Equal except permitted CLI comment/use-client removal; embedded original font and texture bytes unchanged",
  };
});
const types = spawnSync(
  process.execPath,
  [packageBin("typescript", "tsc", consumer), "--noEmit"],
  { cwd: consumer, encoding: "utf8" }
);
assert.equal(types.status, 0, (types.stdout ?? "") + (types.stderr ?? ""));
const directory = name === "spinner" ? name : "message",
  manifest = JSON.parse(
    fs.readFileSync(
      resolveRepositoryPath(
        path.join("tests/reference", directory, "manifest.json")
      ),
      "utf8"
    )
  ),
  browser = await chromium.launch({ channel: "msedge" }),
  browserVersion = await browser.version(),
  results = [],
  errors = [];
let next = 0;
function compare(expected, actual) {
  assert.deepEqual(
    [actual.width, actual.height],
    [expected.width, expected.height]
  );
  let count = 0;
  for (let i = 0; i < expected.data.length; i += 4)
    count += +!expected.data
      .subarray(i, i + 4)
      .equals(actual.data.subarray(i, i + 4));
  return count;
}
async function worker() {
  let page = await browser.newPage({
      viewport: { width: 1536, height: 900 },
      deviceScaleFactor: 1,
    }),
    count = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  while (next < manifest.cases.length) {
    const c = manifest.cases[next++];
    try {
      if (count++ && count % 50 === 0) {
        await page.close();
        page = await browser.newPage({
          viewport: { width: 1536, height: 900 },
          deviceScaleFactor: 1,
        });
        page.on("pageerror", (error) => errors.push(error.message));
      }
      const url = new URL(origin);
      url.search = "";
      for (const [key, value] of Object.entries(c))
        if (typeof value === "string" || typeof value === "number")
          url.searchParams.set(key, String(value));
      url.searchParams.set("component", name);
      url.searchParams.set("native", "1");
      await page.goto(url.href);
      const subject = page.locator("#subject");
      await expect(subject).toHaveAttribute(
        "data-slot",
        name === "code-block"
          ? "code-block-content"
          : name === "trace"
            ? "trace-line"
            : name === "message-scroller"
              ? "message-scroller-item"
              : name
      );
      await expect(subject).toBeVisible();
      if (name === "code-block") {
        await expect(
          subject.locator("[data-mc-selectable-ready]")
        ).toHaveAttribute("data-mc-selectable-ready", "true");
      }
      if (name === "message-scroller")
        await expect(subject.locator("[data-mc-chat-ready]")).toHaveAttribute(
          "data-mc-chat-ready",
          "true"
        );
      for (const node of await subject
        .locator("[data-mc-label-layout-ready]")
        .all())
        await expect(node).toHaveAttribute(
          "data-mc-label-layout-ready",
          "true"
        );
      for (const node of await subject.locator("[data-mc-label-ready]").all())
        await expect(node).toHaveAttribute("data-mc-label-ready", "true");
      await page.evaluate(async () => {
        await document.fonts.ready;
        const images = [...document.querySelectorAll(".mc-surface>span")]
          .map(
            (node) =>
              getComputedStyle(node).backgroundImage.match(
                /url\(["']?(.*?)["']?\)/
              )?.[1]
          )
          .filter(Boolean);
        await Promise.all(
          images.map(
            (src) =>
              new Promise((resolve) => {
                const image = new Image();
                image.onload = image.onerror = resolve;
                image.src = src;
              })
          )
        );
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        );
      });
      const expectedBytes = fs.readFileSync(
        resolveRepositoryPath(
          path.join("tests/reference", directory, "captures", c.name)
        )
      );
      assert.equal(sha(expectedBytes), c.sha256, "Native PNG integrity");
      const actualBytes = await subject.screenshot(),
        actual = PNG.sync.read(actualBytes),
        mismatchedPixels = compare(PNG.sync.read(expectedBytes), actual);
      results.push({
        name: c.name,
        mismatchedPixels,
        decodedRgbaSha256: sha(actual.data),
      });
      if (mismatchedPixels) {
        console.log(name, c.name, mismatchedPixels);
        const failures = resolveRepositoryPath(
          path.join(
            ".pixel-perfect-test/text-components-integration/next-pixel-failures"
          )
        );
        fs.mkdirSync(failures, { recursive: true });
        fs.writeFileSync(path.join(failures, name + "-" + c.name), actualBytes);
      }
    } catch (error) {
      errors.push(c.name + ": " + error.message);
      console.log(name, c.name, error.message);
    }
  }
  await page.close();
}
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
      resolveRepositoryPath(
        path.join(
          "tests/reference",
          directory,
          "captures",
          manifest.cases[0].name
        )
      )
    )
  ),
  mutated = PNG.sync.read(PNG.sync.write(expected));
mutated.data[0] ^= 1;
assert.equal(compare(expected, mutated), 1);
const file =
  name === "spinner"
    ? "installation-verification.json"
    : name + "-installation-verification.json";
fs.writeFileSync(
  resolveRepositoryPath(path.join("tests/reference", directory, file)),
  JSON.stringify(
    {
      command:
        "shadcn add <local-registry>/r/" + name + ".json --yes --overwrite",
      consumer:
        "Separate initialized React/Vite shadcn consumer with independent physical npm dependencies",
      consumerRsc: settings.rsc,
      sourceJarSha256: manifest.sourceJarSha256,
      browser: browserVersion,
      viewport: [1536, 900],
      devicePixelRatio: 1,
      caseIsolation:
        "Two workers; pages closed every50 cases; all browsers closed finally",
      typecheck: { command: "tsc --noEmit", exitCode: 0 },
      comparatorNegativeControl:
        "One changed RGBA channel yields exactly one mismatched pixel",
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
    " installed native appearances exact; " +
    files.length +
    " canonical sources; types pass"
);
