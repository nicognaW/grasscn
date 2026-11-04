import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  HeaderCapture,
  ImageIdentity,
} from "@ppt/runtime/docs-reference-types";
import {
  parseHeaderCase,
  parseHeaderCapture,
  parseImageIdentity,
} from "@ppt/runtime/docs-reference-types";
import { PNG } from "pngjs";

const root = path.resolve(
  process.argv[2] ?? fileURLToPath(new URL("branding-header", import.meta.url))
);

/** @param bytes - Original reference input accepted by the owned hash-update SDK. */
const hash = (bytes: Parameters<ReturnType<typeof createHash>["update"]>[0]) =>
  createHash("sha256").update(bytes).digest("hex");

const definitions = await readFile(path.join(root, "case.json"));
const definition = parseHeaderCase(definitions.toString("utf-8"));

/** @type {(import("@ppt/runtime/docs-reference-types").HeaderCapture & {images: Record<string, import("@ppt/runtime/docs-reference-types").ImageIdentity>, launch: string})[]} */
const captures: (HeaderCapture & {
  images: Record<string, ImageIdentity>;
  launch: string;
})[] = [];

const launchInputs = await Promise.allSettled(
  ["native-one", "native-two"].map(async (launch) => {
    const directory = path.join(root, launch);

    const capture = Promise.allSettled([
      readFile(path.join(directory, "capture.json"), "utf-8"),
    ]);

    const images = Promise.allSettled(
      [definition.name, `frames/${definition.name}`].map(async (relative) => {
        const [bytes, identity] = await Promise.allSettled([
          readFile(path.join(directory, relative)),
          readFile(
            path.join(directory, relative.replace(/\.png$/u, ".identity.json")),
            "utf-8"
          ),
        ] as const);

        return { bytes, identity, relative };
      })
    );

    return { capture: await capture, images: await images, launch };
  })
);

for (const input of launchInputs) {
  if (input.status === "rejected") {
    throw input.reason;
  }

  const {
    launch,
    capture: [captureInput],
    images: imageInputs,
  } = input.value;

  if (captureInput.status === "rejected") {
    throw captureInput.reason;
  }

  const capture = parseHeaderCapture(captureInput.value);

  if (
    capture.sourceJarSha256 !==
      "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290" ||
    capture.caseDefinitionSha256 !== hash(definitions)
  ) {
    throw new Error("Native source/case identity mismatch");
  }

  /** @type {Record<string, import("@ppt/runtime/docs-reference-types").ImageIdentity>} */
  const images: Record<string, ImageIdentity> = {};

  for (const imageInput of imageInputs) {
    if (imageInput.status === "rejected") {
      throw imageInput.reason;
    }

    const {
      relative,
      bytes: bytesInput,
      identity: identityInput,
    } = imageInput.value;

    if (bytesInput.status === "rejected") {
      throw bytesInput.reason;
    }

    const bytes = bytesInput.value;
    const image = PNG.sync.read(bytes);

    if (identityInput.status === "rejected") {
      throw identityInput.reason;
    }

    const identity = parseImageIdentity(identityInput.value);

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
