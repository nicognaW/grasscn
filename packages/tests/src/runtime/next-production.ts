import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  readFile,
  readdir,
  lstat,
  readlink,
  realpath,
  stat,
  writeFile,
  mkdir,
} from "node:fs/promises";
import path from "node:path";

import { repoRoot, webRoot } from "@tests/paths";
import { packageBin } from "@tests/tooling";

import { installedDependencyIdentity } from "./dependency-identity";
import { serveOwnedHttpProcess } from "./owned-http-process";
import type * as VerificationTypes from "./verification-types";
import { parseProductionIdentity } from "./verification-types";

type SourceIdentity = VerificationTypes.SourceIdentity;

type FileIdentity = VerificationTypes.FileIdentity;

type ProductionIdentity = VerificationTypes.ProductionIdentity;

interface BuildOptions {
  source?: SourceIdentity;
  directory?: string;
  root?: string;
  receiptPath?: string;
  verifiedCommand?: string[];
  verifiedExitCode?: number;
}

/** @typedef {VerificationTypes.SourceIdentity} SourceIdentity */
/** @typedef {VerificationTypes.FileIdentity} FileIdentity */
/** @typedef {VerificationTypes.ProductionIdentity} ProductionIdentity */
/** @typedef {{source?: SourceIdentity, directory?: string, root?: string, receiptPath?: string, verifiedCommand?: string[], verifiedExitCode?: number}} BuildOptions */

/** @param {string | Uint8Array} value - Verification input. */
const digest = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

const comparable = (file: string) =>
  process.platform === "win32" ? file.toLowerCase() : file;

interface SourceContent {
  bytes: Buffer;
  link?: { kind: "file" | "directory" | "missing"; target: string };
}

/** @param {string} [directory] - Verification input. */
export const sourceIdentity = async (directory: string = repoRoot) => {
  const git = (args: string[]) =>
    execFileSync("git", args, {
      cwd: directory,
      encoding: "utf-8",
      maxBuffer: 32 * 1024 * 1024,
    }).trim();

  const files = [
    ...new Set(
      git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
        .split("\0")
        .filter(Boolean)
    ),
  ];

  files.sort();

  const tracked = new Set(
    git(["ls-files", "--cached", "-z"]).split("\0").filter(Boolean)
  );

  const uncovered = [
    ...files.filter((file) => !tracked.has(file)),
    ...git([
      "ls-files",
      "--others",
      "--ignored",
      "--exclude-standard",
      "--directory",
      "-z",
    ])
      .split("\0")
      .filter(Boolean),
  ];

  const physicalRoot = await realpath(directory);

  const contents = await Promise.allSettled(
    files.map(async (file): Promise<SourceContent> => {
      const filename = path.join(directory, file);
      let linkTarget: string | undefined;

      try {
        const entry = await lstat(filename);

        if (!entry.isSymbolicLink()) {
          return { bytes: await readFile(filename) };
        }

        linkTarget = await readlink(filename);
        const target = await stat(filename);

        if (target.isFile()) {
          return {
            bytes: await readFile(filename),
            link: { kind: "file", target: linkTarget },
          };
        }

        assert.ok(
          target.isDirectory(),
          `Unsupported source symlink target: ${file}`
        );
        const relative = path.relative(physicalRoot, await realpath(filename));
        assert.ok(
          relative !== ".." &&
            !relative.startsWith(`..${path.sep}`) &&
            !path.isAbsolute(relative),
          `Directory source symlink points outside repository: ${file}`
        );
        const prefix = comparable(`${relative.replaceAll(path.sep, "/")}/`);

        const covered = files.filter(
          (name) => tracked.has(name) && comparable(name).startsWith(prefix)
        );

        assert.ok(
          covered.length > 0,
          `Directory source symlink has no tracked target coverage: ${file}`
        );
        assert.ok(
          !uncovered.some((name) => comparable(name).startsWith(prefix)),
          `Directory source symlink target contains untracked or ignored paths: ${file}`
        );

        return {
          bytes: Buffer.from(
            JSON.stringify([relative.replaceAll(path.sep, "/"), covered])
          ),
          link: { kind: "directory", target: linkTarget },
        };
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
          )
        ) {
          throw error;
        }

        if (linkTarget !== undefined) {
          return {
            bytes: Buffer.from("<deleted>"),
            link: { kind: "missing", target: linkTarget },
          };
        }

        return { bytes: Buffer.from("<deleted>") };
      }
    })
  );

  const hash = createHash("sha256");

  for (const [index, file] of files.entries()) {
    const result = contents[index];

    if (result.status === "rejected") {
      throw result.reason;
    }

    hash.update(file).update("\0");

    if (result.value.link) {
      hash
        .update("<symlink>")
        .update("\0")
        .update(result.value.link.kind)
        .update("\0")
        .update(result.value.link.target)
        .update("\0");
    }

    hash.update(digest(result.value.bytes)).update("\0");
  }

  return {
    commit: git(["rev-parse", "HEAD"]),
    status: git(["status", "--porcelain=v1"]),
    treeSha256: hash.digest("hex"),
  };
};

