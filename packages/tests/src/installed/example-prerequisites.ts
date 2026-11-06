import assert from "node:assert/strict";

/**
 * Reject copied imports absent from this example's visitor-declared installation, even if another example installs them.
 * @param {string} code - Actual copied example.
 * @param {string[]} items - Items linked beside this example.
 * @param {{name: string, files: {destination: string}[]}[]} manifests - Public installation inventory.
 */
export const assertExamplePrerequisites = (
  code: string,
  items: string[],
  manifests: { name: string; files: { destination: string }[] }[]
) => {
  assert.ok(
    items.length > 0,
    "Copied example must declare its installation items"
  );

  const selected = items.map((name) => {
    const manifest = manifests.find((entry) => entry.name === name);
    assert.ok(
      manifest,
      `Public installation missing for declared example item: ${name}`
    );

    return manifest;
  });

  const available = new Set(
    selected.flatMap((entry) =>
      entry.files.map(
        (file) => `@/${file.destination.replace(/\.(?:ts|tsx)$/u, "")}`
      )
    )
  );

  for (const match of code.matchAll(
    /\bfrom\s*["'](?<specifier>@\/components\/[^"']+)["']/gu
  )) {
    // SAFETY: the adjacent regex has one mandatory named specifier capture, present in every matchAll result.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Preserve the exact required named-capture contract and existing optional-chain read.
    const specifier = (match.groups as { specifier: string })?.specifier;
    assert.ok(
      available.has(specifier),
      `Copied example prerequisite is not declared: ${specifier}`
    );
  }
};
