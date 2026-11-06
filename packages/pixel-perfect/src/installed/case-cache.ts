import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { installedDependencyIdentity } from "@grasscn/tests/dependency-identity";
import { PNG } from "pngjs";

type IdentityValue =
  | null
  | boolean
  | number
  | string
  | IdentityValue[]
  | { [input: string]: IdentityValue };

export interface InstalledCaseIdentity {
  [input: string]: IdentityValue;
}

export interface CachedCase {
  name: string;
  mismatchedPixels: number;
  [field: string]: string | number;
}

interface StoredCase {
  name: string;
  reference: string;
  record: CachedCase;
  images: Record<string, string>;
}

const digest = (bytes: string | Buffer) =>
  createHash("sha256").update(bytes).digest("hex");

export const installedConsumerIdentity = (consumer: string) => {
  const hash = createHash("sha256");

  const visit = (relative: string) => {
    const target = path.join(consumer, relative);

    if (!fs.existsSync(target)) {
      hash.update(`${relative}\0<missing>\0`);

      return;
    }

    if (fs.statSync(target).isDirectory()) {
      const nativeSortValues = fs.readdirSync(target);
      nativeSortValues.sort();

      for (const name of nativeSortValues) {
        visit(path.join(relative, name));
      }
    } else {
      hash
        .update(relative)
        .update("\0")
        .update(digest(fs.readFileSync(target)))
        .update("\0");
    }
  };

  for (const entry of [
    "src",
    "public",
    "package.json",
    "bun.lock",
    "components.json",
  ]) {
    visit(entry);
  }

  const nativeSortValues1 = fs.readdirSync(consumer);
  nativeSortValues1.sort();

  for (const entry of nativeSortValues1) {
    if (
      /\.html$|^vite\.config\.|^tsconfig.*\.json$|^\.env(?:\.|$)/u.test(entry)
    ) {
      visit(entry);
    }
  }

  hash.update(JSON.stringify(installedDependencyIdentity(consumer)));

  return hash.digest("hex");
};

const matches = (bytes: Buffer, reference: Buffer) => {
  const actual = PNG.sync.read(bytes);
  const expected = PNG.sync.read(reference);

  return (
    actual.width === expected.width &&
    actual.height === expected.height &&
    actual.data.equals(expected.data)
  );
};

const atomic = (file: string, bytes: string | Buffer) => {
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, bytes);
  fs.renameSync(temporary, file);
};

// Callers bind identity to sources, fixture/dependencies, browser and reference manifest.
// Only completed cases with intact PNGs identical to the current reference are reusable.
export const installedCaseCache = (
  directory: string,
  identity: InstalledCaseIdentity
) => {
  const key = digest(
    JSON.stringify({
      helper: digest(fs.readFileSync(import.meta.filename)),
      identity,
      schema: 1,
    })
  );

  const root = path.join(directory, key);
  const caseRoot = (name: string) => path.join(root, digest(name));

  return {
    read(name: string, reference: Buffer, fields: readonly string[]) {
      try {
        const folder = caseRoot(name);

        // SAFETY: write below owns this persisted cache format; all existing
        // name, digest, alias and decoded-pixel checks remain before reuse.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Owner cache format; integrity and pixel checks precede reuse.
        const entry = JSON.parse(
          fs.readFileSync(path.join(folder, "case.json"), "utf-8")
        ) as StoredCase;

        if (
          entry.name !== name ||
          entry.reference !== digest(reference) ||
          entry.record?.name !== name ||
          entry.record.mismatchedPixels !== 0
        ) {
          return null;
        }

        const cachedImageFields = Object.keys(entry.images);
        cachedImageFields.sort();
        const cachedImageSchema = JSON.stringify(cachedImageFields);
        const requiredImageFields = [...fields];
        requiredImageFields.sort();

        if (cachedImageSchema !== JSON.stringify(requiredImageFields)) {
          return null;
        }

        const rgba = digest(PNG.sync.read(reference).data);

        for (const field of fields) {
          const bytes = fs.readFileSync(
            path.join(folder, `${digest(field)}.png`)
          );

          if (
            digest(bytes) !== entry.images[field] ||
            entry.record[field] !== rgba ||
            !matches(bytes, reference)
          ) {
            return null;
          }
        }

        return entry.record;
      } catch {
        return null;
      }
    },
    write(
      name: string,
      reference: Buffer,
      record: CachedCase,
      images: Record<string, Buffer>
    ) {
      assert.equal(record.name, name);
      assert.equal(record.mismatchedPixels, 0);

      const rgba = digest(PNG.sync.read(reference).data);
      const hashes: Record<string, string> = {};

      for (const [field, bytes] of Object.entries(images)) {
        assert.equal(record[field], rgba);
        assert.ok(matches(bytes, reference), "Cannot cache a pixel mismatch");
        hashes[field] = digest(bytes);
      }

      assert.ok(Object.keys(hashes).length);
      const folder = caseRoot(name);
      fs.mkdirSync(folder, { recursive: true });

      for (const [field, bytes] of Object.entries(images)) {
        atomic(path.join(folder, `${digest(field)}.png`), bytes);
      }

      atomic(
        path.join(folder, "case.json"),
        JSON.stringify({
          images: hashes,
          name,
          record,
          reference: digest(reference),
        })
      );
    },
  };
};
