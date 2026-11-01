import { defineConfig } from "@playwright/test"
import {baseGrep} from './scripts/browser-suite.mjs'

const inventory = process.argv.includes('--list') && process.env.GRASSCN_BROWSER_GUARD_COLLECTION !== '1'

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results/browser",
  testMatch: ["*.spec.ts", "*.spec.js"],
  fullyParallel: false,
  workers: 8,
  grep: inventory ? undefined : baseGrep(),
  globalSetup: './scripts/browser-selection-guard.mjs',
  use: {
    baseURL: process.env.GRASSCN_FIXTURE_URL ?? "http://127.0.0.1:5174",
    browserName: "chromium",
    channel: "msedge",
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  },
  webServer: process.env.GRASSCN_FIXTURE_URL ? undefined : [
    { command: "node node_modules/vite/bin/vite.js", url: "http://127.0.0.1:5174", reuseExistingServer: !process.env.CI },
    { command: "npm run dev", url: "http://127.0.0.1:5176", reuseExistingServer: !process.env.CI },
  ],
})
