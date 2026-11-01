import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { installedRegistryFile } from "@grasscn/tests/installed-registry-file";
import { packageBin } from "@grasscn/tests/tooling";
import { chromium, expect } from "@playwright/test";
import { repoRoot, webFile, pixelPerfectFile } from "@ppt/paths";
import { evidenceFile } from "@ppt/runtime/evidence-paths";
import { PNG } from "pngjs";

const [consumerArgument, name, url, manifestArgument, partArgument] =
  process.argv.slice(2);

const supported = new Set([
  "badge",
  "typography",
  "breadcrumb",
  "kbd",
  "empty",
  "form",
  "field",
]);

assert.ok(
  consumerArgument && supported.has(name) && url,
  "Usage: bun src/installed/verify-text-installed.mjs <consumer> <badge|typography|breadcrumb|kbd|empty> <fixture-url> [registered-manifest] [part]"
);

const consumer = path.resolve(consumerArgument);

const json = async (file) =>
  JSON.parse(await readFile(evidenceFile(file), "utf-8"));

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

const map = await json("registry/minecraft-map.json");
const component = map.components.find((c) => c.name === name);
const item = (await json("registry.json")).items.find((i) => i.name === name);

assert.ok(
  component?.pixelVerification.manifest && item,
  "Item needs registered native references"
);

const manifests = [
  component.pixelVerification.manifest,
  ...(component.pixelVerification.additionalManifests ?? []),
];

if (manifestArgument) {
  assert.ok(
    manifests.includes(manifestArgument),
    "Manifest must be registered on this item"
  );
}

const settings = JSON.parse(
  await readFile(path.join(consumer, "components.json"), "utf-8")
);

