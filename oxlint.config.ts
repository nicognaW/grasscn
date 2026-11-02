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

import { generatedCode } from "./tooling-scope.mjs";

// Next-only rules target the application directories introduced by #23,
// never reusable registry components or test fixtures.

const jsPlugins = selectJsPlugins(["react-doctor"]);

export default defineConfig({
  env: core.env,
  extends: [core, playwright, react, vitest, shadcn, antiSlop, jsPlugins],
  ignorePatterns: [...(core.ignorePatterns ?? []), ...generatedCode],
  jsPlugins: [...jsPlugins.jsPlugins, ...shadcn.jsPlugins],
  options: { typeAware: true },
  overrides: [
    {
      // Recharts invokes this renderer directly; retain the default render* props.
      files: ["**/apps/web/registry/blocks/chart-fps.tsx"],
      rules: {
        "react/no-unstable-nested-components": [
          "error",
          { propNamePattern: "{render*,shape}" },
        ],
      },
    },
    {
      // Compile-only contracts test accepted public props, not rendered styles.
      files: ["**/packages/tests/tests/components/**/*-api.types.tsx"],
      rules: {
        "shadcn/no-inline-styles": "off",
        "shadcn/no-unknown-classes": "off",
      },
    },
    {
      // Existing behavior assertion proves caller class forwarding to the inner node.
      files: ["**/packages/tests/fixtures/renderer/text-widgets.tsx"],
      rules: {
        "shadcn/no-unknown-classes": ["error", { allow: ["caller-content"] }],
      },
    },
    {
      // Existing behavior assertion proves caller class forwarding.
      files: ["**/packages/tests/fixtures/renderer/dialog-footer.tsx"],
      rules: {
        "shadcn/no-unknown-classes": ["error", { allow: ["custom-footer"] }],
      },
    },
    {
      // Existing behavior assertion proves caller class forwarding.
      files: ["**/packages/tests/fixtures/renderer/alert-dialog-media.tsx"],
      rules: {
        "shadcn/no-unknown-classes": ["error", { allow: ["caller-media"] }],
      },
    },
    {
      files: ["**/apps/web/{app,components,lib}/**/*.{ts,tsx}"],
      plugins: ["nextjs"],
      rules: { ...next.rules, ...nextJsPlugins.rules },
    },
    {
      files: [
        "**/packages/tests/tests/**/*.{test,spec}.{ts,tsx,js,mjs}",
        "**/packages/pixel-perfect/tests/**/*.{test,spec}.{ts,tsx,js,mjs}",
      ],
      plugins: ["vitest"],
      // These suites import their actual Bun/Playwright APIs, not Vitest.
      rules: { "vitest/prefer-importing-vitest-globals": "off" },
    },
    {
      files: [
        "**/packages/tests/tests/**/*.spec.{ts,tsx,js,mjs}",
        "**/packages/pixel-perfect/tests/**/*.spec.{ts,tsx,js,mjs}",
      ],
      plugins: ["vitest"],
      rules: {
        // Keep filename validation with Playwright-compatible .spec/.test names.
        "vitest/consistent-test-filename": [
          "error",
          { pattern: ".*\\.(?:test|spec)\\.[cm]?[jt]sx?$" },
        ],
        // Playwright has no test.each API; its supported form is a loop.
        "vitest/prefer-each": "off",
      },
    },
    {
      // Mirror Ultracite's documented component-source owner exception.
      files: ["**/apps/web/registry/ui/**"],
      rules: {
        "shadcn/no-arbitrary-values": "off",
        "shadcn/no-restyle": "off",
        "shadcn/require-static-classes": "off",
      },
    },
  ],
  settings: jsPluginSettings,
});
