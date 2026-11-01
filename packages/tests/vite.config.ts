import { defineConfig } from "vite"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "node:url"

export default defineConfig({
  root: fileURLToPath(new URL("./tests/fixture", import.meta.url)),
  cacheDir: fileURLToPath(new URL("./node_modules/.vite/registry-fixture", import.meta.url)),
  plugins: [tailwindcss()],
  resolve: { alias: { "@/lib/utils": fileURLToPath(new URL("./tests/fixture/utils.ts", import.meta.url)), "@/components/ui": fileURLToPath(new URL("../../apps/web/registry/ui", import.meta.url)) } },
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
})
