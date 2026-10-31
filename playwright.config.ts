import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  testMatch: ["*.spec.ts", "*.spec.js"],
  fullyParallel: false,
  workers: 8,
  use: {
    baseURL: process.env.GRASSCN_FIXTURE_URL ?? "http://127.0.0.1:5174",
    browserName: "chromium",
    channel: "msedge",
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  },
  webServer: process.env.GRASSCN_FIXTURE_URL ? undefined : [
    { command: "node node_modules/vite/bin/vite.js", url: "http://127.0.0.1:5174", reuseExistingServer: !process.env.CI },
    { command: "npm run preview", url: "http://127.0.0.1:5176", reuseExistingServer: !process.env.CI },
  ],
})
