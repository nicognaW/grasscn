import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile, stat, realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertExternalProject, assertIndependentDependencies, assertConsumerPortAvailable, consumerEnvironment, directoryIdentity } from "./consumer-boundary.mjs";
import { installedDependencyIdentity } from "./dependency-identity.mjs";
import { sourceIdentity, assertProductionSource, productionBuildIdentity } from "./next-production.mjs";

// Run through the workspace resource guard with an owned production website already available.
// These consumers start empty: no CLI-installed Grasscn files, developer aliases or fixture imports.
const root = process.cwd();
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const phase = process.env.GRASSCN_MANUAL_CONSUMER_PHASE;
assert(["collect", "prepare", "runtime"].includes(phase), "Use collect (10%), prepare (4%) then runtime (10%) under the shared guard");
const origin = process.env.GRASSCN_PREVIEW_URL;
assert(
  origin && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin),
  "Set the owned production GRASSCN_PREVIEW_URL"
);
const consumerRoot = path.join(root, ".pixel-perfect-test", "manual-consumers");
const output = process.env.GRASSCN_MANUAL_CONSUMER_DIRECTORY
  ? path.resolve(process.env.GRASSCN_MANUAL_CONSUMER_DIRECTORY)
  : path.join(consumerRoot, String(Date.now()));
