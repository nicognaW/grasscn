import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = repoRoot;
export const webRoot = path.join(repoRoot, "apps/web");
export const testRoot = path.join(repoRoot, "packages/tests");
export const pixelPerfectRoot = path.join(repoRoot, "packages/pixel-perfect");
export const fixtureRoot = path.join(testRoot, "fixtures/renderer");
export const referenceRoot = path.join(testRoot, "fixtures/reference");
export const pixelPerfectTestRoot = path.join(repoRoot, ".pixel-perfect-test");

// Manifests keep their historical names; moving files does not change provenance.
// Explicit fixture roots are isolated and must never fall back to repository files.
/** @param {string} name - Historical repository-relative path. @param {string} [base] - Owning workspace root. @returns {string} Resolved absolute path. */
export function resolveRepositoryPath(name, base = repoRoot) {
  if (path.isAbsolute(name)) return name;
  if (![repoRoot, testRoot, pixelPerfectRoot].includes(path.resolve(base)))
    return path.resolve(base, name);
  const logical = name.replaceAll("\\", "/");
  if (
    logical === "registry.json" ||
    logical === "registry" ||
    logical.startsWith("registry/")
  )
    return path.resolve(webRoot, logical);
  if (logical === "preview" || logical.startsWith("preview/"))
    return path.resolve(
      webRoot,
      logical.slice("preview".length).replace(/^\//, "")
    );
  if (
    logical === "public" ||
    logical.startsWith("public/") ||
    logical === "dist" ||
    logical.startsWith("dist/")
  )
    return path.resolve(webRoot, logical);
  if (logical === "scripts/serve.mjs") {
    return path.resolve(webRoot, logical);
  }
  if (logical === "tests/fixture" || logical.startsWith("tests/fixture/"))
    return path.resolve(
      fixtureRoot,
      logical.slice("tests/fixture".length).replace(/^\//, "")
    );
  if (logical === "tests/reference" || logical.startsWith("tests/reference/")) {
    const shared = path.resolve(
      referenceRoot,
      logical.slice("tests/reference".length).replace(/^\//, "")
    );
    return fs.existsSync(shared)
      ? shared
      : path.resolve(pixelPerfectRoot, logical);
  }
  if (
    logical === "tests" ||
    logical.startsWith("tests/") ||
    logical === "scripts" ||
    logical.startsWith("scripts/")
  ) {
    const ownFile = path.resolve(base, logical);
    if (
      [testRoot, pixelPerfectRoot].includes(path.resolve(base)) &&
      fs.existsSync(ownFile)
    )
      return ownFile;
    const pixelFile = path.resolve(pixelPerfectRoot, logical);
    return fs.existsSync(pixelFile)
      ? pixelFile
      : path.resolve(testRoot, logical);
  }
  if (logical === "playwright.config.ts" || logical === "vite.config.ts")
    return path.join(pixelPerfectRoot, logical);
  return path.resolve(base, logical);
}

export function packageBin(name, binary, from = testRoot) {
  const require = createRequire(path.join(from, "package.json"));
  let location;
  try {
    location = require.resolve(`${name}/package.json`);
  } catch {
    let folder = path.dirname(require.resolve(name));
    for (;;) {
      const candidate = path.join(folder, "package.json");
      if (
        fs.existsSync(candidate) &&
        JSON.parse(fs.readFileSync(candidate, "utf8")).name === name
      ) {
        location = candidate;
        break;
      }
      const parent = path.dirname(folder);
      if (parent === folder) throw Error(`Cannot locate package ${name}`);
      folder = parent;
    }
  }
  const manifest = JSON.parse(fs.readFileSync(location, "utf8"));
  const bins =
    typeof manifest.bin === "string" ? { [name]: manifest.bin } : manifest.bin;
  const target = bins?.[binary ?? name] ?? Object.values(bins ?? {})[0];
  if (!target) throw Error(`Package ${name} does not expose ${binary ?? name}`);
  return path.resolve(path.dirname(location), target);
}
