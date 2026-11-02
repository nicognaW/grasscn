import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { packageBin } from "@grasscn/tests/tooling";
import { chromium, expect } from "@playwright/test";
import type { OtpCaptureManifest } from "@ppt/installed/constituent-capture-protocol";
import type { InstalledTextRegistry } from "@ppt/installed/text-verification-protocol";
import { webFile, pixelPerfectFile } from "@ppt/paths";
import { PNG } from "pngjs";

const [consumerArgument, url] = process.argv.slice(2);

assert.ok(
  consumerArgument && url,
  "Usage: bun src/installed/verify-input-otp-installed.ts <consumer-dir> <consumer-url>"
);

const consumer = path.resolve(consumerArgument);

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

// SAFETY: registry.json is the authored registry descriptor producer; retain its awaited read.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registry descriptor producer boundary.
const registry = JSON.parse(
  await readFile(webFile(path.join("registry.json")), "utf-8")
) as InstalledTextRegistry;

const item = registry.items.find(
  (registryItem) => registryItem.name === "input-otp"
);

// SAFETY: the initialized shadcn components.json owns the existing rsc setting.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Concrete initialized consumer configuration boundary.
const settings = JSON.parse(
  await readFile(path.join(consumer, "components.json"), "utf-8")
) as { rsc?: boolean };

const files = [];

const canonical = (bytes: Buffer) => {
  let text = bytes
    .toString()
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  if (settings.rsc === false) {
    text = text.replace(/^["']use client["'];?\s*/, "");
  }

  return text.replace(/^(?:\/\/[^\n]*\n\s*)+/, "");
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

const reference = pixelPerfectFile(path.join("tests/reference/input-otp"));

// SAFETY: the existing input-otp manifest selection reads its captured-reference producer at this point.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact input-otp capture producer boundary.
const manifest = JSON.parse(
  await readFile(path.join(reference, "manifest.json"), "utf-8")
) as OtpCaptureManifest;

const browser = await chromium.launch({ channel: "msedge" });
const browserVersion = browser.version();

const cases: {
  decodedRgbaSha256: string;
  mismatchedPixels: number;
  name: string;
}[] = [];

const pageErrors: string[] = [];

let next = 0;

async function worker() {
  while (next < manifest.cases.length) {
    const taskIndex = next;
    next += 1;
    const c = manifest.cases[taskIndex];

    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: { height: 900, width: 1536 },
    });

    page.on("pageerror", (e) => pageErrors.push(e.message));

    try {
      await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") });
      await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));

      const q = new URLSearchParams({
        background: c.background,
        component: "input-otp",
        height: String(c.height),
        native: "1",
        scale: String(c.scale),
        state: c.state,
        text: c.text,
        width: String(c.width),
        x: String(c.x),
        y: String(c.y),
      });

      await page.goto(`${url}?${q}`);

      const subject = page.locator("#subject");
      const mirror = subject.locator("input");
      const input = page.getByRole("textbox", { name: "One-time code" });

      await expect(mirror).toHaveAttribute("data-mc-ready", "true");

      if (/\P{ASCII}/u.test(c.text)) {
        await expect(mirror).toHaveAttribute("data-mc-bitmap", "true");
      }

      if (c.state.startsWith("focus")) {
        await input.focus();
      }

      await page.mouse.move(0, 0);
      await page.clock.runFor(c.caretMs);
      await expect(subject).toHaveAttribute(
        "data-active",
        String(c.state.startsWith("focus"))
      );
      await expect(mirror).toHaveAttribute("data-mc-ready", "true");
      const bytes = await readFile(path.join(reference, "captures", c.name));
      assert.equal(sha(bytes), c.sha256);

      const expected = PNG.sync.read(bytes);
      const actual = PNG.sync.read(await subject.screenshot());

      assert.deepEqual(
        [actual.width, actual.height],
        [expected.width, expected.height]
      );
      assert.ok(
        actual.data.equals(expected.data),
        `Installed InputOTP ${c.name}: pixels differ`
      );
      const changed = PNG.sync.read(PNG.sync.write(expected));
      changed.data[0] ^= 1;
      let mutations = 0;

      for (let i = 0; i < expected.data.length; i += 4) {
        mutations += Number(
          !expected.data
            .subarray(i, i + 4)
            .equals(changed.data.subarray(i, i + 4))
        );
      }

      assert.equal(mutations, 1);
      cases.push({
        decodedRgbaSha256: sha(actual.data),
        mismatchedPixels: 0,
        name: c.name,
      });
    } finally {
      await page.close();
    }
  }
}

try {
  await Promise.all([worker(), worker()]);
  assert.deepEqual(pageErrors, []);
  cases.sort(
    (a, b) =>
      manifest.cases.findIndex((c) => c.name === a.name) -
      manifest.cases.findIndex((c) => c.name === b.name)
  );
  await writeFile(
    path.join(reference, "installation-verification.json"),
    `${JSON.stringify(
      {
        browser: browserVersion,
        cases,
        command:
          "shadcn add http://127.0.0.1:5173/r/input-otp.json --yes --overwrite",
        comparatorMutationDetected: true,
        consumer:
          "Separate initialized shadcn React/Vite consumer with independent physical npm dependencies",
        consumerRsc: settings.rsc,
        devicePixelRatio: 1,
        files,
        pageErrors,
        sourceJarSha256: manifest.sourceJarSha256,
        typecheck: { command: "tsc --noEmit", passed: true },
        viewport: [1536, 900],
      },
      null,
      2
    )}\n`
  );
  console.log(
    `Installed InputOTP: ${cases.length} native cases exact; ${files.length} canonical sources; types passed`
  );
} finally {
  await browser.close();
}