assert(output.startsWith(consumerRoot + path.sep), "Evidence directory must stay in manual-consumers");
const gitDirectory = Bun.spawn(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: root, stdout: "pipe", stderr: "inherit" });
const commonDirectory = (await new Response(gitDirectory.stdout).text()).trim();
assert.equal(await gitDirectory.exited, 0);
const websiteIdentity = JSON.parse(process.env.GRASSCN_WEBSITE_IDENTITY ?? "null");
assert(websiteIdentity?.source && websiteIdentity?.buildId && websiteIdentity?.outputSha256, "Owned production GRASSCN_WEBSITE_IDENTITY required");
const source = await sourceIdentity(root);
assertProductionSource(websiteIdentity, source);
assert.equal((await productionBuildIdentity({ source })).outputSha256, websiteIdentity.outputSha256, "Website production output must remain source-bound");
const exists = async (file) => {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
};
await mkdir(output, { recursive: true });
const publicInputsFile = path.join(output, "public-inputs.json");
const preparedFile = path.join(output, "prepared.json");
let publicInputs, prepared;
if (phase !== "collect") {
  publicInputs = JSON.parse(await readFile(publicInputsFile, "utf8"));
  assert.deepEqual(publicInputs.source, source, "Collected visitor source must match current snapshot");
  assert.deepEqual(publicInputs.websiteIdentity, websiteIdentity, "Collected visitor host must remain identical");
}
if (phase === "runtime") {
  prepared = JSON.parse(await readFile(preparedFile, "utf8"));
  assert.equal(prepared.status, "prepared");
  assert.deepEqual(prepared.source, source);
  assert.deepEqual(prepared.websiteIdentity, websiteIdentity);
  assert.equal(prepared.publicInputsSha256, hash(await readFile(publicInputsFile)));
}
if (phase === "collect") assert(!(await exists(publicInputsFile)), "Collection requires a fresh artifact directory");
if (phase === "prepare") assert(!(await exists(preparedFile)), "Preparation requires a fresh external consumer; no old build reuse");
if (phase === "runtime") assert(!(await exists(path.join(output, "report.json"))), "Final runtime requires fresh execution; no old report reuse");
const projectRoot = publicInputs?.projectRoot ?? await mkdtemp(path.join(tmpdir(), "grasscn-manual-"));
await assertExternalProject(projectRoot, [root, path.dirname(commonDirectory)]);
const report = {
  status: "incomplete",
  website: origin,
  bun: Bun.version,
  consumers: [],
  projectRoot,
  websiteIdentity,
  source,
  phase,
  environment: { platform: process.platform, arch: process.arch, locale: Intl.DateTimeFormat().resolvedOptions().locale, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
};
if (publicInputs) {
  assert.equal(publicInputs.bun, Bun.version, "Collected Bun runtime unchanged");
  assert.deepEqual(publicInputs.environment, report.environment, "Consumer environment unchanged between phases");
}
const revision = Bun.spawn(["git", "rev-parse", "HEAD"], {
  cwd: root,
  stdout: "pipe",
  stderr: "inherit",
});
report.sourceCommit = (await new Response(revision.stdout).text()).trim();
assert.equal(await revision.exited, 0);
assert.equal(Bun.version, "1.4.4");
async function run(args, cwd) {
  const child = Bun.spawn(["bun", ...args], {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    env: consumerEnvironment(),
  });
  assert.equal(await child.exited, 0, `Bun ${args.join(" ")}`);
}
const sourceRequire = createRequire(
  path.join(root, "packages/tests/package.json")
);
const { chromium, expect } = sourceRequire("@playwright/test");
const { PNG } = sourceRequire("pngjs");
function compare(actual, expected) {
  assert.deepEqual(
    [actual.width, actual.height],
    [expected.width, expected.height]
  );
  const diff = new PNG({ width: actual.width, height: actual.height });
  let differentPixels = 0;
  for (let offset = 0; offset < actual.data.length; offset += 4)
    if (
      !actual.data
        .subarray(offset, offset + 4)
        .equals(expected.data.subarray(offset, offset + 4))
    ) {
      differentPixels++;
      diff.data.set([255, 0, 0, 255], offset);
    }
  return { differentPixels, diff };
}
const catalogue = JSON.parse(
  await readFile(
    path.join(root, "packages/tests/scripts/browser-base-cases.json"),
    "utf8"
  )
);
assert(
  catalogue.cases.some(
    (entry) =>
      entry.file === "docs-examples.spec.ts" &&
      entry.title ===
        "Button documentation connects its executable example, complete code and implementation source"
  )
);
assert(
  catalogue.cases.some(
    (entry) =>
      entry.file === "pixels.spec.ts" &&
      entry.title === "vanilla pixels: normal-w200-s2.png"
  )
);
const browser = phase === "prepare" ? undefined : await chromium.launch({ headless: true, channel: "msedge" });
report.browserVersion = browser?.version() ?? publicInputs.browserVersion;
if (phase === "runtime") assert.equal(report.browserVersion, publicInputs.browserVersion, "Browser identity must match collection");
let server;
try {
  let copiedExamples = publicInputs?.copiedExamples;
  let manifests = publicInputs?.manifests;
  if (phase === "collect") {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${origin}/docs/components/button`);
  const example = page.getByRole("region", {
    name: "Button example",
    exact: true,
  });
  await example.getByRole("tab", { name: "Code", exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (code) => {
          window.consumerExample = code;
        },
      },
    });
  });
  await example.getByRole("button", { name: "Copy", exact: true }).click();
  await example.getByRole("status").filter({ hasText: "Copied" }).waitFor();
  const exampleCode = await page.evaluate(() => window.consumerExample);
  assert(
    exampleCode.includes('import { Button } from "@/components/ui/button"')
  );
  report.exampleSha256 = hash(exampleCode);
  copiedExamples = { button: exampleCode };
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
    const region = page.getByRole("region", { name: title, exact: true });
    await region.getByRole("tab", { name: "Code", exact: true }).click();
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (code) => { window.consumerExample = code; } } }));
    await region.getByRole("button", { name: "Copy", exact: true }).click();
    await region.getByRole("status").filter({ hasText: "Copied" }).waitFor();
    const code = await page.evaluate(() => window.consumerExample);
    assert(typeof code === "string" && code.includes("export default"), `Complete visitor code: ${filename}`);
    copiedExamples[filename] = code;
  }
  report.copiedExamples = Object.fromEntries(Object.entries(copiedExamples).map(([name, code]) => [name, hash(code)]));
  manifests = [];
  for (const name of ["button", "code-block", "form", "player-preview", "map", "sign", "trading", "resizable", "typography", "sidebar", "data-table", "input", "date-picker", "message", "alert-dialog", "command", "chart"]) {
    const response = await fetch(`${origin}/api/installation/${name}`);
    assert(response.ok, `Public ${name} inventory available`);
    manifests.push(await response.json());
  }
  report.publicManifestSha256 = hash(JSON.stringify(manifests));
  await writeFile(publicInputsFile, JSON.stringify({ source, websiteIdentity, projectRoot, copiedExamples, manifests, browserVersion: report.browserVersion, bun: Bun.version, environment: report.environment }, null, 2));
  assert.deepEqual(await sourceIdentity(root), source, "Source remained frozen while collecting public instructions");
  report.status = "collected";
  } else {
  report.publicInputsSha256 = hash(await readFile(publicInputsFile));
  report.copiedExamples = Object.fromEntries(Object.entries(copiedExamples).map(([name, code]) => [name, hash(code)]));
  report.publicManifestSha256 = hash(JSON.stringify(manifests));
  const dependencies = {
    react: "19.3.1",
    "react-dom": "19.3.1",
    clsx: "2.1.1",
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
  for (const framework of ["vite", "next"]) {
    const consumer = path.join(projectRoot, framework);
    let files, dependencyIdentity, installedBytes, prebuildInputs;
    if (phase === "prepare") {
    await mkdir(path.join(consumer, "src/lib"), { recursive: true });
    await assertExternalProject(consumer, [root, path.dirname(commonDirectory)]);
    const write = async (name, contents) => {
      const file = path.join(consumer, name);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(
        file,
        typeof contents === "string"
          ? contents
          : JSON.stringify(contents, null, 2)
      );
    };
    await write("components.json", {
      $schema: "https://ui.shadcn.com/schema.json",
      style: "base-nova",
      rsc: framework === "next",
      tsx: true,
      tailwind: {
        config: "",
        css: "src/globals.css",
        baseColor: "neutral",
        cssVariables: true,
      },
      aliases: {
        components: "@/components",
        ui: "@/components/ui",
        hooks: "@/hooks",
        lib: "@/lib",
        utils: "@/lib/utils",
      },
    });
    await write(
      "src/lib/utils.ts",
      'import {clsx,type ClassValue} from "clsx"; import {twMerge} from "tailwind-merge"; export function cn(...inputs:ClassValue[]){return twMerge(clsx(inputs))}\n'
    );
    const packageData = {
      name: `grasscn-manual-${framework}`,
      private: true,
      type: "module",
      packageManager: "bun@1.4.4",
      dependencies: {
        ...dependencies,
        ...(framework === "vite"
          ? { vite: "8.3.5", "@tailwindcss/vite": "4.3.3" }
          : { next: "16.4.2", "@tailwindcss/postcss": "4.3.3" }),
      },
      devDependencies: {
        typescript: "7.0.2",
        "@types/react": "19.3.0",
        "@types/react-dom": "19.3.0",
        "@types/node": "26.6.5",
      },
    };
    await write("package.json", packageData);
    files = new Map();
    for (const manifest of manifests)
      for (const file of manifest.files) {
        assert(
          !file.destination.includes("..") && !path.isAbsolute(file.destination)
        );
        const response = await fetch(`${origin}${file.url}?download=1`);
        assert(response.ok, `Download complete ${file.destination}`);
        assert.equal(
          response.headers.get("x-grasscn-destination"),
          file.destination
        );
        const bytes = Buffer.from(await response.arrayBuffer());
        const previous = files.get(file.destination);
        if (previous)
          assert.equal(hash(bytes), previous, "Overlapping manual files agree");
        files.set(file.destination, hash(bytes));
        const existing = path.join(consumer, "src", file.destination);
        if (await exists(existing))
          assert.equal(
            hash(await readFile(existing)),
            hash(bytes),
            `Resume requires unchanged public source: ${file.destination}`
          );
        else await write(`src/${file.destination}`, bytes.toString("utf8"));
      }
    for (const [name, code] of Object.entries(copiedExamples)) await write(`src/${name}-example.tsx`, code);
    const names = Object.keys(copiedExamples);
    await write("src/examples.tsx", `"use client";\n${names.map((name, index) => `import Example${index} from "./${name}-example";`).join("\n")}\nexport default function Examples(){return <main>${names.map((name, index) => `<section aria-label="Consumer ${name}" style={{padding:32}}><Example${index}/></section>`).join("")}</main>}`);
    await write(
      "src/globals.css",
      '@import "tailwindcss";body{margin:0;background:#202020}*{box-sizing:border-box}\n'
    );
    const compilerOptions = {
      target: "ES2022",
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      module: "ESNext",
      moduleResolution: "Bundler",
      jsx: "react-jsx",
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      esModuleInterop: true,
      resolveJsonModule: true,
      paths: { "@/*": ["./src/*"] },
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
          plugins: [{ name: "next" }],
          isolatedModules: true,
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
    assert(installedBytes, "Consumer installed dependency byte identity required");
    prebuildInputs = await directoryIdentity(consumer);
    if (framework === "next")
      await run(
        ["--bun", "node_modules/next/dist/bin/next", "typegen"],
        consumer
      );
    await run(
      ["--bun", "node_modules/typescript/bin/tsc", "--noEmit"],
      consumer
    );
    await run(["--bun", framework === "vite" ? "node_modules/vite/bin/vite.js" : "node_modules/next/dist/bin/next", "build"], consumer);
    const buildOutput = await directoryIdentity(path.join(consumer, framework === "vite" ? "dist" : ".next"), new Set(["cache", "trace", "trace-build"]));
    report.consumers.push({ framework, directory: consumer, dependencyIdentity, installedBytes, prebuildInputs, inputs: await directoryIdentity(consumer), buildOutput, downloadedFiles: Object.fromEntries(files), typecheck: "passed", build: "passed" });
    continue;
    }
    const built = prepared.consumers.find((entry) => entry.framework === framework);
    assert(built, `Prepared ${framework} consumer required`);
    await assertExternalProject(consumer, [root, path.dirname(commonDirectory)]);
    dependencyIdentity = await assertIndependentDependencies(consumer);
    installedBytes = installedDependencyIdentity(consumer);
    assert.deepEqual(dependencyIdentity, built.dependencyIdentity, "Prepared dependency resolutions unchanged");
    assert.deepEqual(installedBytes, built.installedBytes, "Prepared installed dependency bytes unchanged");
    assert.deepEqual(await directoryIdentity(consumer), built.inputs, "Prepared consumer inputs unchanged");
    assert.deepEqual(await directoryIdentity(path.join(consumer, framework === "vite" ? "dist" : ".next"), new Set(["cache", "trace", "trace-build"])), built.buildOutput, "Prepared consumer production bytes unchanged");
    files = new Map(Object.entries(built.downloadedFiles));
    prebuildInputs = built.prebuildInputs;
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
      stdout: "inherit",
      stderr: "inherit",
      env: consumerEnvironment(),
    });
    for (let attempt = 0; ; attempt++) {
      assert(server.exitCode === null, "Owned consumer host exited before readiness");
      try {
        if ((await fetch(`http://127.0.0.1:${port}`)).ok) break;
      } catch {}
      assert(attempt < 120, "Consumer started");
      await Bun.sleep(500);
    }
    const errors = [];
    const consumerPage = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1,
    });
    consumerPage.on("pageerror", (error) => errors.push(error.message));
    await consumerPage.goto(`http://127.0.0.1:${port}`);
    await consumerPage.mouse.move(1000, 800);
    const button = consumerPage.getByRole("button", {
      name: "Button",
      exact: true,
    });
    await button.waitFor();
    const actualBytes = await button.screenshot();
    await writeFile(
      path.join(output, `${framework}-button-actual.png`),
      actualBytes
    );
    const referenceBytes = await readFile(
      path.join(
        root,
        "packages/tests/tests/reference/captures/normal-w200-s2.png"
      )
    );
    const nativeManifest = JSON.parse(
      await readFile(
        path.join(root, "packages/tests/tests/reference/manifest.json"),
        "utf8"
      )
    );
    const nativeCase = nativeManifest.cases.find(
      (entry) => entry.name === "normal-w200-s2.png"
    );
    assert.equal(hash(referenceBytes), nativeCase.sha256);
    const actual = PNG.sync.read(actualBytes),
      reference = PNG.sync.read(referenceBytes);
    const corrupted = PNG.sync.read(referenceBytes);
    corrupted.data[0] ^= 1;
    assert.equal(
      compare(corrupted, reference).differentPixels,
      1,
      "Comparator rejects one-pixel corruption"
    );
    const { differentPixels, diff } = compare(actual, reference);
    await writeFile(
      path.join(output, `${framework}-button-diff.png`),
      PNG.sync.write(diff)
    );
    await writeFile(
      path.join(output, `${framework}-button-pixels.json`),
      JSON.stringify(
        {
          referenceCase: nativeCase.name,
          referenceSha256: nativeCase.sha256,
          actualSha256: hash(actualBytes),
          differentPixels,
          totalPixels: actual.width * actual.height,
          onePixelCorruptionDetected: true,
        },
        null,
        2
      )
    );
    assert.equal(
      differentPixels,
      0,
      `${framework} manually installed Button matches its existing Base reference`
    );
    const form = consumerPage.getByRole("region", { name: "Consumer form", exact: true });
    await form.getByRole("button", { name: "Save player", exact: true }).click();
    await form.getByRole("alert").first().waitFor();
    await form.getByRole("textbox", { name: "Player name", exact: true }).fill("Alex");
    await form.getByRole("textbox", { name: "World name", exact: true }).fill("Consumer world");
    await form.getByRole("button", { name: "Save player", exact: true }).click();
    await expect(form.getByRole("status", { name: "Saved player" })).toHaveText("Alex");
    await expect(form.getByRole("status", { name: "Saved world" })).toHaveText("Consumer world");
    await form.getByRole("button", { name: "Reset", exact: true }).click();
    assert.equal(await form.getByRole("textbox", { name: "Player name", exact: true }).inputValue(), "");
    assert.equal(await form.getByRole("textbox", { name: "World name", exact: true }).inputValue(), "My world");
    const codeBlock = consumerPage.getByRole("region", { name: "Consumer code-block", exact: true });
    await expect(codeBlock.locator('[data-slot="code-block-content"]')).toContainText('const world = "Minecraft";');
    await consumerPage.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (code) => { window.consumerCopiedCode = code; } } }));
    await codeBlock.getByRole("button", { name: "Copy", exact: true }).click();
    assert.equal(await consumerPage.evaluate(() => window.consumerCopiedCode), 'const world = "Minecraft";');
    const steve = consumerPage.getByRole("group", { name: "Steve preview", exact: true });
    const alex = consumerPage.getByRole("group", { name: "Alex preview", exact: true });
    const webgl = [];
    for (const [index, preview] of [steve, alex].entries()) {
      await preview.scrollIntoViewIfNeeded();
      await preview.locator('canvas').waitFor({ state: "visible" });
      await consumerPage.waitForFunction((label) => document.querySelector(`[aria-label="${label}"]`)?.getAttribute("data-ready") === "true", await preview.getAttribute("aria-label"));
      await preview.focus();
      const before = await preview.locator("canvas").screenshot();
      await preview.press("ArrowRight");
      const rotated = await preview.locator("canvas").screenshot();
      assert.notEqual(hash(before), hash(rotated), "Keyboard rotation repaints the actual WebGL canvas");
      await preview.press("Home");
      const reset = await preview.locator("canvas").screenshot();
      assert.equal(hash(reset), hash(before), "Home restores the default WebGL pose");
      await writeFile(path.join(output, `${framework}-player-${index}.png`), reset);
      webgl.push({ model: await preview.getAttribute("data-model"), initialSha256: hash(before), rotatedSha256: hash(rotated), resetSha256: hash(reset) });
    }
    assert.equal(await steve.getAttribute("data-model"), "wide");
    assert.equal(await alex.getAttribute("data-model"), "slim");
    const map = consumerPage.getByRole("region", { name: "Consumer map", exact: true });
    await map.getByRole("button", { name: "Camp", exact: true }).click();
    assert.equal(await map.locator("output").textContent(), "Camp");
    const sign = consumerPage.getByRole("group", { name: "Standing sign", exact: true });
    await sign.scrollIntoViewIfNeeded();
    await sign.locator("canvas").waitFor({ state: "visible" });
    await consumerPage.waitForFunction(() => document.querySelector('[aria-label="Standing sign"] canvas')?.getAttribute("data-ready") === "true");
    const trading = consumerPage.getByRole("region", { name: "Consumer trading", exact: true });
    await expect.poll(() => trading.locator("img").evaluateAll((images) => images.length > 0 && images.every((image) => image.complete && image.naturalWidth === 16))).toBe(true);
    await trading.getByRole("button", { name: "Trade for Bread", exact: true }).click();
    await expect(trading.getByRole("status")).toHaveText("1 trades completed");
    const resizable = consumerPage.getByRole("region", { name: "Consumer resizable", exact: true });
    const handle = resizable.getByRole("separator", { name: "Resize inventory panels" });
    await handle.focus();
    await handle.press("ArrowRight");
    await expect.poll(async () => Number(await handle.getAttribute("aria-valuenow"))).toBeGreaterThan(50);
    await resizable.getByRole("button", { name: "Reset panels", exact: true }).click();
    await expect(handle).toHaveAttribute("aria-valuenow", "50");
    const sidebar = consumerPage.getByRole("region", { name: "Consumer sidebar", exact: true });
    const sidebarTrigger = sidebar.getByRole("button", { name: "Toggle world navigation" });
    await sidebarTrigger.click();
    await expect(sidebar.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed");
    await consumerPage.setViewportSize({ width: 390, height: 844 });
    await sidebarTrigger.click();
    const sidebarDialog = consumerPage.getByRole("dialog", { name: "Sidebar", exact: true });
    await expect(sidebarDialog.getByRole("link", { name: "Worlds", exact: true })).toBeVisible();
    await consumerPage.screenshot({ path: path.join(output, `${framework}-sidebar-mobile.png`) });
    await consumerPage.keyboard.press("Escape");
    await expect(sidebarDialog).not.toBeVisible();
    await consumerPage.setViewportSize({ width: 1280, height: 900 });
    const table = consumerPage.getByRole("region", { name: "Consumer data-table", exact: true });
    await expect(table.getByLabel("World selection")).toContainText("Page 1 of 2");
    await table.getByRole("button", { name: "Next", exact: true }).click();
    await expect(table.getByLabel("World selection")).toContainText("Page 2 of 2");
    await table.getByRole("textbox", { name: "Filter worlds", exact: true }).fill("Grasslands");
    await table.getByRole("row").filter({ hasText: "Grasslands" }).click();
    await expect(table.getByLabel("World selection")).toContainText("1 selected");
    await table.getByRole("textbox", { name: "Filter worlds", exact: true }).fill("missing world");
    await expect(table.getByRole("cell", { name: "No results.", exact: true })).toBeVisible();
    const datePicker = consumerPage.getByRole("region", { name: "Consumer date-picker", exact: true });
    await datePicker.getByRole("button", { name: "Pick a day", exact: true }).click();
    const datePopup = consumerPage.locator('[data-slot="date-picker-content"]');
    await datePopup.getByRole("button", { name: /October 15.*2026/ }).click();
    await expect(datePicker.getByRole("button", { name: "October 15th, 2026", exact: true })).toBeVisible();
    await expect(datePopup).toBeVisible();
    await consumerPage.keyboard.press("Escape");
    await expect(datePopup).toHaveCount(0);
    const message = consumerPage.getByRole("region", { name: "Consumer message-scroller", exact: true });
    const viewport = message.getByLabel("Player chat", { exact: true });
    await message.getByRole("button", { name: "First", exact: true }).click();
    await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBe(0);
    await message.getByRole("textbox", { name: "Message text", exact: true }).fill("Bring torches.");
    await message.getByRole("button", { name: "Send", exact: true }).click();
    await expect(message.getByLabel("Message count")).toHaveText("13 messages");
    await message.getByRole("button", { name: "Latest", exact: true }).click();
    await expect(message.getByRole("log")).toContainText("Bring torches.");
    await expect.poll(() => viewport.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThan(2);
    const alert = consumerPage.getByRole("region", { name: "Consumer alert-dialog", exact: true });
    const alertTrigger = alert.getByRole("button", { name: "Delete world", exact: true });
    await alertTrigger.click();
    const alertDialog = consumerPage.getByRole("alertdialog", { name: "Delete this world?", exact: true });
    await alertDialog.getByRole("button", { name: "Yes", exact: true }).click();
    await expect(alertDialog).toHaveCount(0);
    await expect(alert.getByLabel("Confirmed deletions")).toHaveText("1 confirmed");
    await expect(alertTrigger).toBeFocused();
    const command = consumerPage.getByRole("region", { name: "Consumer command", exact: true });
    const commandTrigger = command.getByRole("button", { name: "Open command palette", exact: true });
    await commandTrigger.click();
    const commandDialog = consumerPage.getByRole("dialog", { name: "World commands", exact: true });
    await commandDialog.getByRole("option", { name: "Save world", exact: true }).click();
    await expect(commandDialog).toHaveCount(0);
    await expect(command.getByLabel("Palette selection")).toHaveText("save");
    await expect(commandTrigger).toBeFocused();
    for (const [name, chartName] of [["fps", "Frame timing"], ["profiler", "Browser share"], ["metric", "API response time"]]) {
      const chart = consumerPage.getByRole("region", { name: `Consumer ${name}`, exact: true });
      await chart.scrollIntoViewIfNeeded();
      await expect(chart.getByRole("application", { name: chartName, exact: true })).toBeVisible();
      await expect.poll(() => chart.locator("svg").count()).toBeGreaterThan(0);
      await chart.screenshot({ path: path.join(output, `${framework}-${name}.png`) });
    }
    await consumerPage.screenshot({ path: path.join(output, `${framework}-runtime.png`), fullPage: true });
    assert.deepEqual(errors, []);
    report.consumers.push({
      framework,
      directory: consumer,
      physicalDirectory: await realpath(consumer),
      dependencyIdentity,
      installedBytes,
      prebuildInputs,
      buildOutput: built.buildOutput,
      inputs: await directoryIdentity(consumer),
      webgl,
      actualSha256: hash(actualBytes),
      packageSha256: hash(await readFile(path.join(consumer, "package.json"))),
      lockSha256: hash(await readFile(path.join(consumer, "bun.lock"))),
      items: manifests.map((manifest) => ({
        name: manifest.name,
        files: manifest.files.length,
        dependencies: manifest.dependencies,
      })),
      downloadedFiles: Object.fromEntries(files),
      typecheck: "passed",
      build: "passed",
      render: {
        differentPixels,
        totalPixels: actual.width * actual.height,
        referenceSha256: hash(referenceBytes),
      },
      runtime: { buttonNativePixels: "passed", formValidationSaveAndReset: "passed", codeBlockExactClipboard: "passed", playerPreviewWideAndSlimWebGL2: "passed", mapMarkerCallback: "passed", signCanvas: "passed", tradingCallback: "passed", resizableV4KeyboardReset: "passed", sidebarDesktopAndMobilePortal: "passed", dataTableV9PageFilterSelection: "passed", datePickerPortalSelection: "passed", messageScrollerAppendAndHistory: "passed", alertDialogConfirmAndFocus: "passed", commandPaletteSelectAndFocus: "passed", chartFpsProfilerAndMetric: "passed" },
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
  assert.deepEqual(await sourceIdentity(root), source, "Source remained frozen during consumer verification");
  report.artifacts = await directoryIdentity(output, new Set(["report.json", "prepared.json", "collection-report.json"]));
  report.status = phase === "prepare" ? "prepared" : "passed";
  }
} catch (error) {
  report.status = "failed";
  report.error = String(error.stack ?? error);
  throw error;
} finally {
  if (server) {
    server.kill();
    await server.exited;
  }
  await browser?.close();
  await writeFile(
    phase === "prepare" ? preparedFile : path.join(output, phase === "collect" ? "collection-report.json" : "report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(
    JSON.stringify({ status: report.status, output, error: report.error })
  );
}
