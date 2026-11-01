Tautological tests considered harmful.

Review tests for the regression they detect, not the number of assertions they add.

- **Independent expectations.** Derive expected results from a requirement, captured reference, public contract, or independently worked example. Computing the expectation with the same logic or data transformation as the implementation can reproduce the same bug on both sides.
- **Observable outcomes.** Exercise production behavior and assert its meaningful result. Checking a fixture's own hardcoded values, copying implementation logic into a test, or asserting source spelling usually proves only that two copies agree. Source and artifact checks are appropriate when their structure, provenance, or integrity is itself the contract.
- **Distinct coverage.** Each new case should detect a plausible failure that existing coverage would miss. Extend an existing test when it covers the same behavior; add variants for distinct boundaries, states, environments, or previously observed failures. Test count and Cartesian combinations are not goals.
- **Proportionate scope.** Use the smallest test layer that exercises the actual failure. Reserve browser tests for behavior or rendering that needs a browser, and keep one-off investigation scripts out of the permanent suite unless they protect an ongoing contract.
- **Independent visual evidence.** Preserve byte-pinned sources and captured Minecraft references for declared reference cases. A screenshot generated from the current web implementation cannot independently establish native correctness. Integrity checks preserve evidence; behavior and pixel checks establish different claims.

During review, ask: "What plausible incorrect implementation would fail this test, and where does its expected result come from?" If either answer is missing, request a stronger assertion, consolidation, or removal. Preserve distinct coverage when consolidating tests.
