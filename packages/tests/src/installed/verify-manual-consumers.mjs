import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  stat,
  realpath,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

import { installedDependencyIdentity } from "@grasscn/tests/dependency-identity";
import {
  sourceIdentity,
  assertProductionSource,
  productionBuildIdentity,
} from "@grasscn/tests/next-production";
import { repoRoot, testRoot } from "@grasscn/tests/paths";

import {
  assertExternalProject,
  assertIndependentDependencies,
  assertConsumerPortAvailable,
  consumerEnvironment,
  directoryIdentity,
} from "./consumer-boundary";
import { consumerBuildIdentity } from "./consumer-build-identity";
import {
  parseWebsiteIdentity,
  parsePublicInputs,
  parseManualReceipt,
  parseManualManifest,
} from "./consumer-validation-types.ts";
import { assertExamplePrerequisites } from "./example-prerequisites";
import { prepareManualConsumer } from "./manual-consumer-preparation.mjs";
import {
  verifyInstalledButton,
  verifyInstalledForm,
  verifyInstalledCodeBlock,
  verifyInstalledPlayerPreviews,
  verifyInstalledMap,
  verifyInstalledSign,
  verifyInstalledTrading,
  verifyInstalledResizable,
  verifyInstalledSidebar,
  verifyInstalledDataTable,
  verifyInstalledDatePicker,
  verifyInstalledMessageScroller,
  verifyInstalledAlertDialog,
  verifyInstalledCommandPalette,
} from "./manual-consumer-workflows.mjs";
import { consumerVerificationEnvironment } from "./prepared-consumers.mjs";

// Run through the workspace resource guard with an owned production website already available.
// These consumers start empty: no CLI-installed Grasscn files, developer aliases or fixture imports.
const root = repoRoot;

/** @param {import("node:crypto").BinaryLike} bytes - Source bytes to hash. */
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const phase = process.env.GRASSCN_MANUAL_CONSUMER_PHASE;

assert.ok(
  ["collect", "prepare", "runtime"].includes(phase),
  "Use collect (10%), prepare (4%) then runtime (10%) under the shared guard"
);

const origin = process.env.GRASSCN_PREVIEW_URL;

assert.ok(
  origin !== undefined &&
    origin !== "" &&
    /^http:\/\/127\.0\.0\.1:\d+$/u.test(origin),
  "Set the owned production GRASSCN_PREVIEW_URL"
);

const consumerRoot = path.join(root, "test-results", "manual-consumers");

const output =
  process.env.GRASSCN_MANUAL_CONSUMER_DIRECTORY !== undefined &&
  process.env.GRASSCN_MANUAL_CONSUMER_DIRECTORY !== ""
    ? path.resolve(process.env.GRASSCN_MANUAL_CONSUMER_DIRECTORY)
    : path.join(consumerRoot, String(Date.now()));

assert.ok(
  output.startsWith(consumerRoot + path.sep),
  "Evidence directory must stay in manual-consumers"
);

const gitDirectory = Bun.spawn(
  ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
  { cwd: root, stderr: "inherit", stdout: "pipe" }
);

const gitOutput = await new Response(gitDirectory.stdout).text();
const commonDirectory = gitOutput.trim();

assert.equal(await gitDirectory.exited, 0);

const websiteIdentity = parseWebsiteIdentity(
  process.env.GRASSCN_WEBSITE_IDENTITY ?? "null"
);

assert.ok(
  websiteIdentity.source !== undefined &&
    websiteIdentity.buildId !== "" &&
    websiteIdentity.outputSha256 !== "",
  "Owned production GRASSCN_WEBSITE_IDENTITY required"
);

const source = await sourceIdentity(root);

assertProductionSource(websiteIdentity, source);

const productionIdentity = await productionBuildIdentity({ source });

assert.equal(
  productionIdentity.outputSha256,
  websiteIdentity.outputSha256,
  "Website production output must remain source-bound"
);

/** @param {string} file - Absolute candidate file path. */
const exists = async (file) => {
  try {
    const info = await stat(file);

    return info.isFile();
  } catch {
    return false;
  }
};

await mkdir(output, { recursive: true });

