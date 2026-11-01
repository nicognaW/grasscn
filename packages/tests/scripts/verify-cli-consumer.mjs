import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertExternalProject, assertIndependentDependencies, assertConsumerPortAvailable, consumerEnvironment, directoryIdentity, sha256 } from "./consumer-boundary.mjs";
import { fetchPublicRegistry, assertRegistryInstallation } from "./consumer-registry.mjs";
import { installedDependencyIdentity } from "./dependency-identity.mjs";
import { sourceIdentity, assertProductionSource, productionBuildIdentity } from "./next-production.mjs";

// Run only under the shared resource guard with an already owned production website.
// This is deliberately separate from manual projects: shadcn is the only Grasscn writer here.
const root = process.cwd();
const phase = process.env.GRASSCN_CLI_CONSUMER_PHASE;
assert(["prepare", "runtime"].includes(phase), "Use prepare (4%) then runtime (10%) under the shared guard");
assert.equal(Bun.version, "1.4.4");
const origin = process.env.GRASSCN_PREVIEW_URL;
assert(origin && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin), "Owned production preview origin required");
const source = await sourceIdentity(root);
const websiteIdentity = JSON.parse(process.env.GRASSCN_WEBSITE_IDENTITY ?? "null");
assertProductionSource(websiteIdentity, source);
assert(websiteIdentity.buildId && websiteIdentity.outputSha256, "Production build identity required");
assert.equal((await productionBuildIdentity({ source })).outputSha256, websiteIdentity.outputSha256, "Website production output must remain source-bound");
const outputRoot = path.join(root, ".pixel-perfect-test", "cli-consumers");
const output = process.env.GRASSCN_CLI_CONSUMER_DIRECTORY ? path.resolve(process.env.GRASSCN_CLI_CONSUMER_DIRECTORY) : path.join(outputRoot, String(Date.now()));
assert(output.startsWith(outputRoot + path.sep), "CLI artifacts must stay under cli-consumers");
await mkdir(output, { recursive: true });
const preparedFile = path.join(output, "prepared.json");
let prepared;
if (phase === "runtime") {
  prepared = JSON.parse(await readFile(preparedFile, "utf8"));
  assert.equal(prepared.status, "prepared");
  assert.deepEqual(prepared.source, source);
  assert.deepEqual(prepared.websiteIdentity, websiteIdentity);
}
try { await readFile(phase === "prepare" ? preparedFile : path.join(output, "report.json")); assert.fail("CLI phase requires fresh execution; old reports cannot resume"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const consumer = prepared?.consumer ?? await mkdtemp(path.join(tmpdir(), "grasscn-cli-"));
const git = Bun.spawn(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: root, stdout: "pipe", stderr: "inherit" });
const commonDirectory = (await new Response(git.stdout).text()).trim();
assert.equal(await git.exited, 0);
await assertExternalProject(consumer, [root, path.dirname(commonDirectory)]);
const report = { ...prepared, status: "incomplete", phase, source, website: origin, websiteIdentity, consumer, bun: Bun.version, steps: [] };
report.environment = { platform: process.platform, arch: process.arch, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, locale: Intl.DateTimeFormat().resolvedOptions().locale };
if (prepared) assert.deepEqual(prepared.environment, report.environment, "CLI consumer environment unchanged");
const write = async (filename, contents) => {
  const destination = path.join(consumer, filename);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, typeof contents === "string" ? contents : JSON.stringify(contents, null, 2));
};
async function run(args) {
  const child = Bun.spawn([process.execPath, ...args], { cwd: consumer, stdout: "inherit", stderr: "inherit", env: consumerEnvironment() });
  assert.equal(await child.exited, 0, `External CLI consumer command: ${args.join(" ")}`);
}
let server, browser;
try {
  if (phase === "prepare") {
  await write("package.json", {
    name: "grasscn-cli-consumer", private: true, type: "module", packageManager: "bun@1.4.4",
    dependencies: { react: "19.3.1", "react-dom": "19.3.1", clsx: "2.1.1", "tailwind-merge": "3.7.0", tailwindcss: "4.3.3" },
    devDependencies: { vite: "8.3.5", "@tailwindcss/vite": "4.3.3", shadcn: "4.23.0", typescript: "7.0.2", "@types/react": "19.3.0", "@types/react-dom": "19.3.0", "@types/node": "26.6.5" },
  });
  const settings = {
    $schema: "https://ui.shadcn.com/schema.json", style: "base-nova", rsc: false, tsx: true,
    tailwind: { config: "", css: "src/globals.css", baseColor: "neutral", cssVariables: true },
    aliases: { components: "@/components", ui: "@/components/ui", hooks: "@/hooks", lib: "@/lib", utils: "@/lib/utils" },
  };
  await write("components.json", settings);
  await write("src/lib/utils.ts", 'import{clsx,type ClassValue}from"clsx";import{twMerge}from"tailwind-merge";export function cn(...inputs:ClassValue[]){return twMerge(clsx(inputs))}');
  await write("src/globals.css", '@import "tailwindcss";body{margin:0;background:#202020}*{box-sizing:border-box}');
  await write("tsconfig.json", { compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "Bundler", jsx: "react-jsx", strict: true, noEmit: true, skipLibCheck: true, esModuleInterop: true, resolveJsonModule: true, paths: { "@/*": ["./src/*"] }, types: ["vite/client"] }, include: ["src", "vite.config.ts"] });
  await write("vite.config.ts", 'import{defineConfig}from"vite";import tailwindcss from"@tailwindcss/vite";import{fileURLToPath}from"node:url";export default defineConfig({plugins:[tailwindcss()],resolve:{alias:{"@":fileURLToPath(new URL("./src",import.meta.url))}}});');
  await write("index.html", '<html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>');
  await write("src/main.tsx", 'import{createRoot}from"react-dom/client";import{Button}from"@/components/ui/button";import"./globals.css";createRoot(document.getElementById("root")!).render(<Button data-subject>Button</Button>);');
  await run(["install", "--ignore-scripts", "--network-concurrency", "1"]);
  const registry = JSON.parse(await readFile(path.join(root, "apps/web/registry.json"), "utf8"));
  assert(new Set(registry.items.map((item) => item.name)).size === registry.items.length);
  const payloads = await fetchPublicRegistry(origin, registry.items, root);
  report.registryPayloads = Object.fromEntries([...payloads].map(([name, value]) => [name, { url: value.url, sha256: value.sha256 }]));
  report.currentItemNames = registry.items.map((item) => item.name).sort();
  const consumerRequire = createRequire(path.join(consumer, "package.json"));
  const cliPackageFile = consumerRequire.resolve("shadcn/package.json");
  const cliPackage = JSON.parse(await readFile(cliPackageFile, "utf8"));
  const cli = path.resolve(path.dirname(cliPackageFile), typeof cliPackage.bin === "string" ? cliPackage.bin : cliPackage.bin.shadcn);
  report.cli = { version: cliPackage.version, path: cli, packageSha256: sha256(await readFile(cliPackageFile)) };
  await run(["--bun", cli, "add", ...[...payloads.values()].map((entry) => entry.url), "--yes", "--overwrite", "--cwd", consumer]);
  report.steps.push("Actual shadcn CLI installed every current item URL from the owned Next production origin");
  report.installation = await assertRegistryInstallation(payloads, consumer, settings);
  report.dependencyIdentity = await assertIndependentDependencies(consumer);
  report.installedBytes = installedDependencyIdentity(consumer);
  assert(report.installedBytes);
  await run(["--bun", "node_modules/typescript/bin/tsc", "--noEmit"]);
  report.steps.push("All installed TypeScript files typecheck in the external consumer");
  await run(["--bun", "node_modules/vite/bin/vite.js", "build"]);
  report.steps.push("Independent Vite production build passed");
  report.inputs = await directoryIdentity(consumer);
  report.buildOutput = await directoryIdentity(path.join(consumer, "dist"));
  report.artifacts = await directoryIdentity(output, new Set(["report.json", "prepared.json"]));
  assert.deepEqual(await sourceIdentity(root), source, "Source remained frozen during CLI installation/build");
  report.status = "prepared";
  } else {
  assert.deepEqual(await directoryIdentity(consumer), prepared.inputs, "CLI consumer prepared inputs unchanged");
  assert.deepEqual(await directoryIdentity(path.join(consumer, "dist")), prepared.buildOutput, "CLI consumer production bytes unchanged");
  assert.deepEqual(await assertIndependentDependencies(consumer), prepared.dependencyIdentity, "CLI dependency resolutions unchanged");
  assert.deepEqual(installedDependencyIdentity(consumer), prepared.installedBytes, "CLI installed dependency bytes unchanged");
  const port = 5198;
  await assertConsumerPortAvailable(port);
  server = Bun.spawn([process.execPath, "--bun", "node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: consumer, stdout: "inherit", stderr: "inherit", env: consumerEnvironment() });
  for (let attempt = 0; ; attempt++) {
    assert(server.exitCode === null, "Owned CLI consumer host exited before readiness");
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) break; } catch {}
    assert(attempt < 120, "CLI consumer production host readiness timeout");
    await Bun.sleep(500);
  }
  const observerRequire = createRequire(path.join(root, "packages/tests/package.json"));
  const { chromium } = observerRequire("@playwright/test");
  const { PNG } = observerRequire("pngjs");
  browser = await chromium.launch({ headless: true, channel: "msedge" });
  report.browserVersion = browser.version();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}`);
  const subject = page.getByRole("button", { name: "Button", exact: true });
  await subject.waitFor();
  await page.mouse.move(1000, 800);
  const actualBytes = await subject.screenshot();
  await writeFile(path.join(output, "button-actual.png"), actualBytes);
  const catalogue = JSON.parse(await readFile(path.join(root, "packages/tests/scripts/browser-base-cases.json"), "utf8"));
  assert(catalogue.cases.some((entry) => entry.file === "pixels.spec.ts" && entry.title === "vanilla pixels: normal-w200-s2.png"), "Existing Button case must remain Base");
  const manifest = JSON.parse(await readFile(path.join(root, "packages/tests/tests/reference/manifest.json"), "utf8"));
  const nativeCase = manifest.cases.find((entry) => entry.name === "normal-w200-s2.png");
  const referenceBytes = await readFile(path.join(root, "packages/tests/tests/reference/captures", nativeCase.name));
  assert.equal(sha256(referenceBytes), nativeCase.sha256);
  const actual = PNG.sync.read(actualBytes), expected = PNG.sync.read(referenceBytes);
  const compare = (left, right) => {
    assert.deepEqual([left.width, left.height], [right.width, right.height]);
    let mismatches = 0;
    const diff = new PNG({ width: left.width, height: left.height });
    for (let offset = 0; offset < left.data.length; offset += 4) if (!left.data.subarray(offset, offset + 4).equals(right.data.subarray(offset, offset + 4))) { mismatches++; diff.data.set([255, 0, 0, 255], offset); }
    return { mismatches, diff };
  };
  const corrupted = PNG.sync.read(referenceBytes); corrupted.data[0] ^= 1;
  assert.equal(compare(corrupted, expected).mismatches, 1, "Actual comparator detects one-pixel mutation");
  const comparison = compare(actual, expected);
  await writeFile(path.join(output, "button-diff.png"), PNG.sync.write(comparison.diff));
  report.pixels = { referenceCase: nativeCase.name, referenceSha256: nativeCase.sha256, actualSha256: sha256(actualBytes), mismatches: comparison.mismatches, totalPixels: actual.width * actual.height, onePixelCorruptionDetected: true };
  assert.equal(comparison.mismatches, 0);
  assert.deepEqual(errors, []);
  report.inputs = await directoryIdentity(consumer);
  report.artifacts = await directoryIdentity(output, new Set(["report.json", "prepared.json"]));
  assert.deepEqual(await sourceIdentity(root), source, "Source remained frozen throughout CLI acceptance");
  report.status = "passed";
  }
} catch (error) { report.status = "failed"; report.error = String(error.stack ?? error); throw error; }
finally {
  if (browser) await browser.close();
  if (server) { server.kill(); await server.exited; }
  await writeFile(phase === "prepare" ? preparedFile : path.join(output, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, output, error: report.error }));
}
