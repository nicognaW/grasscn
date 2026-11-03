import { test } from "bun:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  fetchPublicRegistry,
  assertRegistryInstallation,
} from "@grasscn/tests/consumer-registry";

test("public registry consumer rejects a responding host from another source build", async () => {
  const source = await mkdtemp(path.join(tmpdir(), "grasscn-public-registry-"));
  await mkdir(path.join(source, "apps/web/public/r"), { recursive: true });
  await writeFile(
    path.join(source, "apps/web/public/r/button.json"),
    JSON.stringify({ files: [{ content: "current" }], name: "button" })
  );

  const server = Bun.serve({
    fetch: () =>
      Response.json({ files: [{ content: "stale" }], name: "button" }),
    hostname: "127.0.0.1",
    port: 0,
  });

  try {
    await assert.rejects(
      fetchPublicRegistry(server.url.origin, [{ name: "button" }], source),
      /current source/u
    );
  } finally {
    await server.stop(true);
  }
});

test("CLI installed imports cannot escape into an existing external source", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "grasscn-cli-imports-"));
  const consumer = path.join(directory, "consumer");
  await mkdir(path.join(consumer, "src/components/ui"), { recursive: true });
  await writeFile(path.join(directory, "outside.ts"), "export default 1");
  await writeFile(
    path.join(consumer, "src/components/ui/button.tsx"),
    'import external from "../../../../outside"; export default external;'
  );

  const payloads = new Map([
    [
      "button",
      {
        payload: {
          files: [{ path: "registry/ui/button.tsx", type: "registry:ui" }],
          name: "button",
        },
        sha256: "unused",
        url: "http://unused.invalid/r/button.json",
      },
    ],
  ]);

  await assert.rejects(
    assertRegistryInstallation(payloads, consumer, {
      aliases: {
        components: "@/components",
        hooks: "@/hooks",
        lib: "@/lib",
        ui: "@/components/ui",
      },
    }),
    /inside consumer/u
  );
});
