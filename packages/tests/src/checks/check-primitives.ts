import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { repoRoot, webRoot } from "@tests/paths";
import { JSON5 } from "bun";

interface DependencyFields {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface PackageManifest extends DependencyFields {
  name?: string;
}

interface PrimitiveLockfile {
  lockfileVersion: number;
  packages?: Partial<
    Record<
      string,
      [
        identity: string,
        location?: string,
        metadata?: DependencyFields,
        integrity?: string,
      ]
    >
  >;
  workspaces?: Record<string, DependencyFields>;
}

interface PrimitiveRegistryItem {
  dependencies?: string[];
  files?: { content?: string; path: string }[];
  name: string;
}

interface PrimitiveRegistry {
  items: PrimitiveRegistryItem[];
}

const rootArgument = process.argv.indexOf("--root");

const root =
  rootArgument === -1 ? repoRoot : path.resolve(process.argv[rootArgument + 1]);

const sourceRoot = rootArgument === -1 ? webRoot : root;
const resolve = (...names: string[]) => path.resolve(root, ...names);

const readManifest = async (name: string, directory = root) =>
  // SAFETY: these files are the selected workspace package manifests; only standard dependency fields are consumed.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Preserve the actual manifest bytes and existing dependency policy checks.
  JSON.parse(
    await readFile(path.resolve(directory, name), "utf-8")
  ) as PackageManifest;

const radix = (name: string) =>
  /^(?:@radix-ui\/|radix-ui(?:@|\/|$))/u.test(name);

const cmdk = (name: string) => /^cmdk(?:@|\/|$)/u.test(name);
const vaul = (name: string) => /^vaul(?:@|\/|$)/u.test(name);
const banned = (name: string) => radix(name) || vaul(name);
const manifest = await readManifest("package.json");

// SAFETY: the pinned Bun lockfile defines dependency package tuples and workspace roots.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Existing lockfile-version and dependency-route assertions remain intact.
const lock = JSON5.parse(
  await readFile(resolve("bun.lock"), "utf-8")
) as PrimitiveLockfile;

assert.equal(lock.lockfileVersion, 2, "Unsupported Bun lockfile format");

// SAFETY: this authored registry controls the item dependency and source-file declarations checked below.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Keep all registry primitive and closure checks on the original parsed object.
const registry = JSON.parse(
  await readFile(path.join(sourceRoot, "registry.json"), "utf-8")
) as PrimitiveRegistry;

const failures: string[] = [];
const packages = lock.packages ?? {};

const metadata = (location: string): DependencyFields =>
  packages[location]?.[2] ?? {};

// Bun records nested resolutions under parent/package keys. Walk ancestors,
// retaining package identity instead of relying on the developer's node_modules.
const resolveDependency = function resolveDependency(
  location: string,
  name: string
) {
  let base = location;
  let resolved: string | undefined;

  for (;;) {
    const candidate = base ? `${base}/${name}` : name;

    if (packages[candidate]) {
      resolved = candidate;
      break;
    }

    if (!base) {
      break;
    }

    const parent = base.lastIndexOf("/");
    base = parent === -1 ? "" : base.slice(0, parent);
  }

  return resolved;
};

const packageName = (location: string) => {
  const identity = packages[location]?.[0] ?? location;
  const version = identity.lastIndexOf("@");

  return version > 0 ? identity.slice(0, version) : identity;
};

const fields = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

const transitiveFields = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

const manifests = [manifest];

const workspaceManifests = await Promise.allSettled(
  Object.keys(lock.workspaces ?? {}).flatMap((directory) =>
    directory ? [readManifest(`${directory}/package.json`)] : []
  )
);

for (const workspace of workspaceManifests) {
  if (workspace.status === "rejected") {
    throw workspace.reason;
  }

  manifests.push(workspace.value);
}

const roots = manifests.flatMap((pkg) =>
  fields.flatMap((field) =>
    Object.keys(pkg[field] ?? {}).map((name) => ({
      location: resolveDependency(pkg.name ?? "", name),
      name,
    }))
  )
);

const cmdkClosure = new Set<string>();

const pending = roots.flatMap((dependencyRoot) => {
  if (!cmdk(dependencyRoot.name)) {
    return [];
  }

  const { location } = dependencyRoot;

  return location !== undefined && location.length > 0 ? [location] : [];
});

for (
  let location = pending.pop();
  location !== undefined;
  location = pending.pop()
) {
  if (cmdkClosure.has(location)) {
    continue;
  }

  cmdkClosure.add(location);

  for (const field of transitiveFields) {
    for (const name of Object.keys(metadata(location)[field] ?? {})) {
      const dependency = resolveDependency(location, name);

      if (dependency !== undefined && dependency !== "") {
        pending.push(dependency);
      }
    }
  }
}

const outsideCmdk = new Set<string>();

const outsidePending = roots.flatMap((dependencyRoot) => {
  if (cmdk(dependencyRoot.name)) {
    return [];
  }

  const { location } = dependencyRoot;

  return location !== undefined && location.length > 0 ? [location] : [];
});

for (
  let location = outsidePending.pop();
  location !== undefined;
  location = outsidePending.pop()
) {
  if (outsideCmdk.has(location)) {
    continue;
  }

  outsideCmdk.add(location);

  for (const field of transitiveFields) {
    for (const name of Object.keys(metadata(location)[field] ?? {})) {
      const dependency = !cmdk(name) && resolveDependency(location, name);

      if (
        dependency !== false &&
        dependency !== undefined &&
        dependency !== ""
      ) {
        outsidePending.push(dependency);
      }
    }
  }
}

const dependencyIsInCommandClosure = (location: string, name: string) => {
  const dependency = resolveDependency(location, name);

  return dependency !== undefined && cmdkClosure.has(dependency);
};

const includesCommand = (item: PrimitiveRegistryItem) =>
  item.files?.some((file) => /(?:^|\/)command\.tsx$/u.test(file.path)) === true;

for (const current of manifests) {
  for (const field of fields) {
    for (const name of Object.keys(current[field] ?? {})) {
      if (banned(name)) {
        failures.push(`package.json ${field}: ${name}`);
      }
    }
  }
}

for (const location of Object.keys(packages)) {
  const pkg = metadata(location);
  const name = packageName(location);

  if (
    vaul(name) ||
    (radix(name) && (!cmdkClosure.has(location) || outsideCmdk.has(location)))
  ) {
    failures.push(`lockfile: ${location}`);
  }

  for (const field of transitiveFields) {
    for (const dependencyName of Object.keys(pkg[field] ?? {})) {
      if (
        vaul(dependencyName) ||
        (radix(dependencyName) &&
          (!cmdkClosure.has(location) ||
            !dependencyIsInCommandClosure(location, dependencyName)))
      ) {
        failures.push(`transitive ${field}: ${location} -> ${dependencyName}`);
      }
    }
  }
}

for (const item of registry.items) {
  for (const name of item.dependencies ?? []) {
    if (banned(name) || (cmdk(name) && !includesCommand(item))) {
      failures.push(`registry ${item.name}: ${name}`);
    }
  }
}

const inspect = async function inspect(directory: string, absolute: string) {
  for (const entry of await readdir(absolute, {
    withFileTypes: true,
  })) {
    const relative = path.posix.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (
        directory === "preview" &&
        ["registry", "scripts", "node_modules", "dist", "public"].includes(
          entry.name
        )
      ) {
        continue;
      }

      await inspect(relative, path.join(absolute, entry.name));
    } else if (/\.[cm]?[jt]sx?$/u.test(entry.name)) {
      const source = await readFile(path.join(absolute, entry.name), "utf-8");

      for (const match of source.matchAll(
        /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)["'](?<specifier>[^"']+)["']/gu
      )) {
        if (
          banned(match[1]) ||
          (cmdk(match[1]) && relative !== "registry/ui/command.tsx")
        ) {
          failures.push(`${relative}: ${match[1]}`);
        }
      }
    }
  }
};

