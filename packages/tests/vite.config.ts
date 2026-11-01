import path from "node:path";

import { repoRoot, fixtureRoot, testRoot, webRoot } from "@grasscn/tests/paths";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  cacheDir: path.join(repoRoot, ".pixel-perfect-test/vite/registry-fixture"),
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@/components/ui": path.join(webRoot, "registry/ui"),
      "@/lib/utils": path.join(fixtureRoot, "utils.ts"),
      "@tests": path.join(testRoot, "src"),
    },
  },
  root: fixtureRoot,
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
});
