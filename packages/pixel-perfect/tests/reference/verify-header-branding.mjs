import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";

import {
  parseHeaderCase,
  parseHeaderCapture,
  parseImageIdentity,
} from "../../src/runtime/docs-reference-types.ts";

const root = path.resolve(
  process.argv[2] ?? fileURLToPath(new URL("branding-header", import.meta.url))
);

/** @param {string | Uint8Array} bytes - Original reference bytes to bind. */
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const definitions = await readFile(path.join(root, "case.json"));
const definition = parseHeaderCase(definitions.toString("utf-8"));

/** @type {(import("../../src/runtime/docs-reference-types.ts").HeaderCapture & {images: Record<string, import("../../src/runtime/docs-reference-types.ts").ImageIdentity>, launch: string})[]} */
const captures = [];

/* eslint-disable no-await-in-loop -- Read native provenance and output identities in declared order before recording their verification. */
for (const launch of ["native-one", "native-two"]) {
  const directory = path.join(root, launch);

  const capture = parseHeaderCapture(
    await readFile(path.join(directory, "capture.json"), "utf-8")
  );

  if (
    capture.sourceJarSha256 !==
      "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290" ||
    capture.caseDefinitionSha256 !== hash(definitions)
  ) {
    throw new Error("Native source/case identity mismatch");
  }

  /** @type {Record<string, import("../../src/runtime/docs-reference-types.ts").ImageIdentity>} */
  const images = {};

  for (const relative of [definition.name, `frames/${definition.name}`]) {
    const bytes = await readFile(path.join(directory, relative));
    const image = PNG.sync.read(bytes);

    const identity = parseImageIdentity(
      await readFile(
        path.join(directory, relative.replace(/\.png$/u, ".identity.json")),
        "utf-8"
      )
    );

    if (
      identity.sha256 !== hash(bytes) ||
      identity.decodedRgbaSha256 !== hash(image.data)
    ) {
      throw new Error("Native output identity mismatch");
    }

    images[relative] = identity;
  }

  captures.push({ launch, ...capture, images });
}
/* eslint-enable no-await-in-loop */

if (captures[0].captureSourceSha256 !== captures[1].captureSourceSha256) {
  throw new Error("Native harness changed between launches");
}

for (const relative of [definition.name, `frames/${definition.name}`]) {
  if (
    captures[0].images[relative].decodedRgbaSha256 !==
    captures[1].images[relative].decodedRgbaSha256
  ) {
    throw new Error("Independent native launches disagree");
  }
}

const crop = captures[0].images[definition.name];

if (crop.width !== 48 || crop.height !== 48) {
  throw new Error("Header grass must be the declared16logical GUI3 item");
}

await writeFile(
  path.join(root, "manifest.json"),
  `${JSON.stringify({ captureSourceSha256: captures[0].captureSourceSha256, caseDefinitionSha256: hash(definitions), cases: [{ ...definition, ...crop, path: `native-one/${definition.name}` }], launches: captures, repeatDecodedRgbaEqual: true, scope: "Single normal grass constituent at GUI3 on#202020; the composite SVG badge and overall header are web adaptations without whole-composition native identity.", source: "Original Minecraft GuiGraphicsExtractor.item; isolated test screen supplies one original grass stack, position and background", sourceJarSha256: captures[0].sourceJarSha256 }, null, 2)}\n`
);

console.log(
  "Two independent header grass launches agree in full-frame and crop decoded RGBA"
);
