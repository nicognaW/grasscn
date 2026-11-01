import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { repoRoot, resolveRepositoryPath } from "@ppt/paths";
import { PNG } from "pngjs";

const root = repoRoot;
const json = async (file) =>
  JSON.parse(await readFile(resolveRepositoryPath(file), "utf8"));
const args = process.argv.slice(2);
const mapArg = args.indexOf("--map");
const map = await json(
  mapArg < 0 ? "registry/minecraft-map.json" : args[mapArg + 1]
);
const catalog = await json(map.catalog);
const inventory = await json(map.nativeInventory);
const registry = await json("registry.json");
const pilot = await json("tests/reference/manifest.json");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hash = (value) => assert.match(value, /^[a-f0-9]{64}$/);
let embeddedFontDigest;
const embeddedFontZipDigest = async () => {
  if (embeddedFontDigest) return embeddedFontDigest;
  const embedded = (
    await readFile(
      resolveRepositoryPath(path.join("registry/ui/minecraft-unifont-data.ts")),
      "utf8"
    )
  ).match(/export const unifontZip = "([A-Za-z0-9+/=]+)"/);
  assert.ok(embedded, "Original indexed Unihex ZIP must be embedded");
  return (embeddedFontDigest = digest(Buffer.from(embedded[1], "base64")));
};
const names = map.components.map((component) => component.name);
assert.equal(new Set(names).size, names.length, "Duplicate component mapping");
const union = [
  ...new Set(catalog.sources.flatMap((source) => source.names)),
].sort();
assert.deepEqual(
  catalog.names,
  union,
  "Catalog snapshot is not the union of its sources"
);
const extensions = map.nativeExtensions ?? [];
for (const extension of extensions) {
  assert.ok(
    extension.reason && !union.includes(extension.name),
    "Native extensions need a reason and must be distinct from the upstream catalog"
  );
}
const excluded = map.excludedComponents ?? [];
assert.equal(
  new Set(excluded.map((component) => component.name)).size,
  excluded.length,
  "Duplicate excluded component"
);
for (const component of excluded) {
  assert.ok(
    union.includes(component.name) && component.reason,
    "Exclusions need a catalog component and an explicit reason"
  );
  assert.ok(
    !names.includes(component.name),
    `${component.name}: excluded component still mapped`
  );
  assert.ok(
    !registry.items.some((item) => item.name === component.name),
    `${component.name}: excluded component still installable`
  );
}
assert.deepEqual(
  [...names].sort(),
  [
    ...union.filter(
      (name) => !excluded.some((component) => component.name === name)
    ),
    ...extensions.map((component) => component.name),
  ].sort(),
  "Missing or extra supported shadcn component"
);
assert.equal(map.sourceJarSha256, inventory.jarSha256);
assert.equal(map.sourceJarSha256, pilot.sourceJarSha256);
assert.equal(map.minecraftVersion, pilot.minecraftVersion);
hash(map.sourceJarSha256);
for (const source of catalog.sources) hash(source.sha256);
for (const [id, family] of Object.entries(map.families)) {
  assert.ok(family.classes.length, `${id}: no native class evidence`);
  for (const member of family.classes) {
    assert.ok(inventory.classes[member], `${id}: absent class ${member}`);
    hash(inventory.classes[member].sha256);
    hash(inventory.classes[member].disassemblySha256);
  }
  for (const member of family.assets) {
    const asset = inventory.assets[member];
    assert.ok(asset, `${id}: absent asset ${member}`);
    hash(asset.sha256);
    assert.ok(
      asset.width > 0 && asset.height > 0,
      `${id}: invalid PNG geometry`
    );
    if (asset.metadata) hash(asset.metadataSha256);
  }
  for (const member of family.fontDefinitions ?? []) {
    assert.ok(
      inventory.resources[member],
      `${id}: absent font definition ${member}`
    );
    hash(inventory.resources[member].sha256);
  }
}
const kinds = new Set([
  "native-element",
  "native-layout",
  "native-subset",
  "composition",
  "layout",
  "behavior",
  "platform-limited",
]);
for (const component of map.components) {
  assert.ok(
    kinds.has(component.mapping.kind),
    `${component.name}: unknown mapping kind`
  );
  assert.ok(
    component.mapping.target &&
      component.mapping.limitation &&
      component.nextStep
  );
  assert.ok(component.referenceCases.requiredDimensions.length);
  for (const family of component.mapping.families)
    assert.ok(
      map.families[family],
      `${component.name}: absent family ${family}`
    );
  assert.ok(
    [
      "unverified",
      "reference-and-tests-available",
      "verified-declared-cases",
      "not-applicable-unskinned-utility",
    ].includes(component.pixelVerification.status),
    `${component.name}: unsupported fidelity claim`
  );
  if (component.implementation.registryItem) {
    assert.ok(
      registry.items.some(
        (item) => item.name === component.implementation.registryItem
      ),
      `${component.name}: missing installable item`
    );
  }
  if (
    component.pixelVerification.status === "not-applicable-unskinned-utility"
  ) {
    assert.equal(
      component.mapping.kind,
      "layout",
      `${component.name}: visible skins require native evidence`
    );
    assert.equal(
      component.pixelVerification.manifest,
      null,
      `${component.name}: unskinned utility must not claim native pixels`
    );
    const behavior = await json(component.pixelVerification.behaviorReport),
      installation = await json(component.pixelVerification.installationReport);
    assert.equal(behavior.kind, "unskinned-web-utility");
    assert.ok(behavior.nativeReferenceNotApplicable && behavior.scope);
    assert.ok(
      behavior.cases.length && behavior.cases.every((c) => c.passed === true),
      `${component.name}: utility behavior proof incomplete`
    );
    assert.deepEqual(installation.pageErrors, []);
    assert.equal(installation.typecheck?.passed, true);
    assert.equal(installation.consumerRsc, false);
    assert.match(installation.command, /shadcn.*add/);
    const item = registry.items.find(
      (item) => item.name === component.implementation.registryItem
    );
    const filenames = item.files.map((file) => path.basename(file.path)).sort();
    assert.deepEqual(
      installation.files.map((file) => file.path).sort(),
      filenames
    );
    assert.deepEqual(behavior.files.map((file) => file.path).sort(), filenames);
    for (const file of installation.files) {
      hash(file.installedSha256);
      const sourceSha = digest(
        await readFile(
          resolveRepositoryPath(path.join("registry/ui", file.path))
        )
      );
      assert.equal(
        sourceSha,
        file.sourceSha256,
        `${component.name}: installed utility proof is stale`
      );
      assert.equal(
        behavior.files.find((entry) => entry.path === file.path)?.sourceSha256,
        sourceSha,
        `${component.name}: utility behavior proof is stale`
      );
      assert.ok(
        file.comparison,
        `${component.name}: missing CLI source comparison`
      );
    }
  }
  for (const manifestFile of [
    component.pixelVerification.manifest,
    ...(component.pixelVerification.additionalManifests ?? []),
  ].filter(Boolean)) {
    const manifest = await json(manifestFile);
    assert.equal(manifest.sourceJarSha256, map.sourceJarSha256);
    assert.ok(
      manifest.cases.length,
      `${component.name}: empty reference matrix`
    );
    if (manifest.sourceDirectory) {
      const source = path.join(
        path.dirname(manifestFile),
        manifest.sourceDirectory,
        "ControlsReferenceMain.java"
      );
      assert.equal(
        digest(await readFile(resolveRepositoryPath(source))),
        manifest.captureSourceSha256,
        `Native harness snapshot integrity: ${source}`
      );
      const casesFile = path.join(path.dirname(manifestFile), "cases.json");
      assert.equal(
        digest(await readFile(resolveRepositoryPath(casesFile))),
        manifest.caseDefinitionSha256,
        `Native case definition integrity: ${casesFile}`
      );
    }
    for (const reference of manifest.cases) {
      const file = path.join(
        path.dirname(manifestFile),
        "captures",
        reference.name
      );
      assert.equal(
        digest(await readFile(resolveRepositoryPath(file))),
        reference.sha256,
        `Reference integrity: ${file}`
      );
    }
    if (manifest.framesDirectory)
      for (const frame of manifest.frames) {
        const file = path.join(
          path.dirname(manifestFile),
          manifest.framesDirectory,
          frame.name
        );
        assert.equal(
          digest(await readFile(resolveRepositoryPath(file))),
          frame.sha256,
          `Full-frame integrity: ${file}`
        );
      }
    if (component.pixelVerification.status === "verified-declared-cases") {
      const primary = manifestFile === component.pixelVerification.manifest;
      const report = await json(
        primary
          ? component.pixelVerification.installationReport
          : (component.pixelVerification.additionalInstallationReports?.[
              manifestFile
            ] ??
              path.join(
                path.dirname(manifestFile),
                "installation-verification.json"
              ))
      );
      const repeat = await json(
        primary
          ? component.pixelVerification.repeatabilityReport
          : path.join(path.dirname(manifestFile), "repeatability.json")
      );
      assert.equal(report.sourceJarSha256, map.sourceJarSha256);
      assert.equal(repeat.sourceJarSha256, map.sourceJarSha256);
      assert.equal(repeat.captureSourceSha256, manifest.captureSourceSha256);
      assert.equal(repeat.caseDefinitionSha256, manifest.caseDefinitionSha256);
      assert.deepEqual(report.pageErrors, []);
      assert.deepEqual(
        report.cases.map((c) => c.name).sort(),
        manifest.cases.map((c) => c.name).sort()
      );
      assert.deepEqual(
        repeat.cases.map((c) => c.name).sort(),
        manifest.cases.map((c) => c.name).sort()
      );
      for (const file of report.files) {
        const sourcePath =
          file.sourcePath ?? path.posix.join("registry/ui", file.path);
        assert.ok(
          registry.items
            .find((item) => item.name === component.implementation.registryItem)
            .files.some((entry) => entry.path === sourcePath),
          `Installed proof source is not part of the item: ${sourcePath}`
        );
        assert.equal(
          digest(await readFile(resolveRepositoryPath(sourcePath))),
          file.sourceSha256,
          `Installed proof is stale: ${sourcePath}`
        );
      }
      for (const reference of manifest.cases) {
        const installed = report.cases.find((c) => c.name === reference.name);
        const repeated = repeat.cases.find((c) => c.name === reference.name);
        assert.equal(installed.mismatchedPixels, 0);
        assert.equal(repeated.mismatchedPixels, 0);
        assert.equal(installed.decodedRgbaSha256, repeated.decodedRgbaSha256);
        for (const reuse of component.pixelVerification.appearanceReuses ??
          []) {
          if (
            reuse.manifest !== manifestFile ||
            !Object.entries(reuse.where).every(
              ([field, value]) => reference[field] === value
            )
          )
            continue;
          assert.equal(
            installed[reuse.reportField],
            repeated.decodedRgbaSha256,
            `${component.name}: missing or unequal ${reuse.reportField}: ${reference.name}`
          );
        }
        const referenceFile = path.join(
          path.dirname(manifestFile),
          "captures",
          reference.name
        );
        assert.equal(
          digest(
            PNG.sync.read(await readFile(resolveRepositoryPath(referenceFile)))
              .data
          ),
          repeated.decodedRgbaSha256
        );
        assert.equal(repeated.runOnePngSha256, reference.sha256);
        assert.equal(repeated.runTwoPngSha256, reference.sha256);
      }
    }
    const includesUnihex = registry.items
      .find((item) => item.name === component.implementation.registryItem)
      ?.files.some((file) => file.path.endsWith("/minecraft-unifont-data.ts"));
    if (manifest.effectiveAssets && includesUnihex)
      assert.equal(
        await embeddedFontZipDigest(),
        manifest.effectiveAssets.resources["minecraft/font/unifont.zip"].sha256,
        `${component.name}: embedded font bytes differ from native runtime resources`
      );
    if (manifest.glyphObservationEnabled === false) {
      assert.ok(
        manifest.cases.every(
          (c) =>
            ![c.label, c.text, ...(c.labels ?? [])].some(
              (value) =>
                value != null && /[^\x20-\x7e\r\n\t]/.test(String(value))
            )
        ),
        `${component.name}: native Unihex text cases require their glyph sampling evidence`
      );
    }
    if (
      manifest.glyphObservationEnabled !== false &&
      manifest.effectiveAssets &&
      registry.items
        .find((item) => item.name === component.implementation.registryItem)
        ?.files.some((file) => file.path.endsWith("/minecraft-unifont-data.ts"))
    ) {
      const provenance = await json(
        path.join(path.dirname(manifestFile), "asset-provenance.json")
      );
      for (const [resource, pin] of Object.entries(
        manifest.effectiveAssets.resources
      )) {
        assert.ok(
          provenance.sources[resource],
          `${component.name}: missing indexed provenance for ${resource} in ${manifestFile}`
        );
        assert.equal(
          pin.sha1,
          provenance.sources[resource].sha1,
          `Indexed resource identity: ${resource}`
        );
        assert.equal(
          pin.sha256,
          provenance.sources[resource].sha256,
          `Indexed resource integrity: ${resource}`
        );
      }
      assert.equal(
        digest(
          await readFile(
            resolveRepositoryPath(
              path.join(path.dirname(manifestFile), "glyph-atlas.json")
            )
          )
        ),
        provenance.glyphAtlasSha256
      );
      assert.equal(
        digest(
          await readFile(
            resolveRepositoryPath(
              path.join(
                provenance.glyphProbeSource ??
                  "tests/reference/GlyphProbeMain.java"
              )
            )
          )
        ),
        provenance.glyphProbeSourceSha256
      );
      if (provenance.glyphObservationVerification) {
        const observation = await json(
          path.join(
            path.dirname(manifestFile),
            provenance.glyphObservationVerification
          )
        );
        assert.deepEqual(observation.glyphObservationEnabled, {
          runOne: true,
          runTwo: false,
        });
        assert.equal(
          observation.captureSourceSha256,
          manifest.captureSourceSha256
        );
        assert.equal(
          observation.caseDefinitionSha256,
          manifest.caseDefinitionSha256
        );
        assert.deepEqual(
          observation.cases.map((c) => c.name).sort(),
          manifest.cases.map((c) => c.name).sort()
        );
        assert.ok(
          observation.cases.every((c) => c.mismatchedPixels === 0),
          "Glyph observation changed native pixels"
        );
      }
      if (provenance.glyphAtlasCaptureManifest) {
        const observationPath = path.join(
          path.dirname(manifestFile),
          provenance.glyphAtlasCaptureManifest
        );
        assert.equal(
          digest(await readFile(resolveRepositoryPath(observationPath))),
          provenance.glyphAtlasCaptureManifestSha256
        );
        const observation = await json(observationPath);
        const observedAtlasPath = path.join(
          path.dirname(manifestFile),
          provenance.glyphAtlasObservationFile
        );
        assert.equal(
          digest(await readFile(resolveRepositoryPath(observedAtlasPath))),
          provenance.glyphAtlasSha256
        );
        assert.equal(
          observation.captureSourceSha256,
          provenance.glyphProbeSourceSha256
        );
        assert.equal(observation.sourceJarSha256, manifest.sourceJarSha256);
        assert.equal(
          observation.caseDefinitionSha256,
          manifest.caseDefinitionSha256
        );
        for (const frame of observation.frames) {
          const framePath = path.join(
            path.dirname(observationPath),
            observation.framesDirectory,
            frame.name
          );
          assert.equal(
            digest(await readFile(resolveRepositoryPath(framePath))),
            frame.sha256
          );
        }
        for (const reference of manifest.cases) {
          const observed = observation.cases.find(
            (c) => c.name === reference.name
          );
          assert.ok(
            observed,
            `Missing glyph-observation native case: ${reference.name}`
          );
          const observedBytes = await readFile(
            resolveRepositoryPath(
              path.join(
                path.dirname(observationPath),
                "captures",
                observed.name
              )
            )
          );
          assert.equal(digest(observedBytes), observed.sha256);
          const referenceBytes = await readFile(
            resolveRepositoryPath(
              path.join(path.dirname(manifestFile), "captures", reference.name)
            )
          );
          assert.ok(
            PNG.sync
              .read(observedBytes)
              .data.equals(PNG.sync.read(referenceBytes).data),
            `Glyph probe changed native rendering: ${reference.name}`
          );
        }
      }
      assert.equal(
        await embeddedFontZipDigest(),
        manifest.effectiveAssets.resources["minecraft/font/unifont.zip"].sha256
      );
    }
  }
}
if (args.includes("--live")) {
  for (const source of catalog.sources) {
    const response = await fetch(source.url);
    assert.ok(response.ok, `${source.url}: HTTP ${response.status}`);
    const body = await response.text();
    let current;
    if (source.url.endsWith("/docs/components")) {
      current = [
        ...new Set(
          [...body.matchAll(/href="\/docs\/components\/base\/([^"#?]+)"/g)].map(
            (match) => match[1]
          )
        ),
      ].sort();
    } else {
      const data = JSON.parse(body);
      current = (data.items ?? data)
        .filter((item) => item.type === "registry:ui")
        .map((item) => item.name)
        .sort();
    }
    assert.deepEqual(
      current,
      source.names,
      `Upstream catalog changed: ${source.url}`
    );
  }
}
if (args.includes("--list")) {
  console.table(
    map.components.map((component) => ({
      component: component.name,
      kind: component.mapping.kind,
      reference: component.mapping.target,
      implementation: component.implementation.status,
      pixels: component.pixelVerification.status,
    }))
  );
}
console.log(
  `Map valid: ${names.length} components, ${Object.keys(map.families).length} native families. ${map.components.filter((component) => component.pixelVerification.status === "unverified").length} components await pixel verification.`
);