type ProductionInput =
  | {
      kind: "directory";
      file: string;
      children: PromiseSettledResult<
        PromiseSettledResult<ProductionInput | null>[]
      >;
    }
  | { kind: "symlink"; file: string }
  | {
      kind: "file";
      relative: string;
      fingerprint: PromiseSettledResult<string>;
    };

const readProductionDirectory = async function readProductionDirectory(
  directory: string,
  folder: string
): Promise<PromiseSettledResult<ProductionInput | null>[]> {
  const readProductionInput = async (
    name: string
  ): Promise<ProductionInput | null> => {
    const file = path.join(folder, name);
    const relative = path.relative(directory, file).replaceAll(path.sep, "/");

    if (
      relative === ".next/cache" ||
      relative === ".next/server/route-cache" ||
      relative === ".next/dev" ||
      relative === ".next/trace" ||
      relative === ".next/trace-build"
    ) {
      return null;
    }

    const info = await lstat(file);

    if (info.isSymbolicLink()) {
      return { file, kind: "symlink" };
    }

    if (info.isDirectory()) {
      let children: PromiseSettledResult<
        PromiseSettledResult<ProductionInput | null>[]
      >;

      try {
        children = {
          status: "fulfilled",
          value: await readProductionDirectory(directory, file),
        };
      } catch (error) {
        children = { reason: error, status: "rejected" };
      }

      return {
        children,
        file,
        kind: "directory",
      };
    }

    let fingerprint: PromiseSettledResult<string>;

    try {
      fingerprint = {
        status: "fulfilled",
        value: digest(await readFile(file)),
      };
    } catch (error) {
      fingerprint = { reason: error, status: "rejected" };
    }

    return { fingerprint, kind: "file", relative };
  };

  const entries = await readdir(folder);
  entries.sort();

  return await Promise.allSettled(
    entries.map(async (name) => await readProductionInput(name))
  );
};

type GeneratedInput =
  | Exclude<ProductionInput, { kind: "directory" }>
  | {
      kind: "directory";
      file: string;
      children: PromiseSettledResult<PromiseSettledResult<GeneratedInput>[]>;
    };

const readGeneratedDirectory = async function readGeneratedDirectory(
  directory: string,
  folder: string
): Promise<PromiseSettledResult<GeneratedInput>[]> {
  const readGeneratedInput = async (name: string): Promise<GeneratedInput> => {
    const file = path.join(folder, name);
    const info = await lstat(file);

    if (info.isSymbolicLink()) {
      return { file, kind: "symlink" };
    }

    if (info.isDirectory()) {
      let children: PromiseSettledResult<
        PromiseSettledResult<GeneratedInput>[]
      >;

      try {
        children = {
          status: "fulfilled",
          value: await readGeneratedDirectory(directory, file),
        };
      } catch (error) {
        children = { reason: error, status: "rejected" };
      }

      return {
        children,
        file,
        kind: "directory",
      };
    }

    let fingerprint: PromiseSettledResult<string>;

    try {
      fingerprint = {
        status: "fulfilled",
        value: digest(await readFile(file)),
      };
    } catch (error) {
      fingerprint = { reason: error, status: "rejected" };
    }

    return {
      fingerprint,
      kind: "file",
      relative: path.relative(directory, file).replaceAll(path.sep, "/"),
    };
  };

  const entries = await readdir(folder);
  entries.sort();

  return await Promise.allSettled(
    entries.map(async (name) => await readGeneratedInput(name))
  );
};

/**
 * @param {{directory?: string, source?: SourceIdentity}} [options] - Verification input.
 * @returns {Promise<ProductionIdentity>} The bound production output.
 */
