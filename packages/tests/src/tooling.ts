import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { testRoot } from "@tests/paths";

interface PackageManifest {
  bin?: string | Record<string, string>;
  name?: string;
}

const isBinaryPath = (value: PackageManifest["bin"]): value is string =>
  typeof value === "string";

export const packageBin = function packageBin(
  name: string,
  binary = name,
  from = testRoot
) {
  const require = createRequire(path.join(from, "package.json"));
  let location: string;

  try {
    location = require.resolve(`${name}/package.json`);
  } catch {
    let folder = path.dirname(require.resolve(name));

    for (;;) {
      const candidate = path.join(folder, "package.json");

      // SAFETY: candidate manifests belong to the installed dependency being resolved; only its declared package name is inspected.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Installed package.json owns this metadata contract.
      const candidateManifest = fs.existsSync(candidate)
        ? // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: installed package.json owns this package-name contract.
          (JSON.parse(fs.readFileSync(candidate, "utf-8")) as PackageManifest)
        : undefined;

      if (candidateManifest?.name === name) {
        location = candidate;
        break;
      }

      const parent = path.dirname(folder);

      if (parent === folder) {
        throw new Error(`Cannot locate package ${name}`);
      }

      folder = parent;
    }
  }

  // SAFETY: location was resolved as the installed package manifest; bin is its standard Node package metadata field.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Consume actual installed package metadata, without changing it.
  const manifest = JSON.parse(
    fs.readFileSync(location, "utf-8")
  ) as PackageManifest;

  const bins = isBinaryPath(manifest.bin)
    ? { [name]: manifest.bin }
    : manifest.bin;

  const target = bins?.[binary ?? name] ?? Object.values(bins ?? {})[0];

  if (!isBinaryPath(target)) {
    throw new Error(`Package ${name} does not expose ${binary ?? name}`);
  }

  return path.resolve(path.dirname(location), target);
};
