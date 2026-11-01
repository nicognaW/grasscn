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
} from "./consumer-boundary.mjs";
import {
  parseWebsiteIdentity,
  parsePublicInputs,
  parseManualReceipt,
  parseManualManifest,
  encodeConsumerFile,
} from "./consumer-validation-types.ts";
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

/** @param {string[]} args @param {string} cwd */
const run = async (args, cwd) => {
  const child = Bun.spawn(["bun", ...args], {
    cwd,
    env: consumerEnvironment(),
    stderr: "inherit",
    stdout: "inherit",
  });

  assert.equal(await child.exited, 0, `Bun ${args.join(" ")}`);
};

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

    /* eslint-disable no-await-in-loop, react-doctor/async-await-in-loop -- Consumer stages share one browser, clipboard and resource budget; each stage completes before the next. */
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
    }
    /* eslint-enable no-await-in-loop, react-doctor/async-await-in-loop */

    report.copiedExamples = Object.fromEntries(
      Object.entries(copiedExamples).map(([name, code]) => [name, hash(code)])
    );
    manifests = [];

    /* eslint-disable no-await-in-loop, react-doctor/async-await-in-loop -- Consumer stages share one browser, clipboard and resource budget; each stage completes before the next. */
    for (const name of [
      "button",
      "code-block",
      "form",
      "player-preview",
      "map",
      "sign",
      "trading",
      "resizable",
      "typography",
      "sidebar",
      "data-table",
      "input",
      "date-picker",
      "message",
      "alert-dialog",
      "command",
      "chart",
    ]) {
      const response = await fetch(`${origin}/api/installation/${name}`);
      assert.ok(response.ok, `Public ${name} inventory available`);
      manifests.push(parseManualManifest(await response.json()));
    }
    /* eslint-enable no-await-in-loop, react-doctor/async-await-in-loop */

    report.publicManifestSha256 = hash(JSON.stringify(manifests));
    await writeFile(
      publicInputsFile,
      JSON.stringify(
        {
          browserVersion: report.browserVersion,
          bun: Bun.version,
          copiedExamples,
          environment: report.environment,
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

    /* eslint-disable no-await-in-loop, react-doctor/async-await-in-loop -- Consumer stages share one browser, clipboard and resource budget; each stage completes before the next. */
    for (const framework of ["vite", "next"]) {
      const consumer = path.join(projectRoot, framework);
      let dependencyIdentity;
      /** @type {Map<string, string>} */
      let files;
      let installedBytes;
      let prebuildInputs;

      if (phase === "prepare") {
        await mkdir(path.join(consumer, "src/lib"), { recursive: true });
        await assertExternalProject(consumer, [
          root,
          path.dirname(commonDirectory),
        ]);

        /** @param {string} name @param {unknown} contents */
        const write = async (name, contents) => {
          const file = path.join(consumer, name);
          await mkdir(path.dirname(file), { recursive: true });
          await writeFile(file, encodeConsumerFile(contents));
        };

        await write("components.json", {
          $schema: "https://ui.shadcn.com/schema.json",
          aliases: {
            components: "@/components",
            hooks: "@/hooks",
            lib: "@/lib",
            ui: "@/components/ui",
            utils: "@/lib/utils",
          },
          rsc: framework === "next",
          style: "base-nova",
          tailwind: {
            baseColor: "neutral",
            config: "",
            css: "src/globals.css",
            cssVariables: true,
          },
          tsx: true,
        });
        await write(
          "src/lib/utils.ts",
          'import {clsx,type ClassValue} from "clsx"; import {twMerge} from "tailwind-merge"; export function cn(...inputs:ClassValue[]){return twMerge(clsx(inputs))}\n'
        );

        const packageData = {
          dependencies: {
            ...dependencies,
            ...(framework === "vite"
              ? { "@tailwindcss/vite": "4.3.3", vite: "8.3.5" }
              : { "@tailwindcss/postcss": "4.3.3", next: "16.4.2" }),
          },
          devDependencies: {
            "@types/node": "26.6.5",
            "@types/react": "19.3.0",
            "@types/react-dom": "19.3.0",
            typescript: "7.0.2",
          },
          name: `grasscn-manual-${framework}`,
          packageManager: "bun@1.4.4",
          private: true,
          type: "module",
        };

        await write("package.json", packageData);
        files = new Map();

        for (const manifest of manifests) {
          for (const file of manifest.files) {
            assert.ok(
              !file.destination.includes("..") &&
                !path.isAbsolute(file.destination)
            );
            const response = await fetch(`${origin}${file.url}?download=1`);
            assert.ok(response.ok, `Download complete ${file.destination}`);
            assert.equal(
              response.headers.get("x-grasscn-destination"),
              file.destination
            );
            const bytes = Buffer.from(await response.arrayBuffer());
            const previous = files.get(file.destination);

            if (previous !== undefined && previous !== "") {
              assert.equal(
                hash(bytes),
                previous,
                "Overlapping manual files agree"
              );
            }

            files.set(file.destination, hash(bytes));
            const existing = path.join(consumer, "src", file.destination);

            if (await exists(existing)) {
              assert.equal(
                hash(await readFile(existing)),
                hash(bytes),
                `Resume requires unchanged public source: ${file.destination}`
              );
            } else {
              await write(`src/${file.destination}`, bytes.toString("utf-8"));
            }
          }
        }

        for (const [name, code] of Object.entries(copiedExamples)) {
          await write(`src/${name}-example.tsx`, code);
        }

        const names = Object.keys(copiedExamples);
        await write(
          "src/examples.tsx",
          `"use client";\n${names.map((name, index) => `import Example${index} from "./${name}-example";`).join("\n")}\nexport default function Examples(){return <main>${names.map((name, index) => `<section aria-label="Consumer ${name}" style={{padding:32}}><Example${index}/></section>`).join("")}</main>}`
        );
        await write(
          "src/globals.css",
          '@import "tailwindcss";body{margin:0;background:#202020}*{box-sizing:border-box}\n'
        );

        const compilerOptions = {
          esModuleInterop: true,
          jsx: "react-jsx",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "Bundler",
          noEmit: true,
          paths: { "@/*": ["./src/*"] },
          resolveJsonModule: true,
          skipLibCheck: true,
          strict: true,
          target: "ES2022",
        };

        if (framework === "vite") {
          await write("tsconfig.json", {
            compilerOptions: { ...compilerOptions, types: ["vite/client"] },
            include: ["src", "vite.config.ts"],
          });
          await write(
            "index.html",
            '<html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>'
          );
          await write(
            "src/main.tsx",
            'import {createRoot} from "react-dom/client";import Examples from "./examples";import "./globals.css";createRoot(document.getElementById("root")!).render(<Examples/>);'
          );
          await write(
            "vite.config.ts",
            'import{defineConfig}from"vite";import tailwindcss from"@tailwindcss/vite";import{fileURLToPath}from"node:url";export default defineConfig({plugins:[tailwindcss()],resolve:{alias:{"@":fileURLToPath(new URL("./src",import.meta.url))}}});'
          );
        } else {
          await write("tsconfig.json", {
            compilerOptions: {
              ...compilerOptions,
              isolatedModules: true,
              plugins: [{ name: "next" }],
            },
            include: ["src", "next-env.d.ts", ".next/types/**/*.ts"],
          });
          await write(
            "postcss.config.mjs",
            'export default{plugins:{"@tailwindcss/postcss":{}}};'
          );
          await write(
            "next.config.mjs",
            "export default{devIndicators:false,agentRules:false,experimental:{cpus:1}};"
          );
          await write(
            "src/app/layout.tsx",
            'import "../globals.css";export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}'
          );
          await write(
            "src/app/page.tsx",
            'import Examples from "../examples";export default function Page(){return <Examples/>}'
          );
        }

        await run(
          [
            "install",
            "--ignore-scripts",
            "--network-concurrency",
            "1",
            ...((await exists(path.join(consumer, "bun.lock")))
              ? ["--frozen-lockfile"]
              : []),
          ],
          consumer
        );
        dependencyIdentity = await assertIndependentDependencies(consumer);
        installedBytes = installedDependencyIdentity(consumer);
        assert.ok(
          installedBytes,
          "Consumer installed dependency byte identity required"
        );
        prebuildInputs = await directoryIdentity(consumer);

        if (framework === "next") {
          await run(
            ["--bun", "node_modules/next/dist/bin/next", "typegen"],
            consumer
          );
        }

        await run(
          ["--bun", "node_modules/typescript/bin/tsc", "--noEmit"],
          consumer
        );

        const buildCommand = [
          ...(framework === "next" ? ["--smol"] : []),
          "--bun",
          framework === "vite"
            ? "node_modules/vite/bin/vite.js"
            : "node_modules/next/dist/bin/next",
          "build",
          ...(framework === "next" ? ["--webpack"] : []),
        ];

        await run(buildCommand, consumer);

        const buildOutput = await directoryIdentity(
          path.join(consumer, framework === "vite" ? "dist" : ".next"),
          new Set(["cache", "trace", "trace-build"])
        );

        /** @type {{bun: string; bundler: string; cpus?: number; smol?: boolean}} */
        const buildSettings = {
          bun: Bun.version,
          bundler: framework === "next" ? "webpack" : "vite",
        };

        if (framework === "next") {
          buildSettings.cpus = 1;
          buildSettings.smol = true;
        }

        report.consumers.push({
          build: "passed",
          buildCommand: [process.execPath, ...buildCommand],
          buildOutput,
          buildSettings,
          dependencyIdentity,
          directory: consumer,
          downloadedFiles: Object.fromEntries(files),
          framework,
          inputs: await directoryIdentity(consumer),
          installedBytes,
          prebuildInputs,
          typecheck: "passed",
        });
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
      dependencyIdentity = await assertIndependentDependencies(consumer);
      installedBytes = installedDependencyIdentity(consumer);
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
        await directoryIdentity(
          path.join(consumer, framework === "vite" ? "dist" : ".next"),
          new Set(["cache", "trace", "trace-build"])
        ),
        built.buildOutput,
        "Prepared consumer production bytes unchanged"
      );
      files = new Map(Object.entries(built.downloadedFiles));
      ({ prebuildInputs } = built);
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

      const button = consumerPage.getByRole("button", {
        exact: true,
        name: "Button",
      });

      await button.waitFor();
      await expect(button).toBeVisible();
      await button.screenshot({
        path: path.join(output, `${framework}-button-runtime.png`),
      });

      const form = consumerPage.getByRole("region", {
        exact: true,
        name: "Consumer form",
      });

      await form
        .getByRole("button", { exact: true, name: "Save player" })
        .click();
      await form.getByRole("alert").first().waitFor();
      await form
        .getByRole("textbox", { exact: true, name: "Player name" })
        .fill("Alex");
      await form
        .getByRole("textbox", { exact: true, name: "World name" })
        .fill("Consumer world");
      await form
        .getByRole("button", { exact: true, name: "Save player" })
        .click();
      await expect(
        form.getByRole("status", { name: "Saved player" })
      ).toHaveText("Alex");
      await expect(
        form.getByRole("status", { name: "Saved world" })
      ).toHaveText("Consumer world");
      await form.getByRole("button", { exact: true, name: "Reset" }).click();
      assert.equal(
        await form
          .getByRole("textbox", { exact: true, name: "Player name" })
          .inputValue(),
        ""
      );
      assert.equal(
        await form
          .getByRole("textbox", { exact: true, name: "World name" })
          .inputValue(),
        "My world"
      );

      const codeBlock = consumerPage.getByRole("region", {
        exact: true,
        name: "Consumer code-block",
      });

      await expect(
        codeBlock.locator('[data-slot="code-block-content"]')
      ).toContainText('const world = "Minecraft";');

      const renderedCode = codeBlock.locator(
        '[data-slot="code-block-content"] [data-mc-selectable-ready]'
      );

      await expect(renderedCode).toHaveCount(1);
      await expect(renderedCode).toHaveAttribute(
        "data-mc-selectable-ready",
        "true"
      );
      const renderedLabels = renderedCode.locator("[data-mc-label-ready]");
      await expect
        .poll(async () => await renderedLabels.count())
        .toBeGreaterThan(0);

      for (const label of await renderedLabels.all()) {
        await expect(label).toHaveAttribute("data-mc-label-ready", "true");
      }

      await codeBlock
        .getByRole("button", { exact: true, name: "Copy" })
        .click();
      await expect(
        codeBlock.getByRole("button", { exact: true, name: "Copied" })
      ).toHaveAttribute("data-copied", "true");
      assert.equal(
        await consumerPage.evaluate(
          async () => await navigator.clipboard.readText()
        ),
        'const world = "Minecraft";'
      );

      const steve = consumerPage.getByRole("group", {
        exact: true,
        name: "Steve preview",
      });

      const alex = consumerPage.getByRole("group", {
        exact: true,
        name: "Alex preview",
      });

      const webgl = [];
      await expect(
        consumerPage
          .getByRole("region", { exact: true, name: "Consumer player-preview" })
          .getByText("Skin ready", { exact: true })
      ).toBeVisible();

      for (const [index, preview] of [steve, alex].entries()) {
        await preview.scrollIntoViewIfNeeded();
        await preview.locator("canvas").waitFor({ state: "visible" });
        await consumerPage.waitForFunction(
          (label) =>
            document.querySelector(`[aria-label="${label}"]`)?.dataset.ready ===
            "true",
          await preview.getAttribute("aria-label")
        );
        await preview.focus();
        const before = await preview.locator("canvas").screenshot();
        await preview.press("ArrowRight");
        const rotated = await preview.locator("canvas").screenshot();
        assert.notEqual(
          hash(before),
          hash(rotated),
          "Keyboard rotation repaints the actual WebGL canvas"
        );
        await preview.press("Home");
        const reset = await preview.locator("canvas").screenshot();
        assert.equal(
          hash(reset),
          hash(before),
          "Home restores the default WebGL pose"
        );
        await writeFile(
          path.join(output, `${framework}-player-${index}.png`),
          reset
        );
        webgl.push({
          initialSha256: hash(before),
          model: await preview.getAttribute("data-model"),
          resetSha256: hash(reset),
          rotatedSha256: hash(rotated),
        });
      }

      assert.equal(await steve.getAttribute("data-model"), "wide");
      assert.equal(await alex.getAttribute("data-model"), "slim");

      const map = consumerPage.getByRole("region", {
        exact: true,
        name: "Consumer map",
      });

      await map.getByRole("button", { exact: true, name: "Camp" }).click();
      assert.equal(await map.locator("output").textContent(), "Camp");

      const sign = consumerPage.getByRole("group", {
        exact: true,
        name: "Standing sign",
      });

      await sign.scrollIntoViewIfNeeded();
      await sign.locator("canvas").waitFor({ state: "visible" });
      await consumerPage.waitForFunction(
        () =>
          document.querySelector('[aria-label="Standing sign"] canvas')?.dataset
            .ready === "true"
      );

      const trading = consumerPage.getByRole("region", {
        exact: true,
        name: "Consumer trading",
      });

      await expect
        .poll(
          async () =>
            await trading
              .locator("img")
              .evaluateAll(
                (images) =>
                  images.length > 0 &&
                  images.every(
                    (image) => image.complete && image.naturalWidth === 16
                  )
              )
        )
        .toBe(true);
      await trading
        .getByRole("button", { exact: true, name: "Trade for Bread" })
        .click();
      await expect(trading.getByRole("status")).toHaveText(
        "1 trades completed"
      );

      const resizable = consumerPage.getByRole("region", {
        exact: true,
        name: "Consumer resizable",
      });

      const handle = resizable.getByRole("separator", {
        name: "Resize inventory panels",
      });

      await handle.focus();
      await handle.press("ArrowRight");
      await expect
        .poll(async () => Number(await handle.getAttribute("aria-valuenow")))
        .toBeGreaterThan(50);
      await resizable
        .getByRole("button", { exact: true, name: "Reset panels" })
        .click();
      await expect(handle).toHaveAttribute("aria-valuenow", "50");

      const sidebar = consumerPage.getByRole("region", {
        exact: true,
        name: "Consumer sidebar",
      });

      const sidebarTrigger = sidebar.getByRole("button", {
        name: "Toggle world navigation",
      });

      await sidebarTrigger.click();
      await expect(sidebar.locator('[data-slot="sidebar"]')).toHaveAttribute(
        "data-state",
        "collapsed"
      );
      await consumerPage.setViewportSize({ height: 844, width: 390 });
      await sidebarTrigger.click();

      const sidebarDialog = consumerPage.getByRole("dialog", {
        exact: true,
        name: "Sidebar",
      });

      await expect(
        sidebarDialog.getByRole("link", { exact: true, name: "Worlds" })
      ).toBeVisible();
      await consumerPage.screenshot({
        path: path.join(output, `${framework}-sidebar-mobile.png`),
      });
      await consumerPage.keyboard.press("Escape");
      await expect(sidebarDialog).not.toBeVisible();
      await consumerPage.setViewportSize({ height: 900, width: 1280 });

      const table = consumerPage.getByRole("region", {
        exact: true,
        name: "Consumer data-table",
      });

      await expect(table.getByLabel("World selection")).toContainText(
        "Page 1 of 2"
      );
      await table.getByRole("button", { exact: true, name: "Next" }).click();
      await expect(table.getByLabel("World selection")).toContainText(
        "Page 2 of 2"
      );
      await table
        .getByRole("textbox", { exact: true, name: "Filter worlds" })
        .fill("Grasslands");
      await table.getByRole("row").filter({ hasText: "Grasslands" }).click();
      await expect(table.getByLabel("World selection")).toContainText(
        "1 selected"
      );
      await table
        .getByRole("textbox", { exact: true, name: "Filter worlds" })
        .fill("missing world");
      await expect(
        table.getByRole("cell", { exact: true, name: "No results." })
      ).toBeVisible();

      const datePicker = consumerPage.getByRole("region", {
        exact: true,
        name: "Consumer date-picker",
      });

      await datePicker
        .getByRole("button", { exact: true, name: "Pick a day" })
        .click();

      const datePopup = consumerPage.locator(
        '[data-slot="date-picker-content"]'
      );

      await datePopup
        .getByRole("button", { name: /October 15.*2026/u })
        .click();
      await expect(
        datePicker.getByRole("button", {
          exact: true,
          name: "October 15th, 2026",
        })
      ).toBeVisible();
      await expect(datePopup).toBeVisible();
      await consumerPage.keyboard.press("Escape");
      await expect(datePopup).toHaveCount(0);

      const message = consumerPage.getByRole("region", {
        exact: true,
        name: "Consumer message-scroller",
      });

      const viewport = message.getByLabel("Player chat", { exact: true });
      await message.getByRole("button", { exact: true, name: "First" }).click();
      await expect
        .poll(
          async () => await viewport.evaluate((element) => element.scrollTop)
        )
        .toBe(0);
      await message
        .getByRole("textbox", { exact: true, name: "Message text" })
        .fill("Bring torches.");
      await message.getByRole("button", { exact: true, name: "Send" }).click();
      await expect(message.getByLabel("Message count")).toHaveText(
        "13 messages"
      );
      await message
        .getByRole("button", { exact: true, name: "Latest" })
        .click();
      await expect(message.getByRole("log")).toContainText("Bring torches.");
      await expect
        .poll(
          async () =>
            await viewport.evaluate(
              (element) =>
                element.scrollHeight - element.clientHeight - element.scrollTop
            )
        )
        .toBeLessThan(2);

      const alert = consumerPage.getByRole("region", {
        exact: true,
        name: "Consumer alert-dialog",
      });

      const alertTrigger = alert.getByRole("button", {
        exact: true,
        name: "Delete world",
      });

      await alertTrigger.click();

      const alertDialog = consumerPage.getByRole("alertdialog", {
        exact: true,
        name: "Delete this world?",
      });

      await alertDialog
        .getByRole("button", { exact: true, name: "Yes" })
        .click();
      await expect(alertDialog).toHaveCount(0);
      await expect(alert.getByLabel("Confirmed deletions")).toHaveText(
        "1 confirmed"
      );
      await expect(alertTrigger).toBeFocused();

      const command = consumerPage.getByRole("region", {
        exact: true,
        name: "Consumer command",
      });

      const commandTrigger = command.getByRole("button", {
        exact: true,
        name: "Open command palette",
      });

      await commandTrigger.click();

      const commandDialog = consumerPage.getByRole("dialog", {
        exact: true,
        name: "World commands",
      });

      await commandDialog
        .getByRole("option", { exact: true, name: "Save world" })
        .click();
      await expect(commandDialog).toHaveCount(0);
      await expect(command.getByLabel("Palette selection")).toHaveText("save");
      await expect(commandTrigger).toBeFocused();

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
    /* eslint-enable no-await-in-loop, react-doctor/async-await-in-loop */

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