export const productionBuildIdentity = async ({
  directory = webRoot,
  source,
}: {
  directory?: string;
  source?: SourceIdentity;
} = {}): Promise<ProductionIdentity> => {
  assert.ok(
    source !== undefined &&
      source.commit.length > 0 &&
      source.treeSha256.length > 0,
    "Production build needs source identity"
  );
  /** @type {FileIdentity[]} */
  const files: FileIdentity[] = [];

  const visit = (pending: PromiseSettledResult<ProductionInput | null>[]) => {
    for (const result of pending) {
      if (result.status === "rejected") {
        throw result.reason;
      }

      const input = result.value;

      if (input === null) {
        continue;
      }

      assert.ok(
        input.kind !== "symlink",
        "Production output cannot contain symlinks"
      );

      if (input.kind === "directory") {
        if (input.children.status === "rejected") {
          throw input.children.reason;
        }

        visit(input.children.value);
      } else {
        if (input.fingerprint.status === "rejected") {
          throw input.fingerprint.reason;
        }

        files.push({ path: input.relative, sha256: input.fingerprint.value });
      }
    }
  };

  const buildIdContents = await readFile(
    path.join(directory, ".next/BUILD_ID"),
    "utf-8"
  );

  const buildId = buildIdContents.trim();

  assert.ok(buildId, "Missing Next production build ID");

  const roots = await Promise.allSettled([
    readProductionDirectory(directory, path.join(directory, ".next")),
    readProductionDirectory(directory, path.join(directory, "public/r")),
  ]);

  for (const inputRoot of roots) {
    if (inputRoot.status === "rejected") {
      throw inputRoot.reason;
    }

    visit(inputRoot.value);
  }

  return {
    buildId,
    files,
    outputSha256: digest(JSON.stringify(files)),
    source,
  };
};

/**
 * @param {ProductionIdentity} identity - Recorded build source.
 * @param {SourceIdentity} source - Current source snapshot.
 */
export const assertProductionSource = (
  identity: Pick<ProductionIdentity, "source">,
  source: SourceIdentity
) => {
  assert.ok(
    identity?.source?.commit === source?.commit &&
      identity?.source?.treeSha256 === source?.treeSha256,
    "Production build source does not match current snapshot"
  );
};

const receipt = path.join(
  repoRoot,
  "test-results",
  "next-production-build.json"
);

/**
 * @param {string} root - Installed workspace root.
 * @param {string} directory - Generated web root.
 */
const preparationIdentity = async (root: string, directory: string) => {
  const dependencies = installedDependencyIdentity(root);
  assert.ok(
    dependencies,
    "Prepared production requires installed dependency bytes"
  );
  /** @type {FileIdentity[]} */
  const generated: FileIdentity[] = [];

  const visit = (pending: PromiseSettledResult<GeneratedInput>[]) => {
    for (const result of pending) {
      if (result.status === "rejected") {
        throw result.reason;
      }

      const input = result.value;

      assert.ok(
        input.kind !== "symlink",
        "Generated inputs cannot contain symlinks"
      );

      if (input.kind === "directory") {
        if (input.children.status === "rejected") {
          throw input.children.reason;
        }

        visit(input.children.value);
      } else {
        if (input.fingerprint.status === "rejected") {
          throw input.fingerprint.reason;
        }

        generated.push({
          path: input.relative,
          sha256: input.fingerprint.value,
        });
      }
    }
  };

  const roots = await Promise.allSettled([
    readGeneratedDirectory(directory, path.join(directory, ".source")),
    readGeneratedDirectory(directory, path.join(directory, ".next/types")),
  ]);

  for (const inputRoot of roots) {
    if (inputRoot.status === "rejected") {
      throw inputRoot.reason;
    }

    visit(inputRoot.value);
  }

  generated.push({
    path: "next-env.d.ts",
    sha256: digest(await readFile(path.join(directory, "next-env.d.ts"))),
  });
  const resolved = Intl.DateTimeFormat().resolvedOptions();

  return {
    completed: true,
    dependencies,
    environment: {
      arch: process.arch,
      bun: Bun.version,
      bunOptionsSha256: digest(process.env.BUN_OPTIONS ?? ""),
      locale: resolved.locale,
      platform: process.platform,
      timeZone: resolved.timeZone,
    },
    generated,
  };
};

/**
 * @param {unknown} command - Recorded build command.
 * @param {string} root - Workspace owning the build command.
 */
