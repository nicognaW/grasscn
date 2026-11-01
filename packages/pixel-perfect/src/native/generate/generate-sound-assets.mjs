import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { resolveRepositoryPath } from "@ppt/paths";

const assets = process.argv[2];
if (!assets)
  throw new Error(
    "Usage: bun src/native/generate/generate-sound-assets.mjs <Minecraft assets directory>"
  );
const indexBytes = await readFile(path.join(assets, "indexes/32.json"));
const index = JSON.parse(indexBytes);
const hash = (bytes, algorithm = "sha256") =>
  createHash(algorithm).update(bytes).digest("hex");
async function original(resource) {
  const entry = index.objects[resource];
  assert.ok(entry, `Missing indexed resource: ${resource}`);
  const bytes = await readFile(
    path.join(assets, "objects", entry.hash.slice(0, 2), entry.hash)
  );
  assert.equal(bytes.length, entry.size);
  assert.equal(hash(bytes, "sha1"), entry.hash);
  return { bytes, sha1: entry.hash, sha256: hash(bytes) };
}
const definitions = await original("minecraft/sounds.json");
const event = "ui.button.click";
assert.deepEqual(JSON.parse(definitions.bytes)[event].sounds, [
  "random/click_stereo",
]);
const resource = "minecraft/sounds/random/click_stereo.ogg";
const sound = await original(resource);
assert.equal(sound.sha1, "f0ca66561f832bf2f60b393837297c2692367cd5");
await writeFile(
  resolveRepositoryPath("registry/ui/minecraft-sound-assets.ts"),
  `// Unmodified Minecraft ui.button.click asset from asset index 32.\nexport const minecraftClickSound = "data:audio/ogg;base64,${sound.bytes.toString("base64")}"\n`
);
await writeFile(
  resolveRepositoryPath("tests/reference/sound-provenance.json"),
  JSON.stringify(
    {
      minecraftVersion: "26.2",
      assetIndex: 32,
      assetIndexSha256: hash(indexBytes),
      soundDefinitionsSha1: definitions.sha1,
      soundDefinitionsSha256: definitions.sha256,
      event,
      resource,
      sha1: sound.sha1,
      sha256: sound.sha256,
      size: sound.bytes.length,
      pitch: 1,
      volume: 0.25,
      sources: [
        "AbstractWidget.playDownSound",
        "SimpleSoundInstance.forUI",
        "AbstractSliderButton.onRelease",
        "EditBox.playDownSound",
      ],
    },
    null,
    2
  ) + "\n"
);
console.log(
  `Original ${event}: ${sound.bytes.length} bytes, SHA-1 ${sound.sha1}`
);
