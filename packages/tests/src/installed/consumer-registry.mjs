import assert from "node:assert/strict";
import { readFile, stat, realpath } from "node:fs/promises";
import path from "node:path";

import { installedRegistryFile } from "@grasscn/tests/installed-registry-file";

import { sha256 } from "./consumer-boundary.mjs";
import { isRegistryPayload } from "./consumer-metadata.ts";

/** @typedef {{path: string, type?: string, target?: string}} RegistryFile */
/** @typedef {{name: string, files: RegistryFile[]}} RegistryPayload */
/** @typedef {{url: string, sha256: string, payload: RegistryPayload}} RegistryEntry */
/** @param {string} origin @param {{name:string}[]} items @param {string} source @returns {Promise<Map<string,RegistryEntry>>} */
export const fetchPublicRegistry = async (origin, items, source) => {
  /** @type {Map<string,RegistryEntry>} */
  const payloads = new Map();

  for (const item of items) {
    assert.ok(
      /^[a-z0-9-]+$/u.test(item.name),
      "Safe registry item identity required"
    );
    const url = `${origin}/r/${item.name}.json`;
    const response = await fetch(url);
    assert.ok(
      response.ok &&
        response.headers.get("content-type")?.includes("application/json") ===
          true,
      `Public JSON registry item unavailable: ${url}`
    );
    const bytes = Buffer.from(await response.arrayBuffer());

    const built = await readFile(
      path.join(source, "apps/web/public/r", `${item.name}.json`)
    );

    assert.equal(
      sha256(bytes),
      sha256(built),
      `Public registry payload must match current source build: ${item.name}`
    );
    /** @type {unknown} */
    const decoded = JSON.parse(bytes.toString("utf-8"));
    assert.ok(
      isRegistryPayload(decoded),
      "Registry item must contain named file definitions"
    );
    const payload = decoded;
    assert.equal(payload.name, item.name);
    assert.ok(
      Array.isArray(payload.files) && payload.files.length > 0,
      `Registry files unavailable: ${item.name}`
    );
    payloads.set(item.name, { payload, sha256: sha256(bytes), url });
  }

  return payloads;
};

/** @param {Map<string,RegistryEntry>} payloads @param {string} consumer @param {{aliases: Record<string,string>}} settings */
export const assertRegistryInstallation = async (
  payloads,
  consumer,
  settings
) => {
  /** @type {Map<string,string>} */
  const targets = new Map();

  for (const { payload } of payloads.values()) {
    for (const file of payload.files) {
      const target = installedRegistryFile(file, consumer, settings);
      const targetStat = await stat(target);
      assert.ok(
        targetStat.isFile(),
        `Missing CLI-installed file: ${file.path}`
      );
      const physicalTarget = await realpath(target);
      const physicalConsumer = await realpath(consumer);
      assert.ok(
        physicalTarget.startsWith(physicalConsumer + path.sep),
        `CLI-installed file must stay physically inside consumer: ${file.path}`
      );
      targets.set(file.path, target);
    }
  }

  let importsChecked = 0;
  /** @type {Record<string,string>} */
  const installed = {};

  for (const [original, filename] of targets) {
    const bytes = await readFile(filename);
    installed[path.relative(consumer, filename).replaceAll(path.sep, "/")] =
      sha256(bytes);

    if (!/\.[cm]?[jt]sx?$/u.test(filename)) {
      continue;
    }

    const parsed = new Bun.Transpiler({
      loader: filename.endsWith("x") ? "tsx" : "ts",
    }).scan(bytes.toString("utf-8"));

    for (const entry of parsed.imports) {
      if (!entry.path.startsWith(".") && !entry.path.startsWith("@/")) {
        continue;
      }

      importsChecked += 1;

      const target = entry.path.startsWith("@/")
        ? path.join(consumer, "src", entry.path.slice(2))
        : path.resolve(path.dirname(filename), entry.path);

      assert.ok(
        target.startsWith(path.resolve(consumer) + path.sep),
        `${original} imports must stay inside consumer: ${entry.path}`
      );

      const candidates = [
        target,
        ...[
          ".ts",
          ".tsx",
          ".css",
          ".json",
          ".js",
          ".mjs",
          "/index.ts",
          "/index.tsx",
        ].map((extension) => target + extension),
      ];

      let found = false;

      for (const candidate of candidates) {
        let isFile = false;

        try {
          const candidateStat = await stat(candidate);
          isFile = candidateStat.isFile();
        } catch {
          /* Missing candidates are expected while walking package/import resolution. */
        }

        if (isFile) {
          const physicalCandidate = await realpath(candidate);
          const physicalConsumer = await realpath(consumer);
          assert.ok(
            physicalCandidate.startsWith(physicalConsumer + path.sep),
            `${original} imports must stay physically inside consumer`
          );
          found = true;
          break;
        }
      }

      assert.ok(
        found,
        `${original} has unresolved installed import ${entry.path}`
      );
    }
  }

  return { importsChecked, installed, uniqueFiles: targets.size };
};
