import { test } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { repoRoot, testRoot } from "@grasscn/tests/paths";
import { packageBin } from "@grasscn/tests/tooling";

import consumerConfig from "../../../pixel-perfect/tsconfig.json";
import manifest from "../../package.json";

const consumerRoot = path.join(repoRoot, "packages/pixel-perfect");

const publicJavaScript = Object.entries(manifest.exports).filter(([, target]) =>
  /\.(?:[cm]?js)$/u.test(target)
);

const configuredPaths = new Map<string, string[]>(
  Object.entries(consumerConfig.compilerOptions.paths)
);

const compiler = packageBin("typescript", "tsc", repoRoot);
const alias = (subpath: string) => `${manifest.name}/${subpath.slice(2)}`;

const write = (file: string, contents: string) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents);
};

const compile = (directory: string, paths: Record<string, string[]>) => {
  write(
    path.join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        allowJs: true,
        // Fixture JavaScript is physically in node_modules, unlike workspace source links.
        maxNodeModuleJsDepth: 1,
        module: "ESNext",
        moduleResolution: "Bundler",
        noEmit: true,
        paths,
        skipLibCheck: true,
        strict: true,
        target: "ES2022",
        types: [],
      },
      files: ["entry.ts"],
    })
  );

  const result = spawnSync(
    process.execPath,
    [
      compiler,
      "--project",
      path.join(directory, "tsconfig.json"),
      "--traceResolution",
    ],
    { cwd: directory, encoding: "utf-8" }
  );

  assert.ifError(result.error);

  return { output: result.stdout + result.stderr, status: result.status };
};

test("public JavaScript type ownership rejects ancestor TypeScript implementations", () => {
  const parent = path.join(testRoot, "test-results/unit");
  mkdirSync(parent, { recursive: true });

  const root = mkdtempSync(path.join(parent, "type-ownership-"));
  const project = path.join(root, "consumer");
  const ownedPackage = path.join(project, "node_modules", manifest.name);
  const ancestorPackage = path.join(root, "node_modules", manifest.name);

  const ancestorExports = Object.fromEntries(
    publicJavaScript.map(([subpath, target]) => [
      subpath,
      target.replace(/\.(?:[cm]?js)$/u, ".ts"),
    ])
  );

  try {
    write(
      path.join(project, "package.json"),
      JSON.stringify({ type: "module" })
    );
    write(
      path.join(ownedPackage, "package.json"),
      JSON.stringify({
        exports: Object.fromEntries(publicJavaScript),
        name: manifest.name,
        type: "module",
      })
    );
    write(
      path.join(ancestorPackage, "package.json"),
      JSON.stringify({
        exports: ancestorExports,
        name: manifest.name,
        type: "module",
      })
    );

    for (const [subpath, target] of publicJavaScript) {
      write(path.join(ownedPackage, target), 'export const owner = "owned";');
      write(
        path.join(ancestorPackage, ancestorExports[subpath]),
        'export const owner = "foreign";'
      );
    }

    write(
      path.join(project, "entry.ts"),
      publicJavaScript
        .map(
          ([subpath], index) =>
            `import { owner as owner${index} } from "${alias(subpath)}";\nconst expected${index}: "owned" = owner${index};`
        )
        .join("\n")
    );

    const unbound = compile(project, {});
    assert.notEqual(
      unbound.status,
      0,
      "Ancestor preferred-extension search must reproduce the failure"
    );
    assert.match(unbound.output, /foreign/u);

    const paths = Object.fromEntries(
      publicJavaScript.flatMap(([subpath]) => {
        const targets = configuredPaths.get(alias(subpath));

        return targets === undefined
          ? []
          : [
              [
                alias(subpath),
                targets.map((target) =>
                  path.join(
                    ownedPackage,
                    path.relative(testRoot, path.resolve(consumerRoot, target))
                  )
                ),
              ],
            ];
      })
    );

    const bound = compile(project, paths);
    assert.equal(bound.status, 0, bound.output);

    const sortedConfiguredAliases = [...configuredPaths.keys()].filter((name) =>
      name.startsWith(`${manifest.name}/`)
    );

    sortedConfiguredAliases.sort();

    const sortedPublicAliases = publicJavaScript.map(([subpath]) =>
      alias(subpath)
    );

    sortedPublicAliases.sort();
    assert.deepEqual(sortedConfiguredAliases, sortedPublicAliases);

    for (const [subpath, target] of publicJavaScript) {
      const prefix = `======== Module name '${alias(subpath)}' was successfully resolved to '`;

      const resolution = bound.output
        .split("\n")
        .find((line) => line.startsWith(prefix));

      assert.ok(
        resolution !== undefined,
        `Compiler must resolve ${alias(subpath)}`
      );
      const [physical] = resolution.slice(prefix.length).split("'");
      assert.equal(
        realpathSync(physical),
        realpathSync(path.join(ownedPackage, target))
      );
      assert.deepEqual(configuredPaths.get(alias(subpath)), [
        path
          .relative(consumerRoot, path.join(testRoot, target))
          .replaceAll(path.sep, "/"),
      ]);

      const runtime = createRequire(
        path.join(consumerRoot, "package.json")
      ).resolve(alias(subpath));

      assert.equal(
        realpathSync(runtime),
        realpathSync(path.join(testRoot, target))
      );
    }

    const [first] = publicJavaScript;
    assert.ok(first !== undefined);
    const [firstSubpath] = first;

    const forged = compile(project, {
      ...paths,
      [alias(firstSubpath)]: [
        path.join(ancestorPackage, ancestorExports[firstSubpath]),
      ],
    });

    assert.notEqual(
      forged.status,
      0,
      "A mapped foreign owner must remain invalid"
    );
    assert.match(forged.output, /foreign/u);
  } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(parent));
    assert.ok(path.basename(root).startsWith("type-ownership-"));
    rmSync(root, { force: true, recursive: true });
  }
});
