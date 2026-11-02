import { readFile } from "node:fs/promises";
import http from "node:http";
import { createConnection } from "node:net";
import path from "node:path";
import type { Duplex } from "node:stream";

import { serveProductionFixture } from "@grasscn/tests/fixture";
import { webRoot } from "@tests/paths";
import type { PreviewServer } from "vite";

const isMissingRegistryItem = (
  error: unknown
): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

// Preserve absolute legacy loopback URLs without reading the mutable foreground
// preview or changing test source. All browser HTTP traffic stays in this Job.
export async function serveVerificationHosts({
  fixturePort,
  previewPort,
  proxyPort,
}: {
  fixturePort: number;
  previewPort: number;
  proxyPort: number;
}) {
  const owned = new Set([fixturePort, previewPort]);

  const map = new Map([
    [5174, fixturePort],
    [5178, fixturePort],
    [5176, previewPort],
  ]);

  const sockets = new Set<Duplex>();

  const track = <Socket extends Duplex>(socket: Socket) => {
    sockets.add(socket);
    socket.once("close", () => {
      sockets.delete(socket);
    });

    return socket;
  };

  const closeSockets = () => {
    for (const socket of sockets) {
      socket.destroy();
    }
  };

  let fixture: Awaited<ReturnType<typeof serveProductionFixture>> | undefined;
  let preview: PreviewServer | undefined;
  let proxy: http.Server | undefined;

  try {
    fixture = await serveProductionFixture({ port: fixturePort });
    const { preview: startPreview } = await import("vite");
    preview = await startPreview({
      configFile: path.join(webRoot, "vite.config.ts"),
      preview: { host: "127.0.0.1", port: previewPort, strictPort: true },
    });

    const proxyServer = http.createServer(async (request, response) => {
      let target;

      try {
        target = new URL(
          // SAFETY: IncomingMessage.url is present for native HTTP server requests.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Preserve the server API URL and existing invalid-route catch behavior.
          request.url as string,
          `http://${request.headers.host}`
        );

        if (
          target.protocol !== "http:" ||
          !["127.0.0.1", "localhost"].includes(target.hostname)
        ) {
          throw new Error("Unowned browser request");
        }

        // The registry uses strict JSON routes, independently of Vite's SPA fallback.
        if (target.port === "5173") {
          if (!["GET", "HEAD"].includes(request.method ?? "")) {
            response.writeHead(405, { Allow: "GET, HEAD" }).end();

            return;
          }

          const match = /^\/r\/(?<item>[a-zA-Z0-9_-]+\.json)$/u.exec(
            target.pathname
          );

          if (!match) {
            response
              .writeHead(404, { "Content-Type": "application/json" })
              .end(JSON.stringify({ error: "Registry item not found" }));

            return;
          }

          try {
            const content = await readFile(
              path.join(webRoot, "public/r", match[1])
            );

            response
              .writeHead(200, {
                "Content-Type": "application/json; charset=utf-8",
              })
              .end(request.method === "HEAD" ? undefined : content);
          } catch (error) {
            response
              .writeHead(isMissingRegistryItem(error) ? 404 : 500, {
                "Content-Type": "application/json",
              })
              .end(
                request.method === "HEAD"
                  ? undefined
                  : JSON.stringify({
                      error: isMissingRegistryItem(error)
                        ? "Registry item not found"
                        : "Unable to read registry",
                    })
              );
          }

          return;
        }

        const port = map.get(Number(target.port)) ?? Number(target.port);

        if (!owned.has(port)) {
          throw new Error("Unowned browser port");
        }

        target.hostname = "127.0.0.1";
        target.port = String(port);
      } catch {
        response.writeHead(502);
        response.end("Verification only serves its isolated snapshot");

        return;
      }

      const upstream = http.request(
        target,
        {
          headers: { ...request.headers, host: target.host },
          method: request.method,
        },
        (incoming) => {
          response.writeHead(incoming.statusCode ?? 502, incoming.headers);
          incoming.pipe(response);
        }
      );

      upstream.on("error", () => {
        if (!response.headersSent) {
          response.writeHead(502);
        }

        response.end();
      });
      request.pipe(upstream);
    });

    proxyServer.on("connection", track);
    proxyServer.on("connect", (request, socket, head) => {
      // Playwright APIRequestContext tunnels HTTP too. Restrict CONNECT to the
      // same owned HTTP hosts; the virtual registry loops into our strict handler.
      let port;

      try {
        const target = new URL(`http://${request.url}`);

        if (
          !["127.0.0.1", "localhost"].includes(target.hostname) ||
          target.host !== request.url
        ) {
          throw new Error("Unowned tunnel");
        }

        port =
          target.port === "5173"
            ? proxyPort
            : (map.get(Number(target.port)) ?? Number(target.port));

        if (target.port !== "5173" && !owned.has(port)) {
          throw new Error("Unowned tunnel port");
        }
      } catch {
        socket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");

        return;
      }

      const upstream = track(
        createConnection({ host: "127.0.0.1", port }, () => {
          socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");

          if (head.length) {
            upstream.write(head);
          }

          socket.pipe(upstream);
          upstream.pipe(socket);
        })
      );

      upstream.on("error", () => {
        socket.destroy();
      });
      socket.on("error", () => {
        upstream.destroy();
      });
      socket.once("close", () => {
        upstream.destroy();
      });
      upstream.once("close", () => {
        socket.destroy();
      });
    });
    proxy = proxyServer;
    const listening = Promise.withResolvers<void>();

    try {
      proxyServer.once("error", listening.reject);
      proxyServer.listen(proxyPort, "127.0.0.1", listening.resolve);
    } catch (error) {
      listening.reject(error);
    }

    await listening.promise;
    const ownedFixture = fixture;
    const ownedPreview = preview;

    return {
      close: async () => {
        closeSockets();
        proxyServer.closeAllConnections();
        // oxlint-disable-next-line promise/avoid-new -- The existing adapter deliberately resolves even if close reports an error.
        await new Promise<void>((resolve) => {
          proxyServer.close(() => {
            resolve();
          });
        });
        // oxlint-disable-next-line promise/avoid-new -- Preserve existing close completion and ignored callback errors.
        await new Promise<void>((resolve) => {
          ownedPreview.httpServer.close(() => {
            resolve();
          });
        });
        await ownedFixture.close();
      },
      fixtureBundleUrl: fixture.url,
    };
  } catch (error) {
    closeSockets();
    proxy?.closeAllConnections();
    proxy?.close();

    if (preview) {
      const ownedPreview = preview;
      // oxlint-disable-next-line promise/avoid-new -- Cleanup preserves the existing resolve-on-close-callback behavior.
      await new Promise<void>((resolve) => {
        ownedPreview.httpServer.close(() => {
          resolve();
        });
      });
    }

    await fixture?.close();
    throw error;
  }
}
