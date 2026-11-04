// The CLI may convert LF/CRLF on Windows; raw source and installed hashes remain recorded.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { installedRegistryFile } from "@grasscn/tests/installed-registry-file";
import type { InstalledComponentSettings } from "@grasscn/tests/installed-registry-file";
import { chromium } from "@playwright/test";
import type {
  ToggleReferenceCase,
  MenuReferenceCase,
  MenubarTriggerReferenceCase,
  PopoverReferenceCase,
  DialogReferenceCase,
  FixtureReferenceCase,
  InstalledReferenceManifest,
  InstalledCaseResult,
} from "@ppt/installed/reference-case";
import type { CollapsibleReferenceCase } from "@ppt/installed/verify-collapsible-installed";
import { verifyCollapsibleCase } from "@ppt/installed/verify-collapsible-installed";
import { verifyDialogCase } from "@ppt/installed/verify-dialog-installed";
import { verifyFixtureControlCase } from "@ppt/installed/verify-fixture-control-installed";
import {
  verifyMenuCase,
  verifyMenubarTriggerCase,
} from "@ppt/installed/verify-menu-installed";
import { verifyPopoverCase } from "@ppt/installed/verify-popover-installed";
import { verifyToggleCase } from "@ppt/installed/verify-toggle-installed";
import { webFile } from "@ppt/paths";
import { evidenceFile } from "@ppt/runtime/evidence-paths";

import type registry from "../../../../apps/web/registry.json";
import type minecraftMap from "../../../../apps/web/registry/minecraft-map.json";

const [
  consumerDir,
  name,
  url,
  uiDirectory = "src/components/ui",
  referenceManifest,
] = process.argv.slice(2);

if (!consumerDir || !name || !url) {
  throw new Error(
    "Usage: bun src/installed/verify-installed.ts <initialized-consumer-dir> <item-name> <consumer-fixture-url> [installed-ui-directory]"
  );
}

// Keep the original asynchronous read/parse boundary for each concrete producer.
const readRegistryMap = async () =>
  // SAFETY: this fresh document is the authored registry map.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The exact registry map owns this JSON document.
  JSON.parse(
    await readFile(evidenceFile("registry/minecraft-map.json"), "utf-8")
  ) as typeof minecraftMap;

const readRegistryItems = async () =>
  // SAFETY: registry.json is the registry producer for the installed source list.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Specific authored registry document boundary.
  JSON.parse(
    await readFile(evidenceFile("registry.json"), "utf-8")
  ) as typeof registry;

const readReferenceManifest = async (file: string) =>
  // SAFETY: the caller checks the component's registered manifest paths before reading this native capture launcher document.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Registered capture producer owns the identity/case protocol.
  JSON.parse(
    await readFile(evidenceFile(file), "utf-8")
  ) as InstalledReferenceManifest;

const map = await readRegistryMap();
const component = map.components.find((c) => c.name === name);

const registeredItems = await readRegistryItems();
const item = registeredItems.items.find((candidate) => candidate.name === name);

assert.ok(
  component?.pixelVerification.manifest !== undefined &&
    component.pixelVerification.manifest !== null &&
    component.pixelVerification.manifest !== "" &&
    item,
  "Need a registered item with an independent native manifest"
);

const manifestFile = referenceManifest ?? component.pixelVerification.manifest;

assert.ok(
  [
    component.pixelVerification.manifest,
    ...(component.pixelVerification.additionalManifests ?? []),
  ].includes(manifestFile),
  "Reference manifest must be registered on the component"
);

const manifest = await readReferenceManifest(manifestFile);

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

// SAFETY: this is the initialized shadcn consumer configuration read by installedRegistryFile.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Actual installed consumer configuration boundary.
const consumerSettings = JSON.parse(
  await readFile(path.resolve(consumerDir, "components.json"), "utf-8")
) as InstalledComponentSettings & { rsc?: boolean };