const canonical = (bytes) => {
  let text = bytes
    .toString()
    .replaceAll("\r\n", "\n")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  if (settings.rsc === false) {
    text = text.replace(/^["']use client["'];?\s*/, "");
  }

  return text.replace(/^(?:\/\/[^\n]*\n\s*)+/, "");
};

const files = [];

for (const entry of item.files) {
  const filename = path.basename(entry.path);
  const source = await readFile(webFile(path.join(entry.path)));

  const installed = await readFile(
    installedRegistryFile(entry, consumer, settings)
  );

  assert.equal(
    canonical(installed),
    canonical(source),
    `Unexpected CLI transform: ${filename}`
  );
  files.push({
    comparison:
      "Equal except permitted CLI comments/use-client removal; embedded original resources unchanged",
    installedSha256: sha(installed),
    path: filename,
    sourcePath: entry.path,
    sourceSha256: sha(source),
  });
}

const compiler = packageBin("typescript", "tsc", consumer);

const types = spawnSync(process.execPath, [compiler, "--noEmit"], {
  cwd: consumer,
  encoding: "utf-8",
});

assert.equal(
  types.status,
  0,
  `Consumer typecheck failed:\n${types.stdout ?? ""}${types.stderr ?? ""}`
);

const groups = [];

for (const manifestFile of manifests.filter(
  (file) => !manifestArgument || file === manifestArgument
)) {
  const manifest = await json(manifestFile);

  const nativeEmpty =
    name === "empty" && manifestFile === component.pixelVerification.manifest;

  const allParts =
    name === "form"
      ? ["label", "description", "message"]
      : name === "field"
        ? ["label", "legend", "title", "description"]
        : name === "typography"
          ? [
              "default",
              "h1",
              "h2",
              "h3",
              "h4",
              "p",
              "small",
              "blockquote",
              "code",
              "lead",
              "large",
              "muted",
            ]
          : name === "breadcrumb"
            ? ["link", "page"]
            : name === "empty" && !nativeEmpty
              ? ["title", "description"]
              : ["default"];

  if (partArgument) {
    assert.ok(
      allParts.includes(partArgument),
      `Unsupported part for ${manifestFile}`
    );
  }

  groups.push({
    manifest,
    manifestFile,
    parts: partArgument ? [partArgument] : allParts,
  });
}

function compare(expected, actual) {
  assert.deepEqual(
    [actual.width, actual.height],
    [expected.width, expected.height]
  );
  let mismatchedPixels = 0;
  const diff = new PNG({ height: expected.height, width: expected.width });

  for (let i = 0; i < expected.data.length; i += 4) {
    const mismatch = !actual.data
      .subarray(i, i + 4)
      .equals(expected.data.subarray(i, i + 4));

    mismatchedPixels += +mismatch;
    diff.data.set(
      mismatch
        ? [255, 0, 255, 255]
        : [
            expected.data[i] >> 2,
            expected.data[i + 1] >> 2,
            expected.data[i + 2] >> 2,
            255,
          ],
      i
    );
  }

  return { diff, mismatchedPixels };
}

const tasks = groups.flatMap((group) =>
  group.parts.flatMap((part) =>
    group.manifest.cases.map((c) => ({ c, group, part }))
  )
);

const results = [];
const pageErrors = [];
const browserVersions = new Set();

let completed = 0;
let next = 0;

async function worker() {
  let browser;
  let count = 0;
  let page;

  const open = async () => {
    browser = await chromium.launch({ channel: "msedge" });
    browserVersions.add(browser.version());
    assert.equal(
      browserVersions.size,
      1,
      "Browser changed during verification"
    );
    page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: { height: 900, width: 1536 },
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
  };

  try {
    await open();

    while (next < tasks.length) {
      const taskIndex = next;
      next += 1;
      const { group, part, c } = tasks[taskIndex];

      if (count && count % 128 === 0) {
        await browser.close();
        await open();
      } else if (count && count % 50 === 0) {
        await page.close();
        page = await browser.newPage({
          deviceScaleFactor: 1,
          viewport: { height: 900, width: 1536 },
        });
        page.on("pageerror", (error) => pageErrors.push(error.message));
      }

      count += 1;

      const params = new URLSearchParams({
        align: c.alignment ?? "left",
        background: c.background ?? "#202020",
        component: name,
        height: String(c.height ?? 20),
        label: c.label ?? c.text ?? "Button",
        native: "1",
        part,
        scale: String(c.scale),
        state: c.state,
        text: c.label ?? c.text ?? "Button",
        width: String(c.width),
        x: String(c.x ?? 16),
        y: String(c.y ?? 16),
      });

      const optionalWrapWidth = c.wrapWidth;

      if (optionalWrapWidth !== null && optionalWrapWidth !== undefined) {
        params.set("wrapWidth", String(c.wrapWidth));
      }

      await page.goto(`${url}?${params}`);
      const subject = page.locator("#subject");
      await expect(subject).toBeVisible();
      await page.mouse.move(0, 0);

      if (name === "kbd") {
        if (c.state === "hover") {
          await subject.hover();
        }

        if (c.state === "focus") {
          await subject.focus();
          await page.keyboard.press("Tab");
          await page.keyboard.press("Shift+Tab");
          await expect(subject).toBeFocused();
        }
      }

      if (name === "badge") {
        await expect(
          subject.locator("[data-mc-tooltip-painted]")
        ).toHaveAttribute("data-mc-tooltip-painted", "true");
      } else if (name !== "kbd" && !(name === "empty" && part === "default")) {
        await expect(subject).toHaveAttribute(
          "data-mc-label-layout-ready",
          "true"
        );
      }

      for (const line of await subject.locator("[data-mc-label-ready]").all()) {
        await expect(line).toHaveAttribute("data-mc-label-ready", "true");
      }

      await page.evaluate(
        async () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          )
      );

      const bytes = await readFile(
        pixelPerfectFile(
          path.join(path.dirname(group.manifestFile), "captures", c.name)
        )
      );

      assert.equal(sha(bytes), c.sha256);

      const expected = PNG.sync.read(bytes);

      const actualBytes = await (
        name === "badge"
          ? subject.locator('[data-slot="badge-surface"]')
          : subject
      ).screenshot();

      const actual = PNG.sync.read(actualBytes);
      const { mismatchedPixels, diff } = compare(expected, actual);

      const mutation = PNG.sync.read(PNG.sync.write(expected));
      mutation.data[0] ^= 1;
      assert.equal(
        compare(expected, mutation).mismatchedPixels,
        1,
        "Comparator failed one-pixel negative control"
      );

      if (mismatchedPixels) {
        const directory = path.join(consumer, ".grasscn-verification", name);
        await mkdir(directory, { recursive: true });
        const id = `${part}-${c.name}`;
        await writeFile(path.join(directory, `actual-${id}`), actualBytes);
        await writeFile(
          path.join(directory, `diff-${id}`),
          PNG.sync.write(diff)
        );
        await writeFile(
          path.join(directory, `${id}.json`),
          JSON.stringify({
            case: c.name,
            manifest: group.manifestFile,
            mismatchedPixels,
            part,
            tolerance: 0,
          })
        );
        throw new Error(
          `Installed ${name}/${part}/${c.name}: ${mismatchedPixels} pixels differ`
        );
      }

      results.push({
        decodedRgbaSha256: sha(actual.data),
        manifest: group.manifestFile,
        mismatchedPixels,
        name: c.name,
        part,
      });

      if ((completed += 1 % 128 === 0)) {
        console.log(`${name}: ${completed}/${tasks.length} appearances exact`);
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

const settled = await Promise.allSettled([worker(), worker()]);

for (const result of settled) {
  if (result.status === "rejected") {
    throw result.reason;
  }
}

assert.deepEqual(pageErrors, []);

for (const group of groups) {
  const cases = group.manifest.cases.map((c) => {
    const rows = group.parts.map((part) => {
      const row = results.find(
        (r) =>
          r.manifest === group.manifestFile &&
          r.part === part &&
          r.name === c.name
      );

      assert.ok(row);

      return row;
    });

    assert.ok(
      rows.every((r) => r.decodedRgbaSha256 === rows[0].decodedRgbaSha256),
      `Semantic aliases changed pixels: ${c.name}`
    );

    return {
      decodedRgbaSha256: rows[0].decodedRgbaSha256,
      mismatchedPixels: 0,
      name: c.name,
      ...Object.fromEntries(
        group.parts
          .slice(1)
          .map((part, index) => [
            `${part}DecodedRgbaSha256`,
            rows[index + 1].decodedRgbaSha256,
          ])
      ),
    };
  });

  const primary = group.manifestFile === component.pixelVerification.manifest;

  const registered = primary
    ? component.pixelVerification.installationReport
    : component.pixelVerification.additionalInstallationReports?.[
        group.manifestFile
      ];

  const output = partArgument
    ? `tests/reference/${name}/diagnostic-${partArgument}.json`
    : (registered ?? `tests/reference/${name}/installation-verification.json`);

  await mkdir(path.dirname(pixelPerfectFile(output)), { recursive: true });
  await writeFile(
    pixelPerfectFile(output),
    `${JSON.stringify(
      {
        browser: [...browserVersions][0],
        caseIsolation:
          "Two workers; fresh page every50 cases; browser restarted every128 cases and closed finally",
        cases,
        command: `shadcn add http://127.0.0.1:5173/r/${name}.json --yes --overwrite`,
        comparatorNegativeControl:
          "One changed RGBA pixel detected in each native case",
        consumer:
          "Separate initialized shadcn Vite/React consumer with independent npm dependencies",
        consumerRsc: settings.rsc,
        devicePixelRatio: 1,
        files,
        pageErrors,
        sourceJarSha256: group.manifest.sourceJarSha256,
        typecheck: { command: "bun --bun tsc --noEmit", exitCode: 0 },
        viewport: [1536, 900],
        ...(partArgument ? { partialPart: partArgument } : {}),
      },
      null,
      2
    )}\n`
  );
}

console.log(
  `Installed ${name}: ${results.length} native appearances exact; ${files.length} sources equal; types pass; no browser errors`
);
