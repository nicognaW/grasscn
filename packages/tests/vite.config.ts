import path from "node:path";

import { repoRoot, fixtureRoot, testRoot, webRoot } from "@grasscn/tests/paths";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  root: fixtureRoot,
  cacheDir: path.join(repoRoot, ".pixel-perfect-test/vite/registry-fixture"),
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@/lib/utils": path.join(fixtureRoot, "utils.ts"),
      "@/components/ui": path.join(webRoot, "registry/ui"),
      "@tests": path.join(testRoot, "src"),
    },
  },
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
});
