import assert from "node:assert/strict";
import { readFile, stat, realpath } from "node:fs/promises";
import path from "node:path";

import { installedRegistryFile } from "@grasscn/tests/installed-registry-file";

import { sha256 } from "./consumer-boundary";
import { isRegistryPayload } from "./consumer-metadata";
import type * as RegistryFileTypes from "./registry-file";

interface RegistryFile {
  path: string;
  type?: string;
  target?: string;
}

interface RegistryPayload {
  name: string;
  files: RegistryFile[];
}

interface RegistryEntry {
  url: string;
  sha256: string;
  payload: RegistryPayload;
}

/** @typedef {{path: string, type?: string, target?: string}} RegistryFile */
/** @typedef {{name: string, files: RegistryFile[]}} RegistryPayload */
/** @typedef {{url: string, sha256: string, payload: RegistryPayload}} RegistryEntry */
/** @param {string} origin @param {{name:string}[]} items @param {string} source @returns {Promise<Map<string,RegistryEntry>>} */
export const fetchPublicRegistry = async (
  origin: string,
  items: { name: string }[],
  source: string
): Promise<Map<string, RegistryEntry>> => {
  const pending = await Promise.allSettled(
    items.map(async (item) => {
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
      const decoded: unknown = JSON.parse(bytes.toString("utf-8"));
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

      return {
        entry: { payload, sha256: sha256(bytes), url },
        name: item.name,
      };
    })
  );

  /** @type {Map<string,RegistryEntry>} */
  const payloads = new Map<string, RegistryEntry>();

  for (const result of pending) {
    if (result.status === "rejected") {
      throw result.reason;
    }

    payloads.set(result.value.name, result.value.entry);
  }

  return payloads;
};

/** @param {Map<string,RegistryEntry>} payloads @param {string} consumer @param {{aliases: Record<string,string>}} settings */
export const assertRegistryInstallation = async (
  payloads: Map<string, RegistryEntry>,
  consumer: string,
  settings: RegistryFileTypes.InstalledComponentSettings
) => {
  /** @type {Map<string,string>} */
  const targets = new Map<string, string>();

  const targetInputs = await Promise.allSettled(
    [...payloads.values()].map(
      async ({ payload }) =>
        await Promise.allSettled(
          payload.files.map(async (file) => {
            const target = installedRegistryFile(file, consumer, settings);

            const [statInput, targetInput, consumerInput] =
              await Promise.allSettled([
                stat(target),
                realpath(target),
                realpath(consumer),
              ]);

            if (statInput.status === "rejected") {
              throw statInput.reason;
            }

            assert.ok(
              statInput.value.isFile(),
              `Missing CLI-installed file: ${file.path}`
            );

            if (targetInput.status === "rejected") {
              throw targetInput.reason;
            }

            if (consumerInput.status === "rejected") {
              throw consumerInput.reason;
            }

            const physicalTarget = targetInput.value;
            const physicalConsumer = consumerInput.value;
            assert.ok(
              physicalTarget.startsWith(physicalConsumer + path.sep),
              `CLI-installed file must stay physically inside consumer: ${file.path}`
            );

            return { original: file.path, target };
          })
        )
    )
  );

  for (const payloadInput of targetInputs) {
    if (payloadInput.status === "rejected") {
      throw payloadInput.reason;
    }

    for (const fileInput of payloadInput.value) {
      if (fileInput.status === "rejected") {
        throw fileInput.reason;
      }

      targets.set(fileInput.value.original, fileInput.value.target);
    }
  }

  let importsChecked = 0;
  /** @type {Record<string,string>} */
  const installed: Record<string, string> = {};

  const sourceInputs = await Promise.allSettled(
    [...targets].map(async ([original, filename]) => {
      let importCount = 0;

      const bytes = await readFile(filename);

      const installedPath = path
        .relative(consumer, filename)
        .replaceAll(path.sep, "/");

      const digest = sha256(bytes);

      if (!/\.[cm]?[jt]sx?$/u.test(filename)) {
        return { digest, importCount, installedPath };
      }

      const parsed = new Bun.Transpiler({
        loader: filename.endsWith("x") ? "tsx" : "ts",
      }).scan(bytes.toString("utf-8"));

      const importInputs = await Promise.allSettled(
        parsed.imports.map(async (entry) => {
          if (!entry.path.startsWith(".") && !entry.path.startsWith("@/")) {
            return false;
          }

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

          const candidateInputs = await Promise.all(
            candidates.map(async (candidate) => {
              try {
                const candidateStat = await stat(candidate);

                return candidateStat.isFile() ? candidate : undefined;
              } catch {
                /* Missing candidates are expected while walking package/import resolution. */
              }

              return undefined;
            })
          );

          const candidate = candidateInputs.find(
            (input) => input !== undefined
          );

          if (candidate !== undefined) {
            const [candidateInput, consumerInput] = await Promise.allSettled([
              realpath(candidate),
              realpath(consumer),
            ]);

            if (candidateInput.status === "rejected") {
              throw candidateInput.reason;
            }

            if (consumerInput.status === "rejected") {
              throw consumerInput.reason;
            }

            const physicalCandidate = candidateInput.value;
            const physicalConsumer = consumerInput.value;
            assert.ok(
              physicalCandidate.startsWith(physicalConsumer + path.sep),
              `${original} imports must stay physically inside consumer`
            );
          }

          assert.ok(
            candidate !== undefined,
            `${original} has unresolved installed import ${entry.path}`
          );

          return true;
        })
      );

      for (const importInput of importInputs) {
        if (importInput.status === "rejected") {
          throw importInput.reason;
        }

        if (importInput.value) {
          importCount += 1;
        }
      }

      return { digest, importCount, installedPath };
    })
  );

  for (const sourceInput of sourceInputs) {
    if (sourceInput.status === "rejected") {
      throw sourceInput.reason;
    }

    const { digest, importCount, installedPath } = sourceInput.value;
    installed[installedPath] = digest;
    importsChecked += importCount;
  }

  return { importsChecked, installed, uniqueFiles: targets.size };
};
