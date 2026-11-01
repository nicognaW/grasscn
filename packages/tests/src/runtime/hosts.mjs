import { readFile } from "node:fs/promises";
import http from "node:http";
import { createConnection } from "node:net";
import path from "node:path";

import { serveProductionFixture } from "@grasscn/tests/fixture";
import { webRoot } from "@tests/paths";

import {
  isolatedHttpTarget,
  isolatedTunnelTarget,
} from "./isolated-host-routing.mjs";
import { serveNextProduction } from "./next-production.mjs";

// Preserve absolute legacy loopback URLs without reading the mutable foreground
// preview or changing test source. All browser HTTP traffic stays in this Job.
/** @param {import("./isolated-host-routing.mjs").HostExecution} execution - Owned loopback ports. */
export const serveVerificationHosts = async (execution) => {
  const { fixturePort, previewPort, proxyPort } = execution;
  /** @type {Set<import("node:net").Socket>} */
  const sockets = new Set();

  /** @param {import("node:net").Socket} socket - Owned connection. */
  const track = (socket) => {
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

  /** @type {Awaited<ReturnType<typeof serveProductionFixture>> | undefined} */
  let fixture;
  /** @type {Awaited<ReturnType<typeof serveNextProduction>> | undefined} */
  let preview;
  /** @type {import("node:http").Server | undefined} */
  let proxy;

  try {
    fixture = await serveProductionFixture({ port: fixturePort });
    preview = await serveNextProduction({ port: previewPort });
    proxy = http.createServer(async (request, response) => {
      let target;

      try {
        target = new URL(request.url ?? "", `http://${request.headers.host}`);

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

          const match = /^\/r\/(?<file>[a-zA-Z0-9_-]+\.json)$/u.exec(
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
              path.join(webRoot, "public/r", match.groups.file)
            );

            response
              .writeHead(200, {
                "Content-Type": "application/json; charset=utf-8",
              })
              .end(request.method === "HEAD" ? undefined : content);
          } catch (error) {
            response
              .writeHead(
                error instanceof Error &&
                  "code" in error &&
                  error.code === "ENOENT"
                  ? 404
                  : 500,
                {
                  "Content-Type": "application/json",
                }
              )
              .end(
                request.method === "HEAD"
                  ? undefined
                  : JSON.stringify({
                      error:
                        error instanceof Error &&
                        "code" in error &&
                        error.code === "ENOENT"
                          ? "Registry item not found"
                          : "Unable to read registry",
                    })
              );
          }

          return;
        }

        target = isolatedHttpTarget(
          request.url ?? "",
          request.headers.host ?? "",
          execution
        );
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
    proxy.on("connection", track);
    proxy.on("connect", (request, socket, head) => {
      // Playwright APIRequestContext tunnels HTTP too. Restrict CONNECT to the
      // same owned HTTP hosts; the virtual registry loops into our strict handler.
      let port;

      try {
        port = isolatedTunnelTarget(request.url ?? "", execution);
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

      upstream.on("error", () => socket.destroy());
      socket.on("error", () => upstream.destroy());
      socket.once("close", () => upstream.destroy());
      upstream.once("close", () => socket.destroy());
    });
    await new Promise((resolve, reject) => {
      proxy.once("error", reject);
      proxy.listen(proxyPort, "127.0.0.1", resolve);
    });

    return {
      close: async () => {
        closeSockets();
        proxy.closeAllConnections();
        await new Promise((resolve) => proxy.close(resolve));
        await preview.close();
        await fixture.close();
      },
      fixtureBundleUrl: fixture.url,
      websiteIdentity: preview.identity,
    };
  } catch (error) {
    closeSockets();
    proxy?.closeAllConnections();
    proxy?.close();
    await preview?.close();
    await fixture?.close();
    throw error;
  }
};
