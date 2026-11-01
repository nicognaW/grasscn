---
status: accepted
---

# Adopt Bun and a shadcn-aligned Turborepo structure

Pin an exact Bun version and use Bun as both package manager and runtime. Adopt a Turborepo monorepo whose responsibility boundaries follow upstream shadcn where applicable, keeping authored component sources in apps/web/registry and shared testing infrastructure, rendering fixtures and non-PPT cases in packages/tests, with specialized Pixel Perfect Tests, captured references and Full-run policy in packages/pixel-perfect. The PPT package depends on the shared general testing interfaces; the general package does not depend on PPT implementation. Registry generation and website builds remain separate tasks with explicit dependencies. Shared configuration stays at the root; introduce additional packages only for actual shared responsibilities.

Retain the newly added Ultracite/Oxc, Uncheck and editor tooling. Invoke Uncheck with bunx --bun uncheck for workspace linting, formatting and typechecking, with --fix when fixes are intended, rather than introducing package scripts for those checks. Hooks use the same Bun runtime. Uncheck owns workspace check discovery; Turbo owns generation, builds and tests. Migrate Node-run unit tests to Bun's test runner and retain Playwright for browser testing. Keep the Vite website in this migration; Next.js and Fumadocs/MDX are possible future changes.

Cache deterministic generation and builds through Turbo. Uncheck runs directly outside Turbo and does not receive Turbo caching. Browser/game captures and independent-consumer verification execute without Turbo caching, retaining their source-bound checkpoint requirements.

On a fresh checkout, run bunx turbo run generate before bunx --bun uncheck so required website catalogs exist before typechecking. Uncheck does not infer generation prerequisites; Turbo owns that explicit preparation step.

This layout follows upstream's actual responsibilities: shadcn authors components in apps/v4/registry, whereas its packages/registry implements fetching, resolution and installation. Grasscn does not need a matching fetch/install library package for this migration. Bun compatibility with Uncheck and the other existing tools must be demonstrated during implementation rather than inferred from invoking bunx.

The user confirmed the shared design and subsequently invoked implement-spec to authorize implementation and the agreed installation/build/Base verification workflow. Full runs retain their separate human-approval and independent-session requirements.

The captured-reference requirements in ADR 0001 remain in force. Dependency-policy checks and source-bound verification records use Bun-aware graph and installed-byte identities, preserving their guarantees after retiring npm's lockfile.

The toolchain pins Bun 1.4.4 and Turbo 2.11.10. Upstream's earlier Turbo 2.9.18 cannot parse Bun's version-2 lockfile, so retaining that version would lose workspace dependency analysis. A small Bun dependency patch makes Uncheck 0.1.1 generate explicitly Bun-run hooks; its default bare bunx command otherwise follows Node shebangs despite the Bun runtime configuration.