const publicInputsFile = path.join(output, "public-inputs.json");
const preparedFile = path.join(output, "prepared.json");

/** @type {import("./consumer-validation-types.ts").PreparedManualReport | undefined} */
let prepared;

/** @type {import("./consumer-validation-types.ts").PublicInputs | undefined} */
let publicInputs;

if (phase !== "collect") {
  publicInputs = parsePublicInputs(await readFile(publicInputsFile, "utf-8"));
  assert.deepEqual(
    publicInputs.source,
    source,
    "Collected visitor source must match current snapshot"
  );
  assert.deepEqual(
    publicInputs.websiteIdentity,
    websiteIdentity,
    "Collected visitor host must remain identical"
  );
}

if (phase === "runtime") {
  prepared = parseManualReceipt(await readFile(preparedFile, "utf-8"));
  assert.equal(prepared.status, "prepared");
  assert.deepEqual(prepared.source, source);
  assert.deepEqual(prepared.websiteIdentity, websiteIdentity);
  assert.equal(
    prepared.publicInputsSha256,
    hash(await readFile(publicInputsFile))
  );
}

if (phase === "collect") {
  assert.ok(
    !(await exists(publicInputsFile)),
    "Collection requires a fresh artifact directory"
  );
}

if (phase === "prepare") {
  assert.ok(
    !(await exists(preparedFile)),
    "Preparation requires a fresh external consumer; no old build reuse"
  );
}

if (phase === "runtime") {
  assert.ok(
    !(await exists(path.join(output, "report.json"))),
    "Final runtime requires fresh execution; no old report reuse"
  );
}

const projectRoot =
  publicInputs?.projectRoot ??
  (await mkdtemp(path.join(tmpdir(), "grasscn-manual-")));

await assertExternalProject(projectRoot, [root, path.dirname(commonDirectory)]);

/** @type {import("./consumer-validation-types.ts").ManualReport} */
const report = {
  bun: Bun.version,
  consumers: [],
  environment: consumerVerificationEnvironment(),
  phase,
  projectRoot,
  source,
  status: "incomplete",
  website: origin,
  websiteIdentity,
};

if (publicInputs) {
  assert.equal(
    publicInputs.bun,
    Bun.version,
    "Collected Bun runtime unchanged"
  );
  assert.deepEqual(
    publicInputs.environment,
    report.environment,
    "Consumer environment unchanged between phases"
  );
}

const revision = Bun.spawn(["git", "rev-parse", "HEAD"], {
  cwd: root,
  stderr: "inherit",
  stdout: "pipe",
});

const revisionOutput = await new Response(revision.stdout).text();

report.sourceCommit = revisionOutput.trim();

assert.equal(await revision.exited, 0);

assert.equal(Bun.version, "1.4.4");

const sourceRequire = createRequire(path.join(testRoot, "package.json"));

/** @type {typeof import("@playwright/test")} */
// eslint-disable-next-line typescript/no-unsafe-assignment -- Preserve the pinned observer module selected through its own package resolution.
const playwrightModule = sourceRequire("@playwright/test");
const { chromium, expect } = playwrightModule;

const browser =
  phase === "prepare"
    ? undefined
    : await chromium.launch({ channel: "msedge", headless: true });

report.browserVersion = browser?.version() ?? publicInputs.browserVersion;

if (phase === "runtime") {
  assert.equal(
    report.browserVersion,
    publicInputs.browserVersion,
    "Browser identity must match collection"
  );
}

let server;

