import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import registry from "../registry.json";

export interface InstallationFile {
  source: string;
  destination: string;
  url: string;
  sourceBytes: number;
}

export interface InstallationManifest {
  name: string;
  dependencies: string[];
  devDependencies: string[];
  files: InstallationFile[];
}

interface RegistryFile {
  path: string;
  type: string;
  target?: string;
}

export const installationDestination = (file: RegistryFile) => {
  if (file.target?.startsWith("@components/") === true) {
    return file.target.replace("@components/", "components/");
  }

  interface InstallationDirectories {
    [fileType: string]: string;
  }

  const directories: InstallationDirectories = {
    "registry:block": "components",
    "registry:hook": "hooks",
    "registry:lib": "lib",
    "registry:ui": "components/ui",
  };

  const directory = directories[file.type];

  if (!directory) {
    throw new Error("Unsupported installation destination");
  }

  return `${directory}/${path.posix.basename(file.path)}`;
};

const sourcePath = (source: string) => {
  if (!source.startsWith("registry/") || source.includes("..")) {
    throw new Error("Unsupported installation source");
  }

  return path.join(process.cwd(), "registry", source.slice("registry/".length));
};

/** Only inventory and sizes cross the initial server boundary, never complete resources. */
export const installationManifest = async (
  name: string
): Promise<InstallationManifest | undefined> => {
  const item = registry.items.find((entry) => entry.name === name);

  if (item === undefined) {
    return item;
  }

  return {
    dependencies: [...item.dependencies],
    devDependencies: [...(item.devDependencies ?? [])],
    files: await Promise.all(
      item.files.map(async (file, index) => {
        const target = installationDestination(file);
        const url = `/api/installation/${encodeURIComponent(name)}/${index}`;
        const info = await stat(sourcePath(file.path));

        return {
          destination: target,
          source: file.path,
          sourceBytes: info.size,
          url,
        };
      })
    ),
    name,
  };
};

/** Adjust relative modules across consumer UI, hooks, lib and block destinations. */
export const installationSource = async (name: string, identity: string) => {
  const validIdentity = /^(?<index>0|[1-9]\d*)$/u.test(identity);

  const item = validIdentity
    ? registry.items.find((entry) => entry.name === name)
    : undefined;

  if (item === undefined) {
    return item;
  }

  const file = item.files[Number(identity)];

  if (file === undefined) {
    return file;
  }

  const code = await readFile(sourcePath(file.path), "utf-8");
  const consumerPath = installationDestination(file);

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

    if (!dependency) {
      throw new Error(`Missing registry dependency: ${specifier}`);
    }

    let target = path.posix.relative(
      path.posix.dirname(consumerPath),
      installationDestination(dependency)
    );

    if (!path.posix.extname(specifier)) {
      target = target.replace(/\.(?<extension>ts|tsx)$/u, "");
    }

    return target.startsWith(".") ? target : `./${target}`;
  };

  const contents = code.replaceAll(
    /(?<prefix>\bfrom\s*|\bimport\s*(?:\(\s*)?|@import\s*)(?<quote>["'])(?<specifier>\.\.?\/[^"']+)\k<quote>/gu,
    (_match, prefix: string, quote: string, specifier: string) =>
      `${prefix}${quote}${resolve(specifier)}${quote}`
  );

  return { contents, destination: consumerPath };
};
