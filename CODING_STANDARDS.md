Tautological tests considered harmful.

Pixel Perfect Tests, website tests and component behavior tests in the shared suite must have an explicit Base or Full classification, decided case by case under the [test-classification rules](docs/agents/test-classification.md) and [accepted policy](docs/adr/0002-base-and-full-tests.md). Review new or changed cases against those rules: Base cases require a recorded qualifying mapping in the Base catalogue; all cases outside that catalogue are Full. Type checks, builds and tooling unit tests remain outside this classification.

Follow the [Ultracite skill](.agents/skills/ultracite/SKILL.md) for JS/TS code standards and Uncheck-based linting, formatting and typechecking.
