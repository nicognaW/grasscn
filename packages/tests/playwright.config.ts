import path from "node:path";

import { defineConfig } from "@playwright/test";
import { repoRoot } from "@tests/paths";

// General tests always participate in ordinary verification; PPT selection does not apply.
export default defineConfig({
  fullyParallel: false,
  outputDir: path.join(repoRoot, "test-results/general"),
  testDir: "./tests",
  testIgnore: ["**/reference/**", "**/unit/**"],
  testMatch: ["**/*.spec.ts", "**/*.spec.js"],
  use: {
    baseURL: process.env.GRASSCN_FIXTURE_URL ?? "http://127.0.0.1:5174",
    browserName: "chromium",
    channel: "msedge",
    deviceScaleFactor: 1,
    launchOptions:
      (process.env.GRASSCN_BROWSER_PROXY_PORT?.length ?? 0) > 0
        ? {
            args: [
              `--proxy-server=http://127.0.0.1:${process.env.GRASSCN_BROWSER_PROXY_PORT}`,
              "--proxy-bypass-list=<-loopback>",
            ],
          }
        : undefined,
    proxy:
      (process.env.GRASSCN_BROWSER_PROXY_PORT?.length ?? 0) > 0
        ? {
            server: `http://127.0.0.1:${process.env.GRASSCN_BROWSER_PROXY_PORT}`,
          }
        : undefined,
    viewport: { height: 900, width: 1280 },
  },
  webServer:
    (process.env.GRASSCN_FIXTURE_URL ?? "")
      ? undefined
      : [
          {
            command: "bun run dev",
            url: "http://127.0.0.1:5174",
            reuseExistingServer: !(process.env.CI ?? ""),
          },
          {
            command: "bun run --cwd ../../apps/web dev",
            url: "http://127.0.0.1:5176",
            reuseExistingServer: !(process.env.CI ?? ""),
          },
        ],
  workers: 1,
});