const canonical = (bytes: Buffer) => {
  let text = bytes
    .toString()
    .replaceAll("\r\n", "\n")
    .replaceAll(/\/\*[\s\S]*?\*\//gu, "")
    .trim();

  if (consumerSettings.rsc === false) {
    text = text.replace(/^["']use client["'];?\s*/u, "");
  }

  return text.replace(/^(?:\/\/[^\n]*\n\s*)+/u, "");
};

const files = [];

const sourceFileReads = await Promise.allSettled(
  item.files.map(async (entry) => {
    const filename = path.basename(entry.path);

    const [firstRead, secondRead] = await Promise.allSettled(
      [
        async () =>
          await readFile(
            installedRegistryFile(
              entry,
              consumerDir,
              consumerSettings,
              uiDirectory
            )
          ),
        async () => await readFile(webFile(path.join(entry.path))),
      ].map(async (read) => await read())
    );

    if (firstRead.status === "rejected") {
      throw firstRead.reason;
    }

    if (secondRead.status === "rejected") {
      throw secondRead.reason;
    }

    return {
      entry,
      filename,
      installed: firstRead.value,
      source: secondRead.value,
    };
  })
);

for (const fileRead of sourceFileReads) {
  if (fileRead.status === "rejected") {
    throw fileRead.reason;
  }

  const { entry, filename, installed, source } = fileRead.value;

  assert.ok(
    canonical(installed) === canonical(source),
    `${filename} changed beyond permitted CLI transforms`
  );
  files.push({
    comparison:
      "Equal except CLI line-ending conversion, comment removal and use-client removal for rsc:false; data URIs unchanged",
    installedSha256: sha(installed),
    path: filename,
    sourcePath: entry.path,
    sourceSha256: sha(source),
  });
}

let browser = await chromium.launch({ channel: "msedge" });
const browserVersion = browser.version();

const pageErrors: string[] = [];
const cases: (InstalledCaseResult | undefined)[] = [];

const preparePage = async function preparePage() {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { height: 900, width: 1280 },
  });

  page.on("pageerror", (error) => pageErrors.push(error.message));

  if (["tabs", "select"].includes(name)) {
    await page.addInitScript(() => {
      Date.now = () =>
        Number(new URLSearchParams(location.search).get("timeMs") ?? 0);
    });
  }

  if (name === "input" || name === "textarea") {
    await page.clock.install({ time: new Date("2026-10-28T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-28T00:00:01Z"));
  }

  if (
    name === "collapsible" ||
    name === "menubar" ||
    name === "context-menu" ||
    name === "dropdown-menu" ||
    name === "popover" ||
    name === "alert-dialog" ||
    name === "dialog" ||
    name === "tooltip" ||
    name === "tabs" ||
    name === "select" ||
    name === "radio-group" ||
    name === "switch" ||
    manifest.effectiveAssets
  ) {
    await page.setViewportSize({ height: 900, width: 1536 });
  }

  return page;
};

try {
  let page = await preparePage();

  for (const referenceCase of manifest.cases) {
    if (name === "toggle" || name === "toggle-group") {
      // SAFETY: registered item dispatch selects this capture producer's case protocol; no data or checks are changed.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registered native-case boundary.
      const c = referenceCase as ToggleReferenceCase;
      // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
      cases.push(await verifyToggleCase({ c, manifestFile, name, page, url }));
      continue;
    }

    if (cases.length > 0 && cases.length % 64 === 0) {
      console.log(
        `Installed ${name}: ${cases.length}/${manifest.cases.length} exact reference cases verified`
      );
      // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
      await page.close();

      if (cases.length % 256 === 0) {
        // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
        await browser.close();
        // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
        browser = await chromium.launch({ channel: "msedge" });
        assert.equal(
          browser.version(),
          browserVersion,
          "Browser version changed during verification"
        );
      }

      // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
      page = await preparePage();
    }

    if (name === "collapsible") {
      // SAFETY: registered item dispatch selects this capture producer's case protocol; no data or checks are changed.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registered native-case boundary.
      const c = referenceCase as CollapsibleReferenceCase;
      // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
      cases.push(await verifyCollapsibleCase({ c, manifestFile, page, url }));
      continue;
    }

    if (
      name === "dropdown-menu" ||
      name === "context-menu" ||
      (name === "menubar" &&
        ![
          "tests/reference/manifest.json",
          "tests/reference/button-cjk/manifest.json",
        ].includes(manifestFile))
    ) {
      // SAFETY: registered item dispatch selects this capture producer's case protocol; no data or checks are changed.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registered native-case boundary.
      const c = referenceCase as MenuReferenceCase;
      // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
      cases.push(await verifyMenuCase({ c, manifestFile, name, page, url }));
      continue;
    }

    if (name === "menubar") {
      // SAFETY: registered item dispatch selects this capture producer's case protocol; no data or checks are changed.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registered native-case boundary.
      const c = referenceCase as MenubarTriggerReferenceCase;
      cases.push(
        // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
        await verifyMenubarTriggerCase({ c, manifestFile, name, page, url })
      );
      continue;
    }

    if (name === "popover") {
      // SAFETY: registered item dispatch selects this capture producer's case protocol; no data or checks are changed.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registered native-case boundary.
      const c = referenceCase as PopoverReferenceCase;
      // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
      cases.push(await verifyPopoverCase({ c, manifestFile, page, url }));
      continue;
    }

    if (name === "dialog" || name === "alert-dialog") {
      // SAFETY: registered item dispatch selects this capture producer's case protocol; no data or checks are changed.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact registered native-case boundary.
      const c = referenceCase as DialogReferenceCase;
      // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
      cases.push(await verifyDialogCase({ c, manifestFile, name, page, url }));
      continue;
    }

    // SAFETY: remaining fixture controls dispatch by their captured element discriminator.
    const c = referenceCase as FixtureReferenceCase;
    cases.push(
      // oxlint-disable-next-line eslint/no-await-in-loop -- Finish this owned Page/browser transition before reuse, rotation, or the next bounded-worker task.
      await verifyFixtureControlCase({
        c,
        manifest,
        manifestFile,
        name,
        page,
        url,
      })
    );
  }

  assert.deepEqual(pageErrors, []);

  const report = {
    browser: browserVersion,
    caseIsolation:
      "Fresh page/context every64 cases; browser restarted every256 cases",
    cases,
    command: `shadcn add http://localhost:5173/r/${name}.json --yes --overwrite`,
    consumer: "separate initialized shadcn Vite/React consumer",
    consumerRsc: consumerSettings.rsc,
    devicePixelRatio: 1,
    files,
    pageErrors,
    sourceJarSha256: manifest.sourceJarSha256,
  };

  interface InstallationReports {
    [manifest: string]: string | undefined;
  }

  const additionalReports: InstallationReports | undefined =
    component.pixelVerification.additionalInstallationReports;

  const reportFile =
    manifestFile === component.pixelVerification.manifest &&
    component.pixelVerification.installationReport
      ? component.pixelVerification.installationReport
      : (additionalReports?.[manifestFile] ??
        path.join(
          path.dirname(manifestFile),
          "installation-verification.json"
        ));

  await writeFile(
    evidenceFile(reportFile),
    `${JSON.stringify(report, null, 2)}\n`
  );
  console.log(
    `Installed ${name}: ${cases.length} native cases match exactly; ${files.length} sources match permitted CLI transforms; no browser errors`
  );
} finally {
  await browser.close();
}
