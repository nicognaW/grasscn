import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
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
import { packageBin } from "@grasscn/tests/tooling";

import {
  assertExternalProject,
  assertIndependentDependencies,
  assertConsumerPortAvailable,
  consumerEnvironment,
  directoryIdentity,
} from "./consumer-boundary.mjs";
import {
  fetchPublicRegistry,
  assertRegistryInstallation,
} from "./consumer-registry.mjs";
import {
  parseWebsiteIdentity,
  parseCliReceipt,
  parseRegistry,
  encodeConsumerFile,
} from "./consumer-validation-types.ts";
import { consumerVerificationEnvironment } from "./prepared-consumers.mjs";

// Run only under the shared resource guard with an already owned production website.
// This is deliberately separate from manual projects: shadcn is the only Grasscn writer here.
const root = repoRoot;
const phase = process.env.GRASSCN_CLI_CONSUMER_PHASE;

assert.ok(
  ["prepare", "runtime"].includes(phase),
  "Use prepare (4%) then runtime (10%) under the shared guard"
);

assert.equal(Bun.version, "1.4.4");

const origin = process.env.GRASSCN_PREVIEW_URL;

assert.ok(
  origin !== undefined &&
    origin !== "" &&
    /^http:\/\/127\.0\.0\.1:\d+$/u.test(origin),
  "Owned production preview origin required"
);

const source = await sourceIdentity(root);

const websiteIdentity = parseWebsiteIdentity(
  process.env.GRASSCN_WEBSITE_IDENTITY ?? "null"
);

assertProductionSource(websiteIdentity, source);

assert.ok(
  websiteIdentity.buildId && websiteIdentity.outputSha256,
  "Production build identity required"
);

const productionIdentity = await productionBuildIdentity({ source });

assert.equal(
  productionIdentity.outputSha256,
  websiteIdentity.outputSha256,
  "Website production output must remain source-bound"
);

const outputRoot = path.join(root, "test-results", "cli-consumers");

const output =
  process.env.GRASSCN_CLI_CONSUMER_DIRECTORY !== undefined &&
  process.env.GRASSCN_CLI_CONSUMER_DIRECTORY !== ""
    ? path.resolve(process.env.GRASSCN_CLI_CONSUMER_DIRECTORY)
    : path.join(outputRoot, String(Date.now()));

assert.ok(
  output.startsWith(outputRoot + path.sep),
  "CLI artifacts must stay under cli-consumers"
);

await mkdir(output, { recursive: true });

const preparedFile = path.join(output, "prepared.json");

/** @type {import("./consumer-validation-types.ts").CliReport | undefined} */
let prepared;

if (phase === "runtime") {
  prepared = parseCliReceipt(await readFile(preparedFile, "utf-8"));
  assert.equal(prepared.status, "prepared");
  assert.deepEqual(prepared.source, source);
  assert.deepEqual(prepared.websiteIdentity, websiteIdentity);
}

try {
  await readFile(
    phase === "prepare" ? preparedFile : path.join(output, "report.json")
  );
  assert.fail("CLI phase requires fresh execution; old reports cannot resume");
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
    throw error;
  }
}

const consumer =
  prepared?.consumer ?? (await mkdtemp(path.join(tmpdir(), "grasscn-cli-")));

const git = Bun.spawn(
  ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
  { cwd: root, stderr: "inherit", stdout: "pipe" }
);

const gitOutput = await new Response(git.stdout).text();
const commonDirectory = gitOutput.trim();

assert.equal(await git.exited, 0);

await assertExternalProject(consumer, [root, path.dirname(commonDirectory)]);

/** @type {import("./consumer-validation-types.ts").CliReport} */
const report = {
  ...prepared,
  bun: Bun.version,
  consumer,
  phase,
  source,
  status: "incomplete",
  steps: [],
  website: origin,
  websiteIdentity,
};

report.environment = consumerVerificationEnvironment();

if (prepared) {
  assert.deepEqual(
    prepared.environment,
    report.environment,
    "CLI consumer environment unchanged"
  );
}

/** @param {string} filename @param {unknown} contents */
const write = async (filename, contents) => {
  const destination = path.join(consumer, filename);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, encodeConsumerFile(contents));
};

