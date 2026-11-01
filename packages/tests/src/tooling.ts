import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { testRoot } from "@tests/paths";

export function packageBin(name: string, binary = name, from = testRoot) {
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
        JSON.parse(fs.readFileSync(candidate, "utf-8")).name === name
      ) {
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

  const manifest = JSON.parse(fs.readFileSync(location, "utf-8"));

  const bins =
    typeof manifest.bin === "string" ? { [name]: manifest.bin } : manifest.bin;

  const target = bins?.[binary ?? name] ?? Object.values(bins ?? {})[0];

  if (typeof target !== "string") {
    throw new Error(`Package ${name} does not expose ${binary ?? name}`);
  }

  return path.resolve(path.dirname(location), target);
}
