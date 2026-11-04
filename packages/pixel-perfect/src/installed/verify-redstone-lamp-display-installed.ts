// Verifies a shadcn CLI install of the redstone-lamp-display registry item in
// an external consumer: every item file arrived unchanged beyond CLI
// transforms, the consumer typechecks against the installed types, and the
// installed textures decode to the original Minecraft bytes recorded in the
// asset provenance. Writes an installation receipt.
//
// Usage: bun verify-redstone-lamp-display-installed.ts <consumer dir> <receipt.json> <shadcn add command>
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
    "Usage: bun verify-redstone-lamp-display-installed.ts <consumer dir> <receipt.json> <shadcn add command>"
  );
}

const consumer = path.resolve(consumerArgument);
const ITEM = "redstone-lamp-display";
const DATA_URI = /^data:image\/png;base64,(?<payload>[A-Za-z0-9+/=]+)$/u;
const LEADING_LINE_COMMENTS = /^(?:\/\/[^\n]*\n\s*)+/u;
const BLOCK_COMMENTS = /\/\*[\s\S]*?\*\//gu;
const USE_CLIENT = /^["']use client["'];?\s*/u;

const sha256 = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");

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

const files = await Promise.all(
  item.files.map(async (file) => {
    const name = path.basename(file.path);

    const [source, installed] = await Promise.all([
      readFile(webFile(file.path), "utf-8"),
      readFile(path.join(consumer, "src/components/ui", name), "utf-8"),
    ]);

    assert.equal(
      canonical(installed),
      canonical(source),
      `${name} changed beyond CLI transforms`
    );

    return {
      installedSha256: sha256(installed),
      path: name,
      sourcePath: file.path,
      sourceSha256: sha256(source),
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
        key: z.array(z.union([z.string(), z.number()])),
        member: z.string().optional(),
        module: z.string(),
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

const installedAssets: unknown = await import(
  path.join(consumer, "src/components/ui/minecraft-redstone-lamp-assets.ts")
);

const textures = z
  .object({
    redstoneLampTextures: z.object({ lit: z.string(), unlit: z.string() }),
  })
  .parse(installedAssets).redstoneLampTextures;

const assets = (["lit", "unlit"] as const).map((key) => {
  const recorded = provenance.files.find(
    (entry) =>
      entry.module === "registry/ui/minecraft-redstone-lamp-assets.ts" &&
      entry.key.join(".") === key
  );

  assert.ok(recorded !== undefined, `No provenance for ${key}`);
  const payload = DATA_URI.exec(textures[key])?.groups?.payload;
  assert.ok(payload !== undefined, `${key} is not a PNG data URI`);
  const decodedSha256 = sha256(Buffer.from(payload, "base64"));
  assert.equal(decodedSha256, recorded.sha256, `${key} texture bytes changed`);

  return { key, member: recorded.member, sha256: decodedSha256 };
});

const receipt = {
  assets,
  command: commandArgument,
  consumerRsc: settings.rsc,
  files,
  item: ITEM,
  scope:
    "External consumer outside the repository, installed with the shadcn CLI from the locally built registry. Files, types and embedded textures are verified; pixels are verified by the projected-reference PPTs against the repository source, which the installed files equal beyond CLI transforms.",
  typecheck: { passed: true, typescript: typescriptVersion },
};

await writeFile(
  path.resolve(receiptArgument),
  `${JSON.stringify(receipt, null, 2)}\n`
);

console.log(`${ITEM}: ${files.length} installed files verified`);
