import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import registry from "../registry.json";

export type InstallationFile = {
  source: string;
  destination: string;
  url: string;
  sourceBytes: number;
};
export type InstallationManifest = {
  name: string;
  dependencies: string[];
  files: InstallationFile[];
};
type RegistryFile = { path: string; type: string; target?: string };
function destination(file: RegistryFile) {
  if (file.target?.startsWith("@components/"))
    return file.target.replace("@components/", "components/");
  const directories: Record<string, string> = {
    "registry:ui": "components/ui",
    "registry:hook": "hooks",
    "registry:lib": "lib",
    "registry:block": "components",
  };
  const directory = directories[file.type];
  if (!directory) throw Error("Unsupported installation destination");
  return `${directory}/${path.posix.basename(file.path)}`;
}
function sourcePath(source: string) {
  if (!source.startsWith("registry/") || source.includes(".."))
    throw Error("Unsupported installation source");
  return path.join(process.cwd(), "registry", source.slice("registry/".length));
}
/** Only inventory and sizes cross the initial server boundary, never complete resources. */
export async function installationManifest(
  name: string
): Promise<InstallationManifest | undefined> {
  const item = registry.items.find((entry) => entry.name === name);
  if (!item) return;
  return {
    name,
    dependencies: [...item.dependencies],
    files: await Promise.all(
      item.files.map(async (file, index) => ({
        source: file.path,
        destination: destination(file),
        url: `/api/installation/${encodeURIComponent(name)}/${index}`,
        sourceBytes: (await stat(sourcePath(file.path))).size,
      }))
    ),
  };
}
/** Adjust relative modules across consumer UI, hooks, lib and block destinations. */
export async function installationSource(name: string, identity: string) {
  if (!/^(0|[1-9]\d*)$/.test(identity)) return;
  const item = registry.items.find((entry) => entry.name === name);
  const file = item?.files[Number(identity)];
  if (!item || !file) return;
  const code = await readFile(sourcePath(file.path), "utf8");
  const consumerPath = destination(file);
  const resolve = (specifier: string) => {
    const original = path.posix.normalize(
      path.posix.join(path.posix.dirname(file.path), specifier)
    );
    const dependency = item.files.find(
      (entry) =>
        entry.path === original ||
        entry.path === `${original}.ts` ||
        entry.path === `${original}.tsx`
    );
    if (!dependency) throw Error(`Missing registry dependency: ${specifier}`);
    let target = path.posix.relative(
      path.posix.dirname(consumerPath),
      destination(dependency)
    );
    if (!path.posix.extname(specifier))
      target = target.replace(/\.(ts|tsx)$/, "");
    return target.startsWith(".") ? target : `./${target}`;
  };
  const contents = code.replace(
    /(\bfrom\s*|\bimport\s*(?:\(\s*)?|@import\s*)(["'])(\.\.?\/[^"']+)\2/g,
    (_match, prefix: string, quote: string, specifier: string) =>
      `${prefix}${quote}${resolve(specifier)}${quote}`
  );
  return { contents, destination: consumerPath };
}
