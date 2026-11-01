import { defineConfig } from "vite"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "node:url"
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  cacheDir: fileURLToPath(new URL("./node_modules/.vite/registry-preview", import.meta.url)),
  plugins: [tailwindcss()],
  resolve: { alias: { "@/lib/utils": fileURLToPath(new URL("./utils.ts", import.meta.url)), "@/components/ui": fileURLToPath(new URL("./registry/ui", import.meta.url)) } },
  server: { host: "127.0.0.1", port: 5176, strictPort: true },
  build: { outDir: fileURLToPath(new URL("./dist", import.meta.url)), emptyOutDir: true },
})
