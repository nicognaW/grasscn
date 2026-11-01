import fs from "node:fs";
import path from "node:path";

import {
  fixtureFile,
  referenceFile as sharedReferenceFile,
  repoRoot,
  testRoot,
  webFile,
} from "@grasscn/tests/paths";
import { pixelPerfectRoot, referenceFile } from "@ppt/paths";

// Retained evidence records use the pre-package layout. Resolve those names only
// at evidence-reading boundaries; an external evidence fixture stays isolated.
export function evidenceFile(name: string, root = repoRoot) {
  if (path.isAbsolute(name)) {
    return name;
  }

  const base = path.resolve(root);

  if (![repoRoot, testRoot, pixelPerfectRoot].includes(base)) {
    return path.resolve(base, name);
  }

  const logical = name.replaceAll("\\", "/");

  if (
    logical === "registry.json" ||
    logical === "registry" ||
    logical.startsWith("registry/")
  ) {
    return webFile(logical);
  }

  if (logical === "preview" || logical.startsWith("preview/")) {
    return webFile(logical.slice("preview".length).replace(/^\//, ""));
  }

  if (logical === "tests/fixture" || logical.startsWith("tests/fixture/")) {
    return fixtureFile(
      logical.slice("tests/fixture".length).replace(/^\//, "")
    );
  }

  if (logical === "tests/reference" || logical.startsWith("tests/reference/")) {
    const relative = logical.slice("tests/reference".length).replace(/^\//, "");
    const shared = sharedReferenceFile(relative);

    return fs.existsSync(shared) ? shared : referenceFile(relative);
  }

  return path.resolve(base, logical);
}
