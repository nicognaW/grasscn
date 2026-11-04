import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";

interface RegistryServerRequest extends IncomingMessage {
  url: string;
}

const portText = process.env.PORT ?? "";
const port = Number(portText === "" ? 5173 : portText);
const root = new URL("../public/r/", import.meta.url);

createServer(async (request, response) => {
  const pathname = new URL(
    // SAFETY: Node's Server request event supplies the request-target URL; client response messages are the variant without this field.
    // eslint-disable-next-line typescript/no-unsafe-type-assertion -- This local server-request view expresses the actual Node producer contract without changing URL parsing.
    (request as RegistryServerRequest).url,
    "http://localhost"
  ).pathname;

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();

    return;
  }

  // Serve only registry JSON, never source files or HTML.
  const match = /^\/r\/([a-zA-Z0-9_-]+\.json)$/u.exec(pathname);

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
}).listen(port, "127.0.0.1", () => {
  console.log(`Registry catalog: http://localhost:${port}/r/registry.json`);
  console.log(`Button: http://localhost:${port}/r/button.json`);
});
