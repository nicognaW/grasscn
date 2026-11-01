import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

// Run through the workspace resource guard with an owned production website already available.
// These consumers start empty: no CLI-installed Grasscn files, developer aliases or fixture imports.
const root = process.cwd();
const origin = process.env.GRASSCN_PREVIEW_URL;
assert(
  origin && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin),
  "Set the owned production GRASSCN_PREVIEW_URL"
);
const consumerRoot = path.join(root, ".pixel-perfect-test", "manual-consumers");
const output = process.env.GRASSCN_MANUAL_CONSUMER_DIRECTORY
  ? path.resolve(process.env.GRASSCN_MANUAL_CONSUMER_DIRECTORY)
  : path.join(consumerRoot, String(Date.now()));
assert(
  output.startsWith(consumerRoot + path.sep),
  "Resume only an independently created manual-consumer fixture"
);
const exists = async (file) => {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
};
await mkdir(output, { recursive: true });
const previousReport = (await exists(path.join(output, "report.json")))
  ? JSON.parse(await readFile(path.join(output, "report.json"), "utf8"))
  : undefined;
const report = {
  status: "incomplete",
  website: origin,
  bun: Bun.version,
  consumers: [],
};
const revision = Bun.spawn(["git", "rev-parse", "HEAD"], {
  cwd: root,
  stdout: "pipe",
  stderr: "inherit",
});
report.sourceCommit = (await new Response(revision.stdout).text()).trim();
assert.equal(await revision.exited, 0);
assert.equal(Bun.version, "1.4.4");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function run(args, cwd) {
  const child = Bun.spawn(["bun", ...args], {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  assert.equal(await child.exited, 0, `Bun ${args.join(" ")}`);
}
const sourceRequire = createRequire(
  path.join(root, "packages/tests/package.json")
);
const { chromium } = sourceRequire("@playwright/test");
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
    path.join(root, "packages/pixel-perfect/src/selection/base-cases.json"),
    "utf8"
  )
);
assert(
  catalogue.cases.some(
    (entry) =>
      entry.file === "button/pixels.spec.ts" &&
      entry.title === "vanilla pixels: normal-w200-s2.png"
  )
);
const browser = await chromium.launch({ headless: true, channel: "msedge" });
report.browserVersion = browser.version();
let server;
try {
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
  const manifests = [];
  for (const name of ["button", "code-block", "form"]) {
    const response = await fetch(`${origin}/api/installation/${name}`);
    assert(response.ok, `Public ${name} inventory available`);
    manifests.push(await response.json());
  }
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
    const consumer = path.join(output, framework);
    await mkdir(path.join(consumer, "src/lib"), { recursive: true });
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
    const files = new Map();
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
    if (await exists(path.join(consumer, "src/button-example.tsx")))
      assert.equal(
        hash(await readFile(path.join(consumer, "src/button-example.tsx"))),
        hash(exampleCode),
        "Resume requires unchanged copied public example"
      );
    else await write("src/button-example.tsx", exampleCode);
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
        'import {createRoot} from "react-dom/client";import ButtonExample from "./button-example";import "./globals.css";import "@/components/ui/code-block";import "@/components/form";createRoot(document.getElementById("root")!).render(<ButtonExample/>);'
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
        'import ButtonExample from "../button-example";import "@/components/ui/code-block";import "@/components/form";export default function Page(){return <ButtonExample/>}'
      );
    }
    const cached = previousReport?.consumers?.find(
      (entry) => entry.framework === framework
    );
    if (
      cached &&
      previousReport.bun === Bun.version &&
      previousReport.browserVersion === report.browserVersion &&
      previousReport.publicManifestSha256 === report.publicManifestSha256 &&
      previousReport.exampleSha256 === report.exampleSha256 &&
      cached.packageSha256 ===
        hash(await readFile(path.join(consumer, "package.json"))) &&
      (await exists(path.join(consumer, "bun.lock"))) &&
      cached.lockSha256 ===
        hash(await readFile(path.join(consumer, "bun.lock"))) &&
      cached.actualSha256 ===
        hash(
          await readFile(path.join(output, `${framework}-button-actual.png`))
        )
    ) {
      assert.deepEqual(cached.downloadedFiles, Object.fromEntries(files));
      report.consumers.push({
        ...cached,
        reusedAfterSourceAndEnvironmentVerification: true,
      });
      await writeFile(
        path.join(output, "report.json"),
        JSON.stringify(report, null, 2)
      );
      continue;
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
    if (framework === "next")
      await run(
        ["--bun", "node_modules/next/dist/bin/next", "typegen"],
        consumer
      );
    await run(
      ["--bun", "node_modules/typescript/bin/tsc", "--noEmit"],
      consumer
    );
    await run(
      [
        "--bun",
        framework === "vite"
          ? "node_modules/vite/bin/vite.js"
          : "node_modules/next/dist/bin/next",
        "build",
      ],
      consumer
    );
    const port = framework === "vite" ? 5188 : 5189;
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
    });
    for (let attempt = 0; ; attempt++) {
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
        "packages/pixel-perfect/tests/reference/captures/normal-w200-s2.png"
      )
    );
    const nativeManifest = JSON.parse(
      await readFile(
        path.join(root, "packages/pixel-perfect/tests/reference/manifest.json"),
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
    assert.deepEqual(errors, []);
    report.consumers.push({
      framework,
      directory: consumer,
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
  report.status = "passed";
} catch (error) {
  report.error = String(error.stack ?? error);
  throw error;
} finally {
  if (server) {
    server.kill();
    await server.exited;
  }
  await browser.close();
  await writeFile(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(
    JSON.stringify({ status: report.status, output, error: report.error })
  );
}
