import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import next from "ultracite/oxlint/next";
import nextJsPlugins from "ultracite/oxlint/next/js-plugins";
import playwright from "ultracite/oxlint/playwright";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import vitest from "ultracite/oxlint/vitest";

const jsPlugins = selectJsPlugins(["react-doctor"]);

export default defineConfig({
  env: core.env,
  extends: [
    core,
    playwright,
    react,
    next,
    vitest,
    nextJsPlugins,
    shadcn,
    antiSlop,
    jsPlugins,
  ],
  ignorePatterns: core.ignorePatterns,
  jsPlugins: [...jsPlugins.jsPlugins, ...shadcn.jsPlugins],
  options: { typeAware: true },
  overrides: [
    {
      // These trees use Bun or the public Playwright wrapper, never Vitest globals.
      files: ["packages/tests/tests/**", "packages/pixel-perfect/tests/**"],
      rules: { "vitest/prefer-importing-vitest-globals": "off" },
    },
  ],
  settings: jsPluginSettings,
});
