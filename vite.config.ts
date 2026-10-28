import { defineConfig } from "vite"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "node:url"

export default defineConfig({
  root: "tests/fixture",
  plugins: [tailwindcss()],
  resolve: { alias: { "@/lib/utils": fileURLToPath(new URL("./tests/fixture/utils.ts", import.meta.url)) } },
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
})
