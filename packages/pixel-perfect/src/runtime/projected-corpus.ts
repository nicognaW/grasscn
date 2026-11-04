// Integrity of a projected-reference corpus (ADR 0005) recorded in the
// coverage map: case definition, frozen harness copies and every retained
// image are bound to the manifest's hashes and source JAR. Both the block
// corpora (one case per lamp wall) and the firework rocket corpus (one frame
// per tick over one backdrop) are accepted.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { projectedManifestSchema } from "@ppt/native/projected-case";
import { projectedFireworkRocketManifestSchema } from "@ppt/native/projected-firework-rocket-case";
import { evidenceFile } from "@ppt/runtime/evidence-paths";
import { PNG } from "pngjs";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const read = async (file: string) => await readFile(evidenceFile(file));

interface RetainedImage {
  decodedRgbaSha256: string;
  file: string;
  sha256: string;
}

// The retained images of each case (or frame) and the corpus's identity.
const corpusOf = (manifestJson: string) => {
  const manifest: unknown = JSON.parse(manifestJson);
  const rocket = projectedFireworkRocketManifestSchema.safeParse(manifest);

  if (rocket.success) {
    return {
      ...rocket.data,
      images: [
        rocket.data.backdropFrame,
        ...rocket.data.frames.flatMap((frame) => [
          frame.reference,
          frame.mask,
          frame.sceneFrame,
        ]),
      ] satisfies RetainedImage[],
      size: rocket.data.frames.length,
    };
  }

  const block = projectedManifestSchema.parse(manifest);

  return {
    ...block,
    images: block.cases.flatMap((reference) => [
      reference.reference,
      reference.mask,
      reference.sceneFrame,
      reference.backdropFrame,
    ]) satisfies RetainedImage[],
    size: block.cases.length,
  };
};

/**
 * Asserts the corpus behind `manifestFile` (a map-relative path) is intact
 * and returns its number of compared cases (or frames).
 */
export const assertProjectedCorpus = async (
  manifestFile: string,
  sourceJarSha256: string
) => {
  const directory = path.dirname(manifestFile);

  const manifestBytes = await read(manifestFile);

  const manifest = corpusOf(manifestBytes.toString("utf-8"));

  assert.equal(manifest.sourceJar.sha256, sourceJarSha256, "Source JAR");
  assert.ok(manifest.size > 0, `${manifestFile}: no cases`);
  assert.equal(
    sha256(await read(path.join(directory, "case.json"))),
    manifest.caseDefinitionSha256,
    `${manifestFile}: case definition integrity`
  );

  const harness = await Promise.all(
    manifest.harnessSources.map(async (entry) => ({
      bytes: await read(path.join(directory, entry.file)),
      entry,
    }))
  );

  for (const { bytes, entry } of harness) {
    assert.equal(sha256(bytes), entry.sha256, `Frozen harness ${entry.file}`);
  }

  const retained = await Promise.all(
    manifest.images.map(async (image) => ({
      bytes: await read(path.join(directory, image.file)),
      image,
    }))
  );

  for (const { bytes, image } of retained) {
    assert.equal(sha256(bytes), image.sha256, image.file);
    assert.equal(
      sha256(PNG.sync.read(bytes).data),
      image.decodedRgbaSha256,
      image.file
    );
  }

  return manifest.size;
};
