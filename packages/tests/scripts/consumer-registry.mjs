import assert from "node:assert/strict";
import { readFile, stat, realpath } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./consumer-boundary.mjs";
import { installedRegistryFile } from "./installed-registry-file.mjs";

export async function fetchPublicRegistry(origin, items, source) {
  const payloads = new Map();
  for (const item of items) {
    assert(/^[a-z0-9-]+$/.test(item.name), "Safe registry item identity required");
    const url = `${origin}/r/${item.name}.json`;
    const response = await fetch(url);
    assert(response.ok && response.headers.get("content-type")?.includes("application/json"), `Public JSON registry item unavailable: ${url}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const built = await readFile(path.join(source, "apps/web/public/r", `${item.name}.json`));
    assert.equal(sha256(bytes), sha256(built), `Public registry payload must match current source build: ${item.name}`);
    const payload = JSON.parse(bytes);
    assert.equal(payload.name, item.name);
    assert(Array.isArray(payload.files) && payload.files.length > 0, `Registry files unavailable: ${item.name}`);
    payloads.set(item.name, { url, sha256: sha256(bytes), payload });
  }
  return payloads;
}

export async function assertRegistryInstallation(payloads, consumer, settings) {
  const targets = new Map();
  for (const { payload } of payloads.values()) {
    for (const file of payload.files) {
      const target = installedRegistryFile(file, consumer, settings);
      assert((await stat(target)).isFile(), `Missing CLI-installed file: ${file.path}`);
      assert((await realpath(target)).startsWith((await realpath(consumer)) + path.sep), `CLI-installed file must stay physically inside consumer: ${file.path}`);
      targets.set(file.path, target);
    }
  }
  let importsChecked = 0;
  const installed = {};
  for (const [original, filename] of targets) {
    const bytes = await readFile(filename);
    installed[path.relative(consumer, filename).replaceAll(path.sep, "/")] = sha256(bytes);
    if (!/\.[cm]?[jt]sx?$/.test(filename)) continue;
    const parsed = new Bun.Transpiler({ loader: filename.endsWith("x") ? "tsx" : "ts" }).scan(bytes.toString("utf8"));
    for (const entry of parsed.imports) {
      if (!entry.path.startsWith(".") && !entry.path.startsWith("@/")) continue;
      importsChecked++;
      const target = entry.path.startsWith("@/") ? path.join(consumer, "src", entry.path.slice(2)) : path.resolve(path.dirname(filename), entry.path);
      assert(target.startsWith(path.resolve(consumer) + path.sep), `${original} imports must stay inside consumer: ${entry.path}`);
      const candidates = [target, ...[".ts", ".tsx", ".css", ".json", ".js", ".mjs", "/index.ts", "/index.tsx"].map((extension) => target + extension)];
      let found = false;
      for (const candidate of candidates) {
        let isFile = false;
        try { isFile = (await stat(candidate)).isFile(); } catch {}
        if (isFile) {
          assert((await realpath(candidate)).startsWith((await realpath(consumer)) + path.sep), `${original} imports must stay physically inside consumer`);
          found = true;
          break;
        }
      }
      assert(found, `${original} has unresolved installed import ${entry.path}`);
    }
  }
  return { uniqueFiles: targets.size, importsChecked, installed };
}
