// Verifies a shadcn CLI install of the fireworks registry item in an
// external consumer: every item file arrived unchanged beyond CLI
// transforms, the consumer typechecks against the installed types, and the
// installed textures and sounds decode to the original Minecraft bytes
// recorded in the asset provenance. Writes an installation receipt.
//
// Usage: bun verify-fireworks-installed.ts <consumer dir> <receipt.json> <shadcn add command>
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { referenceFile, webFile } from "@grasscn/tests/paths";
import { z } from "zod";

const [consumerArgument, receiptArgument, commandArgument] =
  process.argv.slice(2);

if (
  consumerArgument === undefined ||
  receiptArgument === undefined ||
  commandArgument === undefined
) {
  throw new Error(
    "Usage: bun verify-fireworks-installed.ts <consumer dir> <receipt.json> <shadcn add command>"
  );
}

const consumer = path.resolve(consumerArgument);
const ITEM = "fireworks";

const DATA_URI =
  /^data:(?:image\/png|audio\/ogg);base64,(?<payload>[A-Za-z0-9+/=]+)$/u;

const LEADING_LINE_COMMENTS = /^(?:\/\/[^\n]*\n\s*)+/u;
const BLOCK_COMMENTS = /\/\*[\s\S]*?\*\//gu;
const USE_CLIENT = /^["']use client["'];?\s*/u;

const hash = (algorithm: "sha1" | "sha256", bytes: Uint8Array | string) =>
  createHash(algorithm).update(bytes).digest("hex");

const registry = z
  .object({
    items: z.array(
      z.object({
        files: z.array(z.object({ path: z.string() })),
        name: z.string(),
      })
    ),
  })
  .parse(JSON.parse(await readFile(webFile("registry.json"), "utf-8")));

const item = registry.items.find((entry) => entry.name === ITEM);

assert.ok(item !== undefined, `${ITEM} is not a registry item`);

const settings = z
  .object({ rsc: z.boolean() })
  .parse(
    JSON.parse(await readFile(path.join(consumer, "components.json"), "utf-8"))
  );

// The CLI may drop comments and, for non-RSC consumers, "use client".
const canonical = (text: string) => {
  let result = text.replaceAll(BLOCK_COMMENTS, "").trim();

  if (!settings.rsc) {
    result = result.replace(USE_CLIENT, "");
  }

  return result.replace(LEADING_LINE_COMMENTS, "");
};

const installedPath = (file: string) =>
  path.join(consumer, "src/components/ui", path.basename(file));

const files = await Promise.all(
  item.files.map(async (file) => {
    const [source, installed] = await Promise.all([
      readFile(webFile(file.path), "utf-8"),
      readFile(installedPath(file.path), "utf-8"),
    ]);

    assert.equal(
      canonical(installed),
      canonical(source),
      `${path.basename(file.path)} changed beyond CLI transforms`
    );

    return {
      installedSha256: hash("sha256", installed),
      path: path.basename(file.path),
      sourcePath: file.path,
      sourceSha256: hash("sha256", source),
    };
  })
);

const typecheck = spawnSync(
  path.join(consumer, "node_modules/.bin/tsc"),
  ["-p", "."],
  { cwd: consumer, encoding: "utf-8" }
);

assert.equal(
  typecheck.status,
  0,
  `Consumer typecheck failed:\n${typecheck.stdout}${typecheck.stderr}`
);

const typescriptVersion = z
  .object({ version: z.string() })
  .parse(
    JSON.parse(
      await readFile(
        path.join(consumer, "node_modules/typescript/package.json"),
        "utf-8"
      )
    )
  ).version;

const provenance = z
  .object({
    files: z.array(
      z.object({
        export: z.string(),
        key: z.array(z.union([z.string(), z.number()])),
        member: z.string().optional(),
        module: z.string(),
        resource: z.string().optional(),
        sha1: z.string().length(40).optional(),
        sha256: z.string().length(64),
      })
    ),
  })
  .parse(
    JSON.parse(
      await readFile(
        referenceFile("header-star/asset-provenance.json"),
        "utf-8"
      )
    )
  );

const itemPaths = new Set(item.files.map((file) => file.path));

const recorded = provenance.files.filter((entry) =>
  itemPaths.has(entry.module)
);

// Textures (rocket, flash, spark 0-7) and the four near-variant sounds.
assert.equal(recorded.length, 14, "Provenance of the item's asset modules");

// An asset module export maps names to one data URI or a list of them; a
// provenance key is the name, then the list index when there is a list.
const assetExport = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string())])
);

const assetKey = z.union([
  z.tuple([z.string()]),
  z.tuple([z.string(), z.number().int()]),
]);

const lookup = (
  exported: z.infer<typeof assetExport>,
  key: z.infer<typeof assetKey>
) => {
  const [name, index] = key;
  const value = exported[name];

  return index === undefined ? value : z.array(z.string()).parse(value)[index];
};

const assets = await Promise.all(
  recorded.map(async (entry) => {
    const installedModule = z
      .record(z.string(), z.unknown())
      .parse(await import(installedPath(entry.module)));

    const uri = z
      .string()
      .parse(
        lookup(
          assetExport.parse(installedModule[entry.export]),
          assetKey.parse(entry.key)
        )
      );

    const payload = DATA_URI.exec(uri)?.groups?.payload;
    const name = `${entry.export}.${entry.key.join(".")}`;

    assert.ok(payload !== undefined, `${name} is not a data URI`);
    const bytes = Buffer.from(payload, "base64");
    const sha256 = hash("sha256", bytes);

    assert.equal(sha256, entry.sha256, `${name} bytes changed`);

    if (entry.sha1 !== undefined) {
      assert.equal(hash("sha1", bytes), entry.sha1, `${name} SHA-1 changed`);
    }

    return {
      key: name,
      original: entry.member ?? entry.resource,
      sha256,
    };
  })
);

const receipt = {
  assets,
  command: commandArgument,
  consumerRsc: settings.rsc,
  files,
  item: ITEM,
  scope:
    "External consumer outside the repository, installed with the shadcn CLI from the locally built registry. Files, types (useFireworks, launchFireworks, the asset and sound modules) and the embedded textures and near-variant sounds are verified; pixels are verified by the projected-reference PPTs and sound timing by the non-PPT sound checks against the repository source, which the installed files equal beyond CLI transforms.",
  typecheck: { passed: true, typescript: typescriptVersion },
};

await writeFile(
  path.resolve(receiptArgument),
  `${JSON.stringify(receipt, null, 2)}\n`
);

console.log(
  `${ITEM}: ${files.length} installed files and ${assets.length} assets verified`
);
