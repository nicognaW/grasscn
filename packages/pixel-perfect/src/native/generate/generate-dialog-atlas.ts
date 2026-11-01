import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import type {
  GlyphAtlasProvenance,
  GlyphUV,
} from "@ppt/native/generate/glyph-atlas";
import { webFile } from "@ppt/paths";

const base = new URL("../../../tests/reference/dialog-extra/", import.meta.url);

// SAFETY: retained probe provenance owns this digest contract; the existing
// byte-hash check below remains the authority before using observed glyph data.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Retained glyph-probe provenance format.
const provenance = JSON.parse(
  await readFile(new URL("asset-provenance.json", base), "utf-8")
) as GlyphAtlasProvenance;

const bytes = await readFile(new URL("glyph-atlas.json", base));

assert.equal(
  createHash("sha256").update(bytes).digest("hex"),
  provenance.glyphAtlasSha256
);

// SAFETY: the retained glyph-atlas bytes passed their recorded hash above.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Native glyph UV producer contract.
const observed = JSON.parse(bytes.toString("utf-8")) as Record<string, GlyphUV>;

const atlas = Object.fromEntries(
  Object.entries(observed).map(([code, { u0, u1, v0, v1 }]) => [
    code,
    { u0, u1, v0, v1 },
  ])
);

await writeFile(
  webFile("registry/ui/minecraft-dialog-atlas.ts"),
  `import type { UnihexAtlas } from "../../../scripts/minecraft-unifont-gpu"\n// Original glyph UVs observed in the Dialog native loading context.\nexport const dialogUnihexAtlas: UnihexAtlas = ${JSON.stringify(
    atlas
  )}\n`
);

console.log(
  `Generated ${Object.keys(atlas).length} native Dialog glyph coordinates`
);