const verifiedRootBuildCommand = (
  command: BuildOptions["verifiedCommand"],
  root: string
) => {
  if (!Array.isArray(command) || command[0] !== process.execPath) {
    return false;
  }

  let remaining;

  if (command[1] === "run" && command[2] === "build") {
    remaining = command.slice(3);
  } else if (
    command[2] === "run" &&
    command[3] === "build" &&
    command[1] === packageBin("turbo", "turbo", root)
  ) {
    remaining = command.slice(4);
  } else {
    return false;
  }

  return (
    remaining.length === 0 ||
    (remaining.length === 1 && remaining[0] === "--concurrency=1")
  );
};

/** @param {BuildOptions} [options] - Verification input. */
export const stampProductionBuild = async (options: BuildOptions = {}) => {
  const source = options.source ?? (await sourceIdentity());

  const directory = options.directory ?? webRoot;
  const root = options.root ?? repoRoot;

  const identity = await productionBuildIdentity({ directory, source });

  // Callers supply this only after observing the completed build command's exit0.
  if (options.verifiedCommand) {
    assert.equal(
      options.verifiedExitCode,
      0,
      "Prepared production requires a completed build with exit0"
    );
    assert.ok(
      verifiedRootBuildCommand(options.verifiedCommand, root),
      "A completed root build command is required; dry runs cannot prepare production"
    );
    identity.verifiedCommand = options.verifiedCommand;
    identity.verifiedExitCode = options.verifiedExitCode;
    identity.preparation = await preparationIdentity(root, directory);
  }

  const destination = options.receiptPath ?? receipt;
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(identity, null, 2)}\n`);

  return identity;
};

/** Reuse a completed build only through the exact frozen production boundary. */
/** @param {BuildOptions} [options] - Verification input. */
export const readPreparedProductionBuild = async (
  options: BuildOptions = {}
) => {
  const source = options.source ?? (await sourceIdentity());

  const identity = parseProductionIdentity(
    await readFile(options.receiptPath ?? receipt, "utf-8")
  );

  assertProductionSource(identity, source);
  assert.ok(
    identity.preparation?.completed === true &&
      verifiedRootBuildCommand(
        identity.verifiedCommand,
        options.root ?? repoRoot
      ) &&
      identity.verifiedExitCode === 0,
    "Production receipt does not prove a completed build"
  );
  const directory = options.directory ?? webRoot;
  const actualOutput = await productionBuildIdentity({ directory, source });
  assert.equal(
    actualOutput.outputSha256,
    identity.outputSha256,
    "Prepared production output changed"
  );
  assert.deepEqual(
    await preparationIdentity(options.root ?? repoRoot, directory),
    identity.preparation,
    "Prepared production dependencies, generated inputs or environment changed"
  );

  return identity;
};

/** @param {{port?: number, expectedSource?: SourceIdentity, startupTimeout?: number}} [options] - Verification input. */
export const serveNextProduction = async ({
  port = 5176,
  expectedSource,
  startupTimeout = 120_000,
}: {
  port?: number;
  expectedSource?: SourceIdentity;
  startupTimeout?: number;
} = {}) => {
  const source = expectedSource ?? (await sourceIdentity());

  const identity = parseProductionIdentity(await readFile(receipt, "utf-8"));

  assertProductionSource(identity, source);
  const actual = await productionBuildIdentity({ source });
  assert.equal(
    actual.outputSha256,
    identity.outputSha256,
    "Production output changed after build receipt"
  );
  // Listen-probe first: Next must never silently reuse a foreground process.
  const { createServer } = await import("node:net");
  const probe = createServer();
  // eslint-disable-next-line promise/avoid-new -- Bridge the owned process or server callback events into an awaited lifecycle step.
  await new Promise<void>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(port, "127.0.0.1", resolve);
  });
  // eslint-disable-next-line promise/avoid-new -- Bridge the owned process or server callback events into an awaited lifecycle step.
  await new Promise<Error | undefined>((resolve) => {
    probe.close(resolve);
  });

  const server = await serveOwnedHttpProcess({
    args: [
      "--bun",
      packageBin("next", "next", webRoot),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    cwd: webRoot,
    env: {
      ...process.env,
      GOMEMLIMIT: process.env.GOMEMLIMIT ?? "768MiB",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    label: "Bun Next production server",
    port,
    readyText: "Ready in",
    startupTimeout,
  });

  return {
    close: server.close,
    identity: {
      ...identity,
      bun: Bun.version,
      pid: server.pid,
      runtime: process.execPath,
    },
    url: server.url,
  };
};
