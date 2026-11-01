import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  repoRoot,
  referenceFile as ownedReferenceFile,
} from "@grasscn/tests/paths";

export * from "@grasscn/tests/paths";

export const pixelPerfectRoot = path.resolve(
  fileURLToPath(new URL("../", import.meta.url))
);

export const referenceRoot = path.join(pixelPerfectRoot, "tests/reference");
export const pixelPerfectTestRoot = path.join(repoRoot, ".pixel-perfect-test");

export const pixelPerfectFile = (name: string) =>
  path.resolve(pixelPerfectRoot, name);

export function referenceFile(name: string, root = referenceRoot) {
  return ownedReferenceFile(name, root);
}
