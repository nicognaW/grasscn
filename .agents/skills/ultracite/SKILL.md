---
name: ultracite
description: "Use when writing or reviewing JS/TS under Ultracite presets, running lint/format/type checks through Uncheck, or troubleshooting that setup."
---

# Ultracite with Uncheck

Ultracite supplies linting and formatting presets. Uncheck runs the installed Oxlint, Oxfmt and TypeScript tools using the repository's configuration; it also runs Sherif when installed at the workspace root. Keep Ultracite preset imports and use Uncheck as the check/fix entrypoint.

## Repository workflow

Run from the canonical repository root with the pinned Bun package manager and runtime. Read `package.json`, the lockfile, `oxlint.config.*`, `oxfmt.config.*` and relevant `tsconfig.json` files to identify the installed versions, presets and project boundaries. Uncheck discovers the workspace checks; Turbo owns generation, builds and tests.

On a fresh checkout, generate required inputs before checking:

```sh
bunx turbo run generate
bun x --bun uncheck
```

## Commands

```sh
# Check lint, formatting and types without applying fixes
bun x --bun uncheck

# Apply supported fixes and report remaining errors
bun x --bun uncheck --fix

# Check specific paths
bun x --bun uncheck apps/web/registry

# Run only a required workspace typecheck
bun x --bun uncheck --only=tsc --require=tsc

# Check staged files; --fix also stages its fixes
bun x --bun uncheck staged

# Refresh the existing pre-commit hook when hook changes are requested
bun x --bun uncheck prepare --pre-commit
```

Use `--only=oxlint` or `--only=oxfmt` to isolate lint or format failures. These flags are repeatable; use `--require` when a skipped check must fail. Consult `bun x --bun uncheck --help` and subcommand help for supported options. Backend-specific flags are not automatically Uncheck options.

Keep the explicit `--bun`: the repository's Uncheck dependency patch also ensures generated hooks use Bun. Preserve existing hook content and the patch when changing setup.

## Presets and setup changes

Keep existing Ultracite imports, framework presets, plugin selection and local overrides in the Oxlint/Oxfmt configuration. Respect the configured formatter settings. Uncheck orchestrates tools; its optional presets do not replace the repository's selected Ultracite presets.

When adding, moving or removing generated outputs, update the shared exact-path list in `tooling-scope.ts` using generation or derivation evidence. Keep authored generators checked and generated outputs typechecked; preserve the flat shadcn registry layout.

For requested setup changes, add the necessary devDependencies with Bun and edit the existing configuration directly. Consult `bun x --bun uncheck init --help` if initial setup is needed; review its script and preset choices against the repository convention of direct Uncheck commands. Existing projects use `prepare` for hook maintenance.

## Code Standards

When writing code in a project with Ultracite, follow these standards. For the full rules reference, see [references/code-standards.md](references/code-standards.md).

Key rules at a glance:

Formatting is handled by the project's configured linter/formatter. Respect the repository's existing formatter settings instead of forcing one fixed line width, quote style, or trailing comma policy.

**Type safety:** Use explicit types when they improve clarity. Prefer `unknown` over `any`. Use `as const` for immutable values and rely on type narrowing over blunt assertions.

**Modern JavaScript/TypeScript:** Prefer `const`, destructuring, optional chaining, nullish coalescing, template literals, `for...of`, and concise arrow functions.

**Async and correctness:** Always `await` promises in async functions. Prefer `async/await` over promise chains. Remove `console.log`, `debugger`, and `alert` from production code.

**React and accessibility:** Use function components, keep hooks top-level with correct deps, avoid nested component definitions, and use semantic HTML with the right labels, headings, alt text, and keyboard affordances.

**Organization, security, performance, and testing:** Keep functions focused, prefer early returns, avoid `dangerouslySetInnerHTML` and `eval()`, prefer specific imports and top-level regex, and keep tests free of `.only` and `.skip`.

## Troubleshooting

Run the relevant Uncheck check and distinguish configuration-load failures, missing tools, rule violations, formatting differences and type errors. A tool that cannot load its configuration has not checked the code.

- **Missing generated inputs:** run Turbo generation before typechecking.
- **Missing tools:** compare installed dependencies with the pinned lockfile; restore the frozen Bun install when needed. Use `--require` to detect unexpectedly skipped checks.
- **Configuration failures:** inspect preset exports, plugin dependencies and compatible versions before editing source or weakening rules.
- **Rules not applying:** verify the selected presets, overrides and ignore patterns in the active config.
- **Formatting differences:** apply fixes to the requested scope with `bun x --bun uncheck --fix <paths>`.

Report the checks actually run and any failures left unresolved. A lint/format/typecheck pass does not establish build, browser or captured-reference coverage.