await inspect("registry", path.join(sourceRoot, "registry"));

await inspect(
  "preview",
  rootArgument === -1 ? webRoot : path.join(root, "preview")
);

if (process.argv.includes("--built")) {
  const expected = new Set([
    "registry.json",
    ...registry.items.map((item) => `${item.name}.json`),
  ]);

  for (const filename of await readdir(path.join(sourceRoot, "public/r"))) {
    if (filename.endsWith(".json") && !expected.has(filename)) {
      failures.push(`obsolete built payload: ${filename}`);
    }
  }

  const payloadFiles = await Promise.allSettled(
    registry.items.map(
      async (item) =>
        await readFile(
          path.join(sourceRoot, `public/r/${item.name}.json`),
          "utf-8"
        )
    )
  );

  for (const [index, item] of registry.items.entries()) {
    const payloadFile = payloadFiles[index];

    if (payloadFile.status === "rejected") {
      throw payloadFile.reason;
    }

    // SAFETY: shadcn build emits the registry item payload being verified here.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Preserve dependency and source checks on the built registry payload.
    const payload = JSON.parse(payloadFile.value) as PrimitiveRegistryItem;

    for (const name of payload.dependencies ?? []) {
      if (banned(name) || (cmdk(name) && !includesCommand(item))) {
        failures.push(`built ${item.name}: ${name}`);
      }
    }

    for (const file of payload.files ?? []) {
      for (const match of (file.content ?? "").matchAll(
        /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)["'](?<specifier>[^"']+)["']/gu
      )) {
        if (
          banned(match[1]) ||
          (cmdk(match[1]) && !/(?:^|\/)command\.tsx$/u.test(file.path))
        ) {
          failures.push(`built ${item.name}/${file.path}: ${match[1]}`);
        }
      }
    }
  }
}

assert.deepEqual(
  failures,
  [],
  `Use upstream Base UI primitives; Radix is permitted only inside cmdk's dependency closure:\n${failures.join("\n")}`
);

console.log(
  "Primitives: upstream Base UI with cmdk; no direct Radix or Vaul, and no Radix dependency route outside cmdk"
);
