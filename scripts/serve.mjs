import { createServer } from "node:http"
import { readFile } from "node:fs/promises"

const port = Number(process.env.PORT || 5173)
const root = new URL("../public/r/", import.meta.url)

createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end()
    return
  }
  // Serve only registry JSON, never source files or HTML.
  const match = /^\/r\/([a-zA-Z0-9_-]+\.json)$/.exec(pathname)
  if (!match) {
    response.writeHead(404, { "Content-Type": "application/json" })
    response.end(JSON.stringify({ error: "Not found. Catalog: /r/registry.json" }))
    return
  }
  try {
    const content = await readFile(new URL(match[1], root))
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
    response.end(request.method === "HEAD" ? undefined : content)
  } catch (error) {
    const status = error.code === "ENOENT" ? 404 : 500
    response.writeHead(status, { "Content-Type": "application/json" })
    response.end(JSON.stringify({ error: status === 404 ? "Registry item not found" : "Unable to read registry" }))
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Registry catalog: http://localhost:${port}/r/registry.json`)
  console.log(`Button: http://localhost:${port}/r/button.json`)
})
