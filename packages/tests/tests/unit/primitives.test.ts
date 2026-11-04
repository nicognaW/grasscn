import { test } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import type { SpawnSyncReturns } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { testRoot as root } from "@grasscn/tests/paths";

const output = path.join(root, "test-results");

interface PrimitivePolicyFixture {
  check: (...args: string[]) => SpawnSyncReturns<string>;
  directory: string;
  json: (name: string, value: object) => Promise<void>;
}

const fixture = async function fixture(
  run: (context: PrimitivePolicyFixture) => Promise<void>
) {
  await mkdir(output, { recursive: true });
  const directory = await mkdtemp(path.join(output, "primitives-"));

  const json = async (name: string, value: object) => {
    await writeFile(path.join(directory, name), JSON.stringify(value));
  };

  try {
    const setupResults = await Promise.allSettled(
      ["scripts", "registry/ui", "preview", "public/r"].map(async (folder) => {
        await mkdir(path.join(directory, folder), { recursive: true });
      })
    );

    for (const setupResult of setupResults) {
      if (setupResult.status === "rejected") {
        throw setupResult.reason;
      }
    }

    await json("package.json", {
      dependencies: { "@base-ui/react": "1.9.0" },
      type: "module",
    });
    await json("bun.lock", {
      lockfileVersion: 2,
      packages: { "@base-ui/react": ["@base-ui/react@1.9.0", "", {}] },
      workspaces: { "": { dependencies: { "@base-ui/react": "1.9.0" } } },
    });
    await json("registry.json", {
      items: [{ dependencies: ["@base-ui/react"], files: [], name: "button" }],
    });
    await json("public/r/button.json", {
      dependencies: ["@base-ui/react"],
      files: [],
    });
    await json("public/r/registry.json", { items: [] });

    const check = (...args: string[]) =>
      spawnSync(
        process.execPath,
        [
          path.join(root, "src/checks/check-primitives.ts"),
          "--root",
          directory,
          ...args,
        ],
        { cwd: directory, encoding: "utf-8" }
      );

    await run({ check, directory, json });
  } finally {
    assert.equal(path.dirname(directory), output);
    assert.ok(path.basename(directory).startsWith("primitives-"));
    await rm(directory, { force: true, recursive: true });
  }
};

test("primitive policy rejects direct, transitive and optional Radix routes", async () => {
  await fixture(async ({ json, check }) => {
    assert.equal(check().status, 0);
    await json("package.json", { dependencies: { "radix-ui": "1.0.0" } });
    let result = check();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /package\.json dependencies: radix-ui/u);
    await json("package.json", { dependencies: { "@base-ui/react": "1.9.0" } });

    for (const field of [
      "dependencies",
      "optionalDependencies",
      "peerDependencies",
    ]) {
      // oxlint-disable-next-line no-await-in-loop -- Updates one shared manifest/lockfile fixture and verifies that precise policy state before the next case changes it.
      await json("bun.lock", {
        lockfileVersion: 2,
        packages: {
          "@radix-ui/react-dialog": ["@radix-ui/react-dialog@1.0.0", "", {}],
          example: [
            "example@1.0.0",
            "",
            { [field]: { "@radix-ui/react-dialog": "1.0.0" } },
          ],
        },
      });
      result = check();
      assert.equal(result.status, 1);
      assert.match(result.stderr, /example -> @radix-ui\/react-dialog/u);
    }
  });
});

test("primitive policy checks built source and catches obsolete registry payloads", async () => {
  await fixture(async ({ directory, json, check }) => {
    assert.equal(check("--built").status, 0);
    await json("public/r/button.json", {
      files: [{ content: 'import {Command} from "cmdk"', path: "button.tsx" }],
    });
    let result = check("--built");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /built button\/button\.tsx: cmdk/u);
    await json("public/r/button.json", { files: [] });
    await json("public/r/removed-component.json", {});
    result = check("--built");
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /obsolete built payload: removed-component\.json/u
    );

    const awaitedUnitRead1 = await readFile(
      path.join(directory, "public/r/removed-component.json")
    );

    assert.ok(awaitedUnitRead1.length);
  });
});

test("primitive policy rejects version-pinned packages in registry payloads", async () => {
  await fixture(async ({ json, check }) => {
    for (const dependency of [
      "vaul@1.1.2",
      "cmdk@1.1.1",
      "radix-ui@1.0.0",
      "@radix-ui/react-dialog@1.0.0",
    ]) {
      // oxlint-disable-next-line no-await-in-loop -- Updates one shared manifest/lockfile fixture and verifies that precise policy state before the next case changes it.
      await json("registry.json", {
        items: [{ dependencies: [dependency], name: "button" }],
      });
      assert.equal(check().status, 1, dependency);
      // oxlint-disable-next-line no-await-in-loop -- Updates one shared manifest/lockfile fixture and verifies that precise policy state before the next case changes it.
      await json("registry.json", {
        items: [{ dependencies: ["@base-ui/react"], name: "button" }],
      });
      // oxlint-disable-next-line no-await-in-loop -- Updates one shared manifest/lockfile fixture and verifies that precise policy state before the next case changes it.
      await json("public/r/button.json", {
        dependencies: [dependency],
        files: [],
      });
      assert.equal(check("--built").status, 1, dependency);
    }
  });
});

test("upstream cmdk may carry Radix, but a shared dependency must not create another route", async () => {
  await fixture(async ({ json, check }) => {
    await json("package.json", {
      dependencies: { "@base-ui/react": "1.9.0", cmdk: "1.1.1" },
    });

    const packages = {
      "@radix-ui/react-dialog": ["@radix-ui/react-dialog@1.1.6", "", {}],
      cmdk: ["cmdk@1.1.1", "", { dependencies: { shared: "1.0.0" } }],
      shared: [
        "shared@1.0.0",
        "",
        { dependencies: { "@radix-ui/react-dialog": "1.1.6" } },
      ],
    };

    await json("bun.lock", { lockfileVersion: 2, packages });
    assert.equal(check().status, 0);
    await json("package.json", {
      dependencies: { cmdk: "1.1.1", shared: "1.0.0" },
    });
    const result = check();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /lockfile: @radix-ui\/react-dialog/u);
  });
});

test("cmdk is restricted to Command source and registry closures containing Command", async () => {
  await fixture(async ({ directory, json, check }) => {
    await writeFile(
      path.join(directory, "registry/ui/command.tsx"),
      'import {Command} from "cmdk"'
    );

    const item = {
      dependencies: ["cmdk@1.1.1"],
      files: [{ path: "registry/ui/command.tsx" }],
      name: "command",
    };

    await json("registry.json", { items: [item] });
    await json("public/r/command.json", {
      dependencies: item.dependencies,
      files: [
        {
          content: 'import {Command} from "cmdk"',
          path: "registry/ui/command.tsx",
        },
      ],
    });
    await json("registry.json", {
      items: [
        { dependencies: ["@base-ui/react"], files: [], name: "button" },
        item,
      ],
    });
    assert.equal(check("--built").status, 0);
    await writeFile(
      path.join(directory, "preview/bad.tsx"),
      'import {Command} from "cmdk"'
    );
    const result = check();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /preview\/bad\.tsx: cmdk/u);
  });
});