/** @param {string[]} args - Arguments for the independent consumer command. */
const run = async (args) => {
  const child = Bun.spawn([process.execPath, ...args], {
    cwd: consumer,
    env: consumerEnvironment(),
    stderr: "inherit",
    stdout: "inherit",
  });

  assert.equal(
    await child.exited,
    0,
    `External CLI consumer command: ${args.join(" ")}`
  );
};

let browser;
let server;

try {
  if (phase === "prepare") {
    await write("package.json", {
      dependencies: {
        clsx: "2.1.1",
        react: "19.3.1",
        "react-dom": "19.3.1",
        "tailwind-merge": "3.7.0",
        tailwindcss: "4.3.3",
      },
      devDependencies: {
        "@tailwindcss/vite": "4.3.3",
        "@types/node": "26.6.5",
        "@types/react": "19.3.0",
        "@types/react-dom": "19.3.0",
        shadcn: "4.23.0",
        typescript: "7.0.2",
        vite: "8.3.5",
      },
      name: "grasscn-cli-consumer",
      packageManager: "bun@1.4.4",
      private: true,
      type: "module",
    });

    const settings = {
      $schema: "https://ui.shadcn.com/schema.json",
      aliases: {
        components: "@/components",
        hooks: "@/hooks",
        lib: "@/lib",
        ui: "@/components/ui",
        utils: "@/lib/utils",
      },
      rsc: false,
      style: "base-nova",
      tailwind: {
        baseColor: "neutral",
        config: "",
        css: "src/globals.css",
        cssVariables: true,
      },
      tsx: true,
    };

    await write("components.json", settings);
    await write(
      "src/lib/utils.ts",
      'import{clsx,type ClassValue}from"clsx";import{twMerge}from"tailwind-merge";export function cn(...inputs:ClassValue[]){return twMerge(clsx(inputs))}'
    );
    await write(
      "src/globals.css",
      '@import "tailwindcss";body{margin:0;background:#202020}*{box-sizing:border-box}'
    );
    await write("tsconfig.json", {
      compilerOptions: {
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
        types: ["vite/client"],
      },
      include: ["src", "vite.config.ts"],
    });
    await write(
      "vite.config.ts",
      'import{defineConfig}from"vite";import tailwindcss from"@tailwindcss/vite";import{fileURLToPath}from"node:url";export default defineConfig({plugins:[tailwindcss()],resolve:{alias:{"@":fileURLToPath(new URL("./src",import.meta.url))}}});'
    );
    await write(
      "index.html",
      '<html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>'
    );
    await write(
      "src/main.tsx",
      'import{createRoot}from"react-dom/client";import{Button}from"@/components/ui/button";import"./globals.css";createRoot(document.getElementById("root")!).render(<Button data-subject>Button</Button>);'
    );
    await run(["install", "--ignore-scripts", "--network-concurrency", "1"]);

    const registry = parseRegistry(
      await readFile(path.join(root, "apps/web/registry.json"), "utf-8")
    );

    assert.ok(
      new Set(registry.items.map((item) => item.name)).size ===
        registry.items.length
    );
    const payloads = await fetchPublicRegistry(origin, registry.items, root);
    report.registryPayloads = Object.fromEntries(
      [...payloads].map(([name, value]) => [
        name,
        { sha256: value.sha256, url: value.url },
      ])
    );
    const sortedCurrentItemNames = registry.items.map((item) => item.name);
    sortedCurrentItemNames.sort();
    report.currentItemNames = sortedCurrentItemNames;

    const initializedDependencies =
      await assertIndependentDependencies(consumer);

    const cli = packageBin("shadcn", "shadcn", consumer);
    report.cli = {
      packageSha256: initializedDependencies.shadcn.packageSha256,
      path: cli,
      version: initializedDependencies.shadcn.version,
    };
    await run([
      "--bun",
      cli,
      "add",
      ...[...payloads.values()].map((entry) => entry.url),
      "--yes",
      "--overwrite",
      "--cwd",
      consumer,
    ]);
    report.steps.push(
      "Actual shadcn CLI installed every current item URL from the owned Next production origin"
    );
    report.installation = await assertRegistryInstallation(
      payloads,
      consumer,
      settings
    );
    report.dependencyIdentity = await assertIndependentDependencies(consumer);
    const installedBytes = installedDependencyIdentity(consumer);
    assert.ok(installedBytes !== null);
    report.installedBytes = installedBytes;
    await run(["--bun", "node_modules/typescript/bin/tsc", "--noEmit"]);
    report.steps.push(
      "All installed TypeScript files typecheck in the external consumer"
    );
    await run(["--bun", "node_modules/vite/bin/vite.js", "build"]);
    report.steps.push("Independent Vite production build passed");
    report.inputs = await directoryIdentity(consumer);
    report.buildOutput = await directoryIdentity(path.join(consumer, "dist"));
    report.artifacts = await directoryIdentity(
      output,
      new Set(["report.json", "prepared.json"])
    );
    assert.deepEqual(
      await sourceIdentity(root),
      source,
      "Source remained frozen during CLI installation/build"
    );
    report.status = "prepared";
  } else {
    assert.deepEqual(
      await directoryIdentity(consumer),
      prepared.inputs,
      "CLI consumer prepared inputs unchanged"
    );
    assert.deepEqual(
      await directoryIdentity(path.join(consumer, "dist")),
      prepared.buildOutput,
      "CLI consumer production bytes unchanged"
    );
    assert.deepEqual(
      await assertIndependentDependencies(consumer),
      prepared.dependencyIdentity,
      "CLI dependency resolutions unchanged"
    );
    assert.deepEqual(
      installedDependencyIdentity(consumer),
      prepared.installedBytes,
      "CLI installed dependency bytes unchanged"
    );
    const port = 5198;
    await assertConsumerPortAvailable(port);
    server = Bun.spawn(
      [
        process.execPath,
        "--bun",
        "node_modules/vite/bin/vite.js",
        "preview",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
      ],
      {
        cwd: consumer,
        env: consumerEnvironment(),
        stderr: "inherit",
        stdout: "inherit",
      }
    );

    /* eslint-disable no-await-in-loop, react-doctor/async-await-in-loop -- Readiness retries must observe the same owned server before retrying. */
    for (let attempt = 0; ; attempt += 1) {
      assert.ok(
        server.exitCode === null,
        "Owned CLI consumer host exited before readiness"
      );

      try {
        const response = await fetch(`http://127.0.0.1:${port}`);

        if (response.ok) {
          break;
        }
      } catch {
        // The owned server may refuse connections while its listener starts.
      }

      assert.ok(
        attempt < 120,
        "CLI consumer production host readiness timeout"
      );
      await Bun.sleep(500);
    }
    /* eslint-enable no-await-in-loop, react-doctor/async-await-in-loop */

    const observerRequire = createRequire(path.join(testRoot, "package.json"));

    /** @type {typeof import("@playwright/test")} */
    // eslint-disable-next-line typescript/no-unsafe-assignment -- Preserve the pinned observer module selected through its own package resolution.
    const playwrightModule = observerRequire("@playwright/test");
    const { chromium } = playwrightModule;

    browser = await chromium.launch({ channel: "msedge", headless: true });
    report.browserVersion = browser.version();

    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: { height: 900, width: 1280 },
    });

    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}`);
    const subject = page.getByRole("button", { exact: true, name: "Button" });
    await subject.waitFor();
    await page.mouse.move(1000, 800);
    const actualBytes = await subject.screenshot();
    await writeFile(path.join(output, "button-actual.png"), actualBytes);
    await subject.click();
    report.runtime = { buttonVisibleAndActivatable: "passed" };
    assert.deepEqual(errors, []);
    report.inputs = await directoryIdentity(consumer);
    report.artifacts = await directoryIdentity(
      output,
      new Set(["report.json", "prepared.json"])
    );
    assert.deepEqual(
      await sourceIdentity(root),
      source,
      "Source remained frozen throughout CLI acceptance"
    );
    report.status = "passed";
  }
} catch (error) {
  report.status = "failed";
  report.error =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  throw error;
} finally {
  if (browser) {
    await browser.close();
  }

  if (server) {
    server.kill();
    await server.exited;
  }

  await writeFile(
    phase === "prepare" ? preparedFile : path.join(output, "report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(
    JSON.stringify({ error: report.error, output, status: report.status })
  );
}
