import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

interface RegistryServerRequest extends IncomingMessage {
  url: string;
}

const portText = process.env.PORT ?? "";
const port = Number(portText === "" ? 5173 : portText);
const root = new URL("../public/r/", import.meta.url);

const serveRegistryRequest = async (
  request: IncomingMessage,
  response: ServerResponse
) => {
  const { pathname } = new URL(
    // SAFETY: Node's Server request event supplies the request-target URL; client response messages are the variant without this field.
    // eslint-disable-next-line typescript/no-unsafe-type-assertion -- This local server-request view expresses the actual Node producer contract without changing URL parsing.
    (request as RegistryServerRequest).url,
    "http://localhost"
  );

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();

    return;
  }

  // Serve only registry JSON, never source files or HTML.
  const match = /^\/r\/(?<filename>[a-zA-Z0-9_-]+\.json)$/u.exec(pathname);

  if (!match) {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({ error: "Not found. Catalog: /r/registry.json" })
    );

    return;
  }

  try {
    const content = await readFile(new URL(match[1], root));
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    const status =
      // SAFETY: Native readFile/ServerResponse errors carry an optional errno code; missing codes retain the existing 500 path.
      // eslint-disable-next-line typescript/no-unsafe-type-assertion -- This local view is the actual Node operation error contract; no runtime validation or catch behavior changes.
      (error as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500;

    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        error:
          status === 404
            ? "Registry item not found"
            : "Unable to read registry",
      })
    );
  }
};

createServer((request, response) => {
  // oxlint-disable-next-line promise/prefer-await-to-callbacks, anti-slop/no-unknown-parameters -- Node owns a synchronous void request listener; this rejection callback owns the async handler failure. Rejections are unknown values logged unchanged before destroying only this response.
  serveRegistryRequest(request, response).catch((error: unknown) => {
    console.error("Registry request failed", error);
    response.destroy();
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Registry catalog: http://localhost:${port}/r/registry.json`);
  console.log(`Button: http://localhost:${port}/r/button.json`);
});
