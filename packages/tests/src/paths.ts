import path from "node:path";
import { fileURLToPath } from "node:url";

export const testRoot = path.resolve(
  fileURLToPath(new URL("../", import.meta.url))
);

export const repoRoot = path.resolve(testRoot, "../..");
export const repositoryRoot = repoRoot;
export const webRoot = path.join(repoRoot, "apps/web");
export const fixtureRoot = path.join(testRoot, "fixtures/renderer");
export const referenceRoot = path.join(testRoot, "fixtures/reference");

export const repositoryFile = (name: string, root = repoRoot) =>
  path.resolve(root, name);

export const webFile = (name: string) => path.resolve(webRoot, name);

const ownedFile = function ownedFile(root: string, name: string) {
  if (path.isAbsolute(name)) {
    throw new Error("Expected an owner-relative file name");
  }

  const target = path.resolve(root, name);
  const relative = path.relative(path.resolve(root), target);

  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("File escapes its explicit owner");
  }

  return target;
};

export const fixtureFile = (name: string, root = fixtureRoot) =>
  ownedFile(root, name);

export const referenceFile = (name: string, root = referenceRoot) =>
  ownedFile(root, name);

export const registryFile = (
  name: string,
  root = path.join(webRoot, "registry")
) => ownedFile(root, name);

export const testFile = (name: string, root = path.join(testRoot, "tests")) =>
  ownedFile(root, name);
