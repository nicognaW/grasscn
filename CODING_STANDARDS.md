Tautological tests considered harmful.

Browser tests must have an explicit Base or Full classification, decided case by case under the [test-classification rules](docs/agents/test-classification.md) and [accepted policy](docs/adr/0002-base-and-full-tests.md). Review new or changed cases against those rules: Base cases require a recorded qualifying mapping in the Base catalogue; all cases outside that catalogue are Full. This classification applies to browser tests only.

Follow the [Ultracite skill](.agents/skills/ultracite/SKILL.md) for JS/TS code standards and Uncheck-based linting, formatting and typechecking.
