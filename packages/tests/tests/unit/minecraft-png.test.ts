import { test } from "bun:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { netherStarTextures } from "@grasscn/web/ui/minecraft-nether-star-assets";

import { decodePng } from "../../../../apps/web/registry/ui/minecraft-png";

// Expected RGBA hashes come from an independent decoder (Pillow 12,
// Image.open(member).convert("RGBA").tobytes()) over the 26.2 JAR members.
const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

test("decodes the indexed 4-bit nether star texture to its exact RGBA bytes", async () => {
  const item = await decodePng(netherStarTextures.item);

  assert.deepEqual([item.width, item.height], [16, 16]);
  assert.equal(
    sha256(item.data),
    "30b8b28442a0e3ca853ccae8cc653f34912e6935eae3f681d0f8f9b9504d1654"
  );
});

test("decodes the 8-bit RGB glint texture to its exact RGBA bytes", async () => {
  const glint = await decodePng(netherStarTextures.glint);

  assert.deepEqual([glint.width, glint.height], [128, 128]);
  assert.equal(
    sha256(glint.data),
    "30f24e1a3ecea728e46394215ef544e2c7722395ba7e515e7eddf57c27d2a13e"
  );
});
