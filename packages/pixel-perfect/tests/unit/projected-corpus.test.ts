import { test } from "bun:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { webFile } from "@grasscn/tests/paths";
import { pixelPerfectFile } from "@ppt/paths";
import { assertProjectedCorpus } from "@ppt/runtime/projected-corpus";
import { z } from "zod";

const JAR_SHA256 =
  "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290";

const map = z
  .object({
    components: z.array(
      z.object({
        name: z.string(),
        pixelVerification: z.object({
          projectedManifest: z.string().optional(),
        }),
      })
    ),
  })
  .parse(
    JSON.parse(await readFile(webFile("registry/minecraft-map.json"), "utf-8"))
  );

const projected = map.components.flatMap((component) =>
  component.pixelVerification.projectedManifest === undefined
    ? []
    : [
        {
          manifest: component.pixelVerification.projectedManifest,
          name: component.name,
        },
      ]
);

test("the coverage map records the Redstone Lamp display and fireworks projected references", () => {
  assert.deepEqual(projected, [
    {
      manifest: "tests/reference/redstone-lamp-display/manifest.json",
      name: "redstone-lamp-display",
    },
    {
      manifest: "tests/reference/firework-rocket/manifest.json",
      name: "fireworks",
    },
  ]);
});

const mapped = (name: string) => {
  const entry = projected.find((component) => component.name === name);
  assert.ok(entry !== undefined, `${name} has no projected manifest`);

  return entry.manifest;
};

test("the mapped Redstone Lamp display corpus is intact and bound to the source JAR", async () => {
  // Glyphs 0-9 and k alone, plus 1234 and 12k (spec #42).
  assert.equal(
    await assertProjectedCorpus(mapped("redstone-lamp-display"), JAR_SHA256),
    13
  );
});

test("the mapped fireworks corpus is intact and bound to the source JAR", async () => {
  // Rocket ticks 1-86 less the frames equal to the backdrop (85 and 86).
  assert.equal(
    await assertProjectedCorpus(mapped("fireworks"), JAR_SHA256),
    84
  );
});

test("a changed byte in a retained fireworks reference fails the corpus check", async () => {
  const copy = await mkdtemp(path.join(os.tmpdir(), "grasscn-corpus-"));

  try {
    await cp(pixelPerfectFile("tests/reference/firework-rocket"), copy, {
      recursive: true,
    });
    const reference = path.join(copy, "references/flight.tick-026.png");
    const bytes = await readFile(reference);
    bytes[bytes.length - 1] = (bytes.at(-1) ?? 0) + 1;
    await writeFile(reference, bytes);

    await assert.rejects(
      assertProjectedCorpus(path.join(copy, "manifest.json"), JAR_SHA256),
      /references\/flight\.tick-026\.png/u
    );
  } finally {
    await rm(copy, { force: true, recursive: true });
  }
});

test("a changed byte in a retained mask fails the corpus check", async () => {
  const copy = await mkdtemp(path.join(os.tmpdir(), "grasscn-corpus-"));

  try {
    await cp(pixelPerfectFile("tests/reference/redstone-lamp-display"), copy, {
      recursive: true,
    });
    const mask = path.join(copy, "masks/value-1234.png");
    const bytes = await readFile(mask);
    bytes[bytes.length - 1] = (bytes.at(-1) ?? 0) + 1;
    await writeFile(mask, bytes);

    await assert.rejects(
      assertProjectedCorpus(path.join(copy, "manifest.json"), JAR_SHA256),
      /masks\/value-1234\.png/u
    );
  } finally {
    await rm(copy, { force: true, recursive: true });
  }
});

test("a projected corpus from another source JAR is refused", async () => {
  await assert.rejects(
    assertProjectedCorpus(
      "tests/reference/redstone-lamp-display/manifest.json",
      "0".repeat(64)
    ),
    /Source JAR/u
  );
});
