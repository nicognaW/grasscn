import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";

import { installedDependencyIdentity } from "@grasscn/tests/dependency-identity";

import {
  assertExternalProject,
  assertIndependentDependencies,
  consumerEnvironment,
  directoryIdentity,
} from "./consumer-boundary";
import { consumerBuildIdentity } from "./consumer-build-identity";
import type * as ConsumerValidationTypes from "./consumer-validation-types";
import { encodeConsumerFile } from "./consumer-validation-types";

type PreparedManualConsumer = ConsumerValidationTypes.PreparedManualConsumer;

export interface PreparedConsumerBuild extends PreparedManualConsumer {
  build: "passed";
  buildCommand: string[];
  buildSettings: {
    bun: string;
    bundler: string;
    cpus?: number;
    smol?: boolean;
  };
  typecheck: "passed";
}

interface PrepareManualConsumerInput {
  commonDirectory: string;
  consumer: string;
  copiedExamples: Record<string, string>;
  dependencies: Record<string, string>;
  framework: string;
  manifests: ConsumerValidationTypes.ManualManifest[];
  origin: string;
  root: string;
}

/** @param {string | Uint8Array} bytes - Source bytes to hash. */
const hash = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

type GeneratedConsumerJson =
  | null
  | boolean
  | number
  | string
  | GeneratedConsumerJson[]
  | { [key: string]: GeneratedConsumerJson };

type GeneratedConsumerFile = string | { [key: string]: GeneratedConsumerJson };

/** @param {string} file - Absolute candidate file path. */
const exists = async (file: string) => {
  try {
    const info = await stat(file);

    return info.isFile();
  } catch {
    return false;
  }
};

/** @param {string[]} args @param {string} cwd */
const run = async (args: string[], cwd: string) => {
  const child = Bun.spawn(["bun", ...args], {
    cwd,
    env: consumerEnvironment(),
    stderr: "inherit",
    stdout: "inherit",
  });

  assert.equal(await child.exited, 0, `Bun ${args.join(" ")}`);
};

/**
 * @typedef {object} PrepareManualConsumerInput
 * @property {string} commonDirectory - Shared Git directory excluded from independent consumer roots.
 * @property {string} consumer - Physically separate framework project directory.
 * @property {Record<string, string>} copiedExamples - Complete example source collected from the public documentation.
 * @property {Record<string, string>} dependencies - Package versions declared by the collected public manifests.
 * @property {string} framework - Framework currently visited by the sequential consumer owner.
 * @property {ConsumerValidationTypes.ManualManifest[]} manifests - Validated public file inventories in collection order.
 * @property {string} origin - Owned production documentation origin.
 * @property {string} root - Source workspace excluded from installed consumer resolution.
 */
/** Prepare, install, typecheck and build one isolated consumer from the collected public inputs.
 * @param {PrepareManualConsumerInput} input - Collected public inputs and the independent framework destination.
 * @returns {Promise<PreparedConsumerBuild>} Prepared source, dependency and production-output identities.
 */
export const prepareManualConsumer = async (
  input: PrepareManualConsumerInput
): Promise<PreparedConsumerBuild> => {
  const {
    commonDirectory,
    consumer,
    copiedExamples,
    dependencies,
    framework,
    manifests,
    origin,
    root,
  } = input;

  await mkdir(path.join(consumer, "src/lib"), { recursive: true });
  await assertExternalProject(consumer, [root, path.dirname(commonDirectory)]);

  /** @param {string} name @param {GeneratedConsumerFile} contents */
  const write = async (name: string, contents: GeneratedConsumerFile) => {
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
  /** @type {Map<string, string>} */
  const files = new Map<string, string>();

  const downloadInputs = await Promise.allSettled(
    manifests.map(
      async (manifest) =>
        await Promise.allSettled(
          manifest.files.map(async (file) => {
            assert.ok(
              !file.destination.includes("..") &&
                !path.isAbsolute(file.destination)
            );
            /** @type {Response} */
            const response: Response = await fetch(
              `${origin}${file.url}?download=1`
            );
            assert.ok(response.ok, `Download complete ${file.destination}`);
            assert.equal(
              response.headers.get("x-grasscn-destination"),
              file.destination
            );
            const bytes = Buffer.from(await response.arrayBuffer());

            return { bytes, file };
          })
        )
    )
  );

  for (const manifestInput of downloadInputs) {
    if (manifestInput.status === "rejected") {
      throw manifestInput.reason;
    }

    for (const fileInput of manifestInput.value) {
      if (fileInput.status === "rejected") {
        throw fileInput.reason;
      }

      const { bytes, file } = fileInput.value;
      const previous = files.get(file.destination);

      if (previous !== undefined && previous !== "") {
        assert.equal(hash(bytes), previous, "Overlapping manual files agree");
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
  const dependencyIdentity = await assertIndependentDependencies(consumer);
  const installedBytes = installedDependencyIdentity(consumer);
  assert.ok(
    installedBytes,
    "Consumer installed dependency byte identity required"
  );
  const prebuildInputs = await directoryIdentity(consumer);

  if (framework === "next") {
    await run(
      ["--bun", "node_modules/next/dist/bin/next", "typegen"],
      consumer
    );
  }

  await run(["--bun", "node_modules/typescript/bin/tsc", "--noEmit"], consumer);

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

  const buildOutput = await consumerBuildIdentity(
    path.join(consumer, framework === "vite" ? "dist" : ".next"),
    framework
  );

  /** @type {{bun: string; bundler: string; cpus?: number; smol?: boolean}} */
  const buildSettings: PreparedConsumerBuild["buildSettings"] = {
    bun: Bun.version,
    bundler: framework === "next" ? "webpack" : "vite",
  };

  if (framework === "next") {
    buildSettings.cpus = 1;
    buildSettings.smol = true;
  }

  return {
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
  };
};
