import path from "node:path";

import { defineConfig } from "@playwright/test";
import { pixelPerfectTestRoot } from "@ppt/paths";
import { baseGrep } from "@ppt/selection/suite";

const inventory =
  process.argv.includes("--list") &&
  process.env.GRASSCN_BROWSER_GUARD_COLLECTION !== "1";

const full = process.env.GRASSCN_BROWSER_SCOPE === "full";

const proxyPort = full
  ? process.env.GRASSCN_FULL_PROXY_PORT
  : process.env.GRASSCN_BROWSER_PROXY_PORT;

export default defineConfig({
  fullyParallel: false,
  globalSetup: "./src/selection/guard.ts",
  grep: inventory || full ? undefined : baseGrep(),
  grepInvert: !inventory && full ? baseGrep() : undefined,
  outputDir: path.join(pixelPerfectTestRoot, "browser"),
  testDir: "./tests",
  testIgnore: ["**/reference/**", "**/unit/**"],
  testMatch: ["**/*.spec.ts", "**/*.spec.js"],
  use: {
    baseURL: process.env.GRASSCN_FIXTURE_URL ?? "http://127.0.0.1:5174",
    browserName: "chromium",
    channel: "msedge",
    deviceScaleFactor: 1,
    launchOptions:
      proxyPort !== undefined && proxyPort !== ""
        ? {
            args: [
              `--proxy-server=http://127.0.0.1:${proxyPort}`,
              "--proxy-bypass-list=<-loopback>",
            ],
          }
        : undefined,
    proxy:
      proxyPort !== undefined && proxyPort !== ""
        ? { server: `http://127.0.0.1:${proxyPort}` }
        : undefined,
    viewport: { height: 900, width: 1280 },
  },
  webServer:
    (process.env.GRASSCN_FIXTURE_URL ?? "")
      ? undefined
      : [
          {
            command: "bun --bun vite --config vite.config.ts",
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
