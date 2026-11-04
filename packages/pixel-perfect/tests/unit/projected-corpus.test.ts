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

test("the coverage map records the Redstone Lamp display projected references", () => {
  assert.deepEqual(projected, [
    {
      manifest: "tests/reference/redstone-lamp-display/manifest.json",
      name: "redstone-lamp-display",
    },
  ]);
});

test("the mapped Redstone Lamp display corpus is intact and bound to the source JAR", async () => {
  const [entry] = projected;
  assert.ok(entry !== undefined);
  // Glyphs 0-9 and k alone, plus 1234 and 12k (spec #42).
  assert.equal(await assertProjectedCorpus(entry.manifest, JAR_SHA256), 13);
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
