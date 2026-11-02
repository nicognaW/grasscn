import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { pipeline } from "node:stream";

import {
  repoRoot,
  testRoot,
  fixtureRoot,
  fixtureFile,
  repositoryFile,
} from "@tests/paths";

const root = repoRoot;

export const fixtureDirectory = repositoryFile(
  path.join(".pixel-perfect-test", "production-fixture", "dist")
);

const fallbackDirectory = fixtureRoot;
const skins = ["dream-skin.png", "steve-skin.png"];
const digest = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const types = new Map([
  [".css", "text/css;charset=utf-8"],
  [".html", "text/html;charset=utf-8"],
  [".js", "text/javascript;charset=utf-8"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

export function fixtureManifest(
  directory = fixtureDirectory,
  fallback = fallbackDirectory
) {
  const files: { path: string; sha256: string }[] = [];

  function visit(folder: string) {
    for (const name of fs.readdirSync(folder).sort()) {
      const file = path.join(folder, name);
      const info = fs.lstatSync(file);

      assert.ok(
        !info.isSymbolicLink(),
        "Fixture bundles must not contain symlinks"
      );

      if (info.isDirectory()) {
        visit(file);
      } else {
        files.push({
          path: path.relative(directory, file).split(path.sep).join("/"),
          sha256: digest(fs.readFileSync(file)),
        });
      }
    }
  }

  visit(directory);

  const fallbackFiles = skins.map((name) => ({
    name,
    sha256: digest(fs.readFileSync(path.join(fallback, name))),
  }));

  return {
    directory,
    fallbackFiles,
    files,
    sha256: digest(
      JSON.stringify(
        Object.fromEntries([
          ["files", files],
          ["fallbackFiles", fallbackFiles],
        ])
      )
    ),
  };
}

export async function buildProductionFixture() {
  // Vite empties this output directory. Check its resolved target before allowing that.
  const intended = repositoryFile(path.join(".pixel-perfect-test")) + path.sep;
  assert.ok(path.resolve(fixtureDirectory).startsWith(intended));

  if (fs.existsSync(fixtureDirectory)) {
    assert.ok(
      fs
        .realpathSync(fixtureDirectory)
        .startsWith(fs.realpathSync(root) + path.sep)
    );
  }

  const { build } = await import("vite");
  await build({
    build: {
      emptyOutDir: true,
      outDir: fixtureDirectory,
      rolldownOptions: {
        input: {
          adventure: fixtureFile("adventure.html"),
          index: fixtureFile("index.html"),
        },
      },
    },
    cacheDir: repositoryFile(
      path.join(".pixel-perfect-test", "production-fixture", "cache")
    ),
    configFile: path.join(testRoot, "vite.config.ts"),
  });

  return fixtureManifest();
}

export async function serveProductionFixture({
  directory = fixtureDirectory,
  fallback = fallbackDirectory,
  port = 5178,
}: { directory?: string; fallback?: string; port?: number } = {}) {
  const server = http.createServer((request, response) => {
    try {
      const name =
        decodeURIComponent(
          new URL(
            // SAFETY: Node HTTP server requests provide url; the optional declaration also covers client responses.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The native HTTP server request owns this URL.
            request.url as string,
            "http://127.0.0.1"
          ).pathname
        ).replace(/^\/+/u, "") || "index.html";

      let file = path.resolve(directory, name);

      if (!file.startsWith(path.resolve(directory) + path.sep)) {
        throw new Error("Outside fixture directory");
      }

      if (skins.includes(name) && !fs.existsSync(file)) {
        file = path.join(fallback, name);
      }

      if (!fs.statSync(file).isFile()) {
        throw new Error("Not a file");
      }

      response.setHeader(
        "Content-Type",
        types.get(path.extname(file)) ?? "application/octet-stream"
      );
      response.setHeader(
        "Cache-Control",
        path.extname(file) === ".html" ? "no-store" : "public,max-age=3600"
      );
      pipeline(fs.createReadStream(file), response, () => {
        /* empty */
      });
    } catch {
      response.statusCode = 404;
      response.end("Not found");
    }
  });

  const listening = Promise.withResolvers<void>();

  try {
    server.once("error", listening.reject);
    server.listen(port, "127.0.0.1", listening.resolve);
  } catch (error) {
    listening.reject(error);
  }

  await listening.promise;

  // SAFETY: listening on a numeric TCP port guarantees an AddressInfo rather than a pipe address or null.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The listening lifecycle establishes the native server address kind.
  const address = server.address() as AddressInfo;

  return {
    close: async () => {
      server.closeAllConnections();
      // oxlint-disable-next-line promise/avoid-new -- Preserve the existing close callback contract, including resolution on close errors.
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    },
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
}
