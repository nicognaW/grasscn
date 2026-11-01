import path from 'node:path'
import {pixelPerfectTestRoot} from '@ppt/paths'
import { defineConfig } from "@playwright/test"
import {baseGrep} from '@ppt/selection/suite.mjs'

const inventory = process.argv.includes('--list') && process.env.GRASSCN_BROWSER_GUARD_COLLECTION !== '1'
const full = process.env.GRASSCN_BROWSER_SCOPE === 'full'
const proxyPort = full ? process.env.GRASSCN_FULL_PROXY_PORT : process.env.GRASSCN_BROWSER_PROXY_PORT

export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/reference/**", "**/unit/**"],
  outputDir: path.join(pixelPerfectTestRoot, "browser"),
  testMatch: ["**/*.spec.ts", "**/*.spec.js"],
  fullyParallel: false,
  workers: 1,
  grep: inventory || full ? undefined : baseGrep(),
  grepInvert: !inventory && full ? baseGrep() : undefined,
  globalSetup: './src/selection/guard.mjs',
  use: {
    baseURL: process.env.GRASSCN_FIXTURE_URL ?? "http://127.0.0.1:5174",
    browserName: "chromium",
    channel: "msedge",
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    proxy: proxyPort ? {server: `http://127.0.0.1:${proxyPort}`} : undefined,
    launchOptions: proxyPort ? {args: [`--proxy-server=http://127.0.0.1:${proxyPort}`, '--proxy-bypass-list=<-loopback>']} : undefined,
  },
  webServer: process.env.GRASSCN_FIXTURE_URL ? undefined : [
    { command: "bun --bun vite --config vite.config.ts", url: "http://127.0.0.1:5174", reuseExistingServer: !process.env.CI },
    { command: "bun run --cwd ../../apps/web dev", url: "http://127.0.0.1:5176", reuseExistingServer: !process.env.CI },
  ],
})