try {
  let copiedExamples = publicInputs?.copiedExamples;
  let manifests = publicInputs?.manifests;
  let exampleItems = publicInputs?.exampleItems;

  if (phase === "collect") {
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: { height: 900, width: 1280 },
    });

    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"], { origin });
    await page.goto(`${origin}/docs/components/button`);

    const example = page.getByRole("region", {
      exact: true,
      name: "Button example",
    });

    await example.getByRole("tab", { exact: true, name: "Code" }).click();
    await example.getByRole("button", { exact: true, name: "Copy" }).click();
    await example.getByRole("status").filter({ hasText: "Copied" }).waitFor();

    const exampleCode = await page.evaluate(
      async () => await navigator.clipboard.readText()
    );

    assert.ok(
      exampleCode.includes('import { Button } from "@/components/ui/button"')
    );
    report.exampleSha256 = hash(exampleCode);
    copiedExamples = { button: exampleCode };
    exampleItems = {
      button: await example
        .locator("a[data-example-item]")
        .evaluateAll((links) =>
          links.map((link) =>
            link instanceof HTMLAnchorElement
              ? (link.dataset.exampleItem ?? "")
              : ""
          )
        ),
    };

    for (const [slug, title, filename] of [
      ["form", "Form example", "form"],
      ["code-block", "Code Block example", "code-block"],
      ["player-preview", "Player Preview Example", "player-preview"],
      ["player-preview", "Player Preview Alex", "player-preview-alex"],
      ["map", "Map Example", "map"],
      ["sign", "Sign Example", "sign"],
      ["trading", "Trading Example", "trading"],
      ["resizable", "Resizable example", "resizable"],
      ["sidebar", "Sidebar Responsive", "sidebar"],
      ["data-table", "Data Table Features", "data-table"],
      ["date-picker", "Date Picker", "date-picker"],
      ["message-scroller", "Message Scroller", "message-scroller"],
      ["alert-dialog", "Alert Dialog", "alert-dialog"],
      ["command", "World command palette", "command"],
      ["chart", "Frame timing", "fps"],
      ["chart", "Browser share", "profiler"],
      ["chart", "API response time", "metric"],
    ]) {
      await page.goto(`${origin}/docs/components/${slug}`);
      const region = page.getByRole("region", { exact: true, name: title });
      await region.getByRole("tab", { exact: true, name: "Code" }).click();
      await region.getByRole("button", { exact: true, name: "Copy" }).click();
      await region.getByRole("status").filter({ hasText: "Copied" }).waitFor();

      const code = await page.evaluate(
        async () => await navigator.clipboard.readText()
      );

      assert.ok(
        // eslint-disable-next-line anti-slop/no-runtime-typeof -- Validate the clipboard protocol value before accepting visitor source.
        typeof code === "string" && code.includes("export default"),
        `Complete visitor code: ${filename}`
      );
      copiedExamples[filename] = code;
      exampleItems[filename] = await region
        .locator("a[data-example-item]")
        .evaluateAll((links) =>
          links.map((link) =>
            link instanceof HTMLAnchorElement
              ? (link.dataset.exampleItem ?? "")
              : ""
          )
        );
    }

    report.copiedExamples = Object.fromEntries(
      Object.entries(copiedExamples).map(([name, code]) => [name, hash(code)])
    );
    manifests = [];

    for (const name of new Set(Object.values(exampleItems).flat())) {
      /** @type {Response} */
      const response = await fetch(`${origin}/api/installation/${name}`);
      assert.ok(response.ok, `Public ${name} inventory available`);
      manifests.push(parseManualManifest(await response.json()));
    }

    for (const [name, code] of Object.entries(copiedExamples)) {
      assertExamplePrerequisites(code, exampleItems[name], manifests);
    }

    report.publicManifestSha256 = hash(JSON.stringify(manifests));
    await writeFile(
      publicInputsFile,
      JSON.stringify(
        {
          browserVersion: report.browserVersion,
          bun: Bun.version,
          copiedExamples,
          environment: report.environment,
          exampleItems,
          manifests,
          projectRoot,
          source,
          websiteIdentity,
        },
        null,
        2
      )
    );
    assert.deepEqual(
      await sourceIdentity(root),
      source,
      "Source remained frozen while collecting public instructions"
    );
    report.status = "collected";
  } else {
    report.publicInputsSha256 = hash(await readFile(publicInputsFile));
    report.copiedExamples = Object.fromEntries(
      Object.entries(copiedExamples).map(([name, code]) => [name, hash(code)])
    );
    report.publicManifestSha256 = hash(JSON.stringify(manifests));

    for (const [name, code] of Object.entries(copiedExamples)) {
      assertExamplePrerequisites(code, exampleItems[name], manifests);
    }

    /** @type {Record<string, string>} */
    const dependencies = {
      clsx: "2.1.1",
      react: "19.3.1",
      "react-dom": "19.3.1",
      "tailwind-merge": "3.7.0",
      tailwindcss: "4.3.3",
    };

    for (const specifier of new Set(
      manifests.flatMap((manifest) => manifest.dependencies)
    )) {
      const versionAt = specifier.lastIndexOf("@");
      dependencies[versionAt > 0 ? specifier.slice(0, versionAt) : specifier] =
        versionAt > 0 ? specifier.slice(versionAt + 1) : "latest";
    }

    // eslint-disable-next-line no-unreachable-loop -- Preparation continues and runtime closes the host before advancing through both fixed framework entries.
    for (const framework of ["vite", "next"]) {
      const consumer = path.join(projectRoot, framework);

      if (phase === "prepare") {
        const preparedConsumer = await prepareManualConsumer({
          commonDirectory,
          consumer,
          copiedExamples,
          dependencies,
          framework,
          manifests,
          origin,
          root,
        });

        report.consumers.push(preparedConsumer);
        continue;
      }

      // eslint-disable-next-line react-doctor/js-index-maps -- The receipt has exactly two framework entries and is scanned once per owned framework.
      const built = prepared.consumers.find(
        (entry) => entry.framework === framework
      );

      assert.ok(built, `Prepared ${framework} consumer required`);
      await assertExternalProject(consumer, [
        root,
        path.dirname(commonDirectory),
      ]);
      const dependencyIdentity = await assertIndependentDependencies(consumer);
      const installedBytes = installedDependencyIdentity(consumer);
      assert.deepEqual(
        dependencyIdentity,
        built.dependencyIdentity,
        "Prepared dependency resolutions unchanged"
      );
      assert.deepEqual(
        installedBytes,
        built.installedBytes,
        "Prepared installed dependency bytes unchanged"
      );
      assert.deepEqual(
        await directoryIdentity(consumer),
        built.inputs,
        "Prepared consumer inputs unchanged"
      );
      assert.deepEqual(
        await consumerBuildIdentity(
          path.join(consumer, framework === "vite" ? "dist" : ".next"),
          framework
        ),
        built.buildOutput,
        "Prepared consumer production bytes unchanged"
      );
      /** @type {Map<string, string>} */
      const files = new Map(Object.entries(built.downloadedFiles));
      const { prebuildInputs } = built;
      const port = framework === "vite" ? 5188 : 5189;
      await assertConsumerPortAvailable(port);

      const args =
        framework === "vite"
          ? [
              "node_modules/vite/bin/vite.js",
              "preview",
              "--host",
              "127.0.0.1",
              "--port",
              String(port),
              "--strictPort",
            ]
          : [
              "node_modules/next/dist/bin/next",
              "start",
              "--hostname",
              "127.0.0.1",
              "--port",
              String(port),
            ];

      server = Bun.spawn(["bun", "--bun", ...args], {
        cwd: consumer,
        env: consumerEnvironment(),
        stderr: "inherit",
        stdout: "inherit",
      });

      for (let attempt = 0; ; attempt += 1) {
        assert.ok(
          server.exitCode === null,
          "Owned consumer host exited before readiness"
        );

        try {
          const response = await fetch(`http://127.0.0.1:${port}`);

          if (response.ok) {
            break;
          }
        } catch {
          // The owned server may refuse connections while its listener starts.
        }

        assert.ok(attempt < 120, "Consumer started");
        await Bun.sleep(500);
      }

      const errors = [];

      const consumerPage = await browser.newPage({
        deviceScaleFactor: 1,
        viewport: { height: 900, width: 1280 },
      });

      await consumerPage
        .context()
        .grantPermissions(["clipboard-read", "clipboard-write"], {
          origin: `http://127.0.0.1:${port}`,
        });
      consumerPage.on("pageerror", (error) => errors.push(error.message));
      await consumerPage.goto(`http://127.0.0.1:${port}`);
      await consumerPage.mouse.move(1000, 800);

      await verifyInstalledButton({ consumerPage, expect, framework, output });

      await verifyInstalledForm({ consumerPage, expect });

      await verifyInstalledCodeBlock({ consumerPage, expect });

      const webgl = await verifyInstalledPlayerPreviews({
        consumerPage,
        expect,
        framework,
        output,
      });

      await verifyInstalledMap({ consumerPage });

      await verifyInstalledSign({ consumerPage });

      await verifyInstalledTrading({ consumerPage, expect });

      await verifyInstalledResizable({ consumerPage, expect });

      await verifyInstalledSidebar({ consumerPage, expect, framework, output });

      await verifyInstalledDataTable({ consumerPage, expect });

      await verifyInstalledDatePicker({ consumerPage, expect });

      await verifyInstalledMessageScroller({ consumerPage, expect });

      await verifyInstalledAlertDialog({ consumerPage, expect });

      await verifyInstalledCommandPalette({ consumerPage, expect });

      for (const [name, chartName] of [
        ["fps", "Frame timing"],
        ["profiler", "Browser share"],
        ["metric", "API response time"],
      ]) {
        const chart = consumerPage.getByRole("region", {
          exact: true,
          name: `Consumer ${name}`,
        });

        await chart.scrollIntoViewIfNeeded();
        await expect(
          chart.getByRole("application", { exact: true, name: chartName })
        ).toBeVisible();
        await expect
          .poll(async () => await chart.locator("svg").count())
          .toBeGreaterThan(0);
        await chart.screenshot({
          path: path.join(output, `${framework}-${name}.png`),
        });
      }

      await consumerPage.screenshot({
        fullPage: true,
        path: path.join(output, `${framework}-runtime.png`),
      });
      assert.deepEqual(errors, []);
      report.consumers.push({
        build: "passed",
        buildOutput: built.buildOutput,
        dependencyIdentity,
        directory: consumer,
        downloadedFiles: Object.fromEntries(files),
        framework,
        inputs: await directoryIdentity(consumer),
        installedBytes,
        items: manifests.map((manifest) => ({
          dependencies: manifest.dependencies,
          files: manifest.files.length,
          name: manifest.name,
        })),
        lockSha256: hash(await readFile(path.join(consumer, "bun.lock"))),
        packageSha256: hash(
          await readFile(path.join(consumer, "package.json"))
        ),
        physicalDirectory: await realpath(consumer),
        prebuildInputs,
        runtime: {
          alertDialogConfirmAndFocus: "passed",
          buttonVisible: "passed",
          chartFpsProfilerAndMetric: "passed",
          codeBlockExactClipboard: "passed",
          codeBlockRendererResourcesReady: "passed",
          commandPaletteSelectAndFocus: "passed",
          dataTableV9PageFilterSelection: "passed",
          datePickerPortalSelection: "passed",
          formValidationSaveAndReset: "passed",
          mapMarkerCallback: "passed",
          messageScrollerAppendAndHistory: "passed",
          playerPreviewWideAndSlimWebGL2: "passed",
          resizableV4KeyboardReset: "passed",
          sidebarDesktopAndMobilePortal: "passed",
          signCanvas: "passed",
          tradingCallback: "passed",
        },
        typecheck: "passed",
        webgl,
      });
      await writeFile(
        path.join(output, "report.json"),
        JSON.stringify(report, null, 2)
      );
      await consumerPage.close();
      server.kill();
      await server.exited;
      server = undefined;
    }

    assert.deepEqual(
      await sourceIdentity(root),
      source,
      "Source remained frozen during consumer verification"
    );
    report.artifacts = await directoryIdentity(
      output,
      new Set(["report.json", "prepared.json", "collection-report.json"])
    );
    report.status = phase === "prepare" ? "prepared" : "passed";
  }
} catch (error) {
  report.status = "failed";
  report.error =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  throw error;
} finally {
  if (server) {
    server.kill();
    await server.exited;
  }

  await browser?.close();
  await writeFile(
    phase === "prepare"
      ? preparedFile
      : path.join(
          output,
          phase === "collect" ? "collection-report.json" : "report.json"
        ),
    JSON.stringify(report, null, 2)
  );
  console.log(
    JSON.stringify({ error: report.error, output, status: report.status })
  );
}
