import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { repoRoot } from "@ppt/paths";
import { evidenceFile } from "@ppt/runtime/evidence-paths";
import type {
  RepeatedEvidenceCase,
  UpstreamRegistryCatalog,
  EvidenceRegistryItem,
  PixelEvidenceCase,
  AppearanceField,
  NativeFamily,
} from "@ppt/runtime/map-evidence";
import {
  readComponentMap,
  readComponentCatalog,
  readNativeInventory,
  readEvidenceRegistry,
  readNativeCaptureManifest,
  readUtilityBehavior,
  readUtilityInstallation,
  readInstallationEvidence,
  readRepeatabilityEvidence,
  readGlyphProvenance,
  readGlyphObservation,
  readNativeGlyphCaptureManifest,
} from "@ppt/runtime/map-evidence-readers";
import { PNG } from "pngjs";

import {
  assertHistoricalUtilitySources,
  validateHistoricalEvidence,
  historicalMapComponents,
} from "@ppt/runtime/historical-evidence";

const root = repoRoot;

const args = process.argv.slice(2);
const mapArg = args.indexOf("--map");

const map = await readComponentMap(
  mapArg === -1 ? "registry/minecraft-map.json" : args[mapArg + 1]
);

const catalog = await readComponentCatalog(map.catalog);

const inventory = await readNativeInventory(map.nativeInventory);

const registry = await readEvidenceRegistry("registry.json");

const historicalEvidence = await validateHistoricalEvidence({
  archiveDirectory: path.join(root, "packages/pixel-perfect/evidence/historical-installed-977f538"),
  map,
  registry,
  resolvePath: evidenceFile,
});
const pilot = await readNativeCaptureManifest("tests/reference/manifest.json");

const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const hash = (value: string) => {
  assert.match(value, /^[a-f0-9]{64}$/u);
};

let embeddedFontDigest: string | undefined;

const embeddedFontZipDigest = async () => {
  if (embeddedFontDigest !== undefined && embeddedFontDigest !== "") {
    return embeddedFontDigest;
  }

  const embedded = /export const unifontZip = "(?<zip>[A-Za-z0-9+/=]+)"/u.exec(
    await readFile(
      evidenceFile(path.join("registry/ui/minecraft-unifont-data.ts")),
      "utf-8"
    )
  );

  assert.ok(embedded, "Original indexed Unihex ZIP must be embedded");

  return (embeddedFontDigest = digest(Buffer.from(embedded[1], "base64")));
};

const registryItems = new Map<string | undefined, EvidenceRegistryItem>();

for (const item of registry.items) {
  if (!registryItems.has(item.name)) {
    registryItems.set(item.name, item);
  }
}

const names = map.components.map((component) => component.name);

assert.equal(new Set(names).size, names.length, "Duplicate component mapping");

const nativeSortValues = [
  ...new Set(catalog.sources.flatMap((source) => source.names)),
];
nativeSortValues.sort();
const union = nativeSortValues;

assert.deepEqual(
  catalog.names,
  union,
  "Catalog snapshot is not the union of its sources"
);

const catalogNames = new Set(union);
const mappedNames = new Set(names);

const extensions = map.nativeExtensions ?? [];

for (const extension of extensions) {
  assert.ok(
    extension.reason && !catalogNames.has(extension.name),
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
    catalogNames.has(component.name) && component.reason,
    "Exclusions need a catalog component and an explicit reason"
  );
  assert.ok(
    !mappedNames.has(component.name),
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

for (const source of catalog.sources) {
  hash(source.sha256);
}

// SAFETY: authored JSON object entries contain native-family values, never undefined.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const families = Object.entries(map.families) as [string, NativeFamily][];

for (const [id, family] of families) {
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

    if (asset.metadata) {
      hash(asset.metadataSha256);
    }
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
  const verification = component.pixelVerification;
  const registryItemName = component.implementation.registryItem;
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

  for (const family of component.mapping.families) {
    assert.ok(
      map.families[family],
      `${component.name}: absent family ${family}`
    );
  }

  assert.ok(
    [
      "unverified",
      "reference-and-tests-available",
      "verified-declared-cases",
      "not-applicable-unskinned-utility",
    ].includes(verification.status),
    `${component.name}: unsupported fidelity claim`
  );

  if (registryItemName !== undefined && registryItemName !== "") {
    assert.ok(
      registry.items.some((item) => item.name === registryItemName),
      `${component.name}: missing installable item`
    );
  }

  if (verification.status === "not-applicable-unskinned-utility") {
    assert.equal(
      component.mapping.kind,
      "layout",
      `${component.name}: visible skins require native evidence`
    );
    assert.equal(
      verification.manifest,
      null,
      `${component.name}: unskinned utility must not claim native pixels`
    );

    const behavior = await readUtilityBehavior(verification.behaviorReport);

    const installation = await readUtilityInstallation(
      verification.installationReport
    );

    assert.equal(behavior.kind, "unskinned-web-utility");
    assert.ok(behavior.nativeReferenceNotApplicable && behavior.scope);
    assert.ok(
      behavior.cases.length && behavior.cases.every((c) => c.passed),
      `${component.name}: utility behavior proof incomplete`
    );
    assert.deepEqual(installation.pageErrors, []);
    assert.equal(installation.typecheck?.passed, true);
    assert.equal(installation.consumerRsc, false);
    assert.match(installation.command, /shadcn.*add/u);

    // SAFETY: the authored utility mapping names its installable registry item, checked above.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const item = registryItems.get(registryItemName) as EvidenceRegistryItem;

    const filenames = item.files.map((file) => path.basename(file.path)).sort();

    assert.deepEqual(
      installation.files.map((file) => file.path).sort(),
      filenames
    );
    assert.deepEqual(behavior.files.map((file) => file.path).sort(), filenames);
    assertHistoricalUtilitySources(JSON.stringify(behavior), JSON.stringify(installation));

    for (const file of installation.files) {
      hash(file.installedSha256);
      assert.ok(
        file.comparison,
        `${component.name}: missing CLI source comparison`
      );
    }
  }

  for (const manifestFile of [
    verification.manifest,
    ...(verification.additionalManifests ?? []),
  ].filter((file): file is string => Boolean(file))) {
    const manifest = await readNativeCaptureManifest(manifestFile);

    assert.equal(manifest.sourceJarSha256, map.sourceJarSha256);
    assert.ok(
      manifest.cases.length,
      `${component.name}: empty reference matrix`
    );

    if (
      manifest.sourceDirectory !== undefined &&
      manifest.sourceDirectory !== ""
    ) {
      const source = path.join(
        path.dirname(manifestFile),
        manifest.sourceDirectory,
        "ControlsReferenceMain.java"
      );

      assert.equal(
        digest(await readFile(evidenceFile(source))),
        manifest.captureSourceSha256,
        `Native harness snapshot integrity: ${source}`
      );
      const casesFile = path.join(path.dirname(manifestFile), "cases.json");
      assert.equal(
        digest(await readFile(evidenceFile(casesFile))),
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
        digest(await readFile(evidenceFile(file))),
        reference.sha256,
        `Reference integrity: ${file}`
      );
    }

    if (
      manifest.framesDirectory !== undefined &&
      manifest.framesDirectory !== ""
    ) {
      for (const frame of manifest.frames) {
        const file = path.join(
          path.dirname(manifestFile),
          manifest.framesDirectory,
          frame.name
        );

        assert.equal(
          digest(await readFile(evidenceFile(file))),
          frame.sha256,
          `Full-frame integrity: ${file}`
        );
      }
    }

    if (verification.status === "verified-declared-cases") {
      const primary = manifestFile === verification.manifest;

      const report = await readInstallationEvidence(
        primary
          ? verification.installationReport
          : (verification.additionalInstallationReports?.[manifestFile] ??
              path.join(
                path.dirname(manifestFile),
                "installation-verification.json"
              ))
      );

      const repeat = await readRepeatabilityEvidence(
        primary
          ? verification.repeatabilityReport
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

        // SAFETY: the verified mapping names its installable item; the original lookup throws if absent.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const registryItem = registryItems.get(
          registryItemName
        ) as EvidenceRegistryItem;

        assert.ok(
          registryItem.files.some((entry) => entry.path === sourcePath),
          `Installed proof source is not part of the item: ${sourcePath}`
        );
        // Exact historical report/source integrity and recognized current applicability are checked by the shared resolver above.
      }

      for (const reference of manifest.cases) {
        // SAFETY: the case-name arrays were just asserted equal to the reference matrix.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const installed = report.cases.find(
          (c) => c.name === reference.name
        ) as PixelEvidenceCase;

        // SAFETY: the repeatability case names were likewise asserted equal above.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const repeated = repeat.cases.find(
          (c) => c.name === reference.name
        ) as RepeatedEvidenceCase;

        assert.equal(installed.mismatchedPixels, 0);
        assert.equal(repeated.mismatchedPixels, 0);
        assert.equal(installed.decodedRgbaSha256, repeated.decodedRgbaSha256);

        for (const reuse of verification.appearanceReuses ?? []) {
          if (
            reuse.manifest !== manifestFile ||
            !Object.entries(reuse.where).every(([field, value]) => {
              // SAFETY: authored appearance reuse predicates select native case state or element.
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion
              const fieldName = field as AppearanceField;

              return reference[fieldName] === value;
            })
          ) {
            continue;
          }

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
            PNG.sync.read(await readFile(evidenceFile(referenceFile))).data
          ),
          repeated.decodedRgbaSha256
        );
        assert.equal(repeated.runOnePngSha256, reference.sha256);
        assert.equal(repeated.runTwoPngSha256, reference.sha256);
      }
    }

    const includesUnihex = registryItems
      .get(registryItemName)
      ?.files.some((file) => file.path.endsWith("/minecraft-unifont-data.ts"));

    if (manifest.effectiveAssets && includesUnihex === true) {
      assert.equal(
        await embeddedFontZipDigest(),
        manifest.effectiveAssets.resources["minecraft/font/unifont.zip"].sha256,
        `${component.name}: embedded font bytes differ from native runtime resources`
      );
    }

    if (manifest.glyphObservationEnabled === false) {
      assert.ok(
        manifest.cases.every(
          (c) =>
            ![c.label, c.text, ...(c.labels ?? [])].some(
              (value) =>
                value !== null &&
                value !== undefined &&
                /[^\u0020-\u007E\r\n\t]/u.test(value)
            )
        ),
        `${component.name}: native Unihex text cases require their glyph sampling evidence`
      );
    }

    if (
      manifest.glyphObservationEnabled !== false &&
      manifest.effectiveAssets &&
      registryItems
        .get(registryItemName)
        ?.files.some((file) =>
          file.path.endsWith("/minecraft-unifont-data.ts")
        ) === true
    ) {
      const provenance = await readGlyphProvenance(
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
            evidenceFile(
              path.join(path.dirname(manifestFile), "glyph-atlas.json")
            )
          )
        ),
        provenance.glyphAtlasSha256
      );
      assert.equal(
        digest(
          await readFile(
            evidenceFile(
              path.join(
                provenance.glyphProbeSource ??
                  "tests/reference/GlyphProbeMain.java"
              )
            )
          )
        ),
        provenance.glyphProbeSourceSha256
      );

      if (
        provenance.glyphObservationVerification !== undefined &&
        provenance.glyphObservationVerification !== ""
      ) {
        const observation = await readGlyphObservation(
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

      if (
        provenance.glyphAtlasCaptureManifest !== undefined &&
        provenance.glyphAtlasCaptureManifest !== ""
      ) {
        const observationPath = path.join(
          path.dirname(manifestFile),
          provenance.glyphAtlasCaptureManifest
        );

        assert.equal(
          digest(await readFile(evidenceFile(observationPath))),
          provenance.glyphAtlasCaptureManifestSha256
        );

        const observation =
          await readNativeGlyphCaptureManifest(observationPath);

        const observedAtlasPath = path.join(
          path.dirname(manifestFile),
          provenance.glyphAtlasObservationFile
        );

        assert.equal(
          digest(await readFile(evidenceFile(observedAtlasPath))),
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
            digest(await readFile(evidenceFile(framePath))),
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
            evidenceFile(
              path.join(
                path.dirname(observationPath),
                "captures",
                observed.name
              )
            )
          );

          assert.equal(digest(observedBytes), observed.sha256);

          const referenceBytes = await readFile(
            evidenceFile(
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
          [
            ...body.matchAll(
              /href="\/docs\/components\/base\/(?<component>[^"#?]+)"/gu
            ),
          ].map((match) => match[1])
        ),
      ].sort();
    } else {
      // SAFETY: the official registry catalogue endpoint returns items or a bare item array.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const data = JSON.parse(body) as UpstreamRegistryCatalog;
      current = (data.items ?? data)
        .flatMap((item) => (item.type === "registry:ui" ? [item.name] : []))
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
    historicalMapComponents(JSON.stringify(map), historicalEvidence).map(
      (component) => ({
        component: component.name,
        currentApplicability: component.currentApplicability,
        implementation: `${component.implementation.status} (${component.implementation.evidenceScope})`,
        kind: component.kind,
        pixels: `${component.pixels.status} (${component.pixels.evidenceScope})`,
        reference: component.reference,
      })
    )
  );
}

console.log(JSON.stringify({ historicalEvidence }, null, 2));

console.log(
  `${historicalEvidence.reports.length} historical report associations authenticated. Current coverage requires fresh source-bound receipts; historical statuses do not establish current Full verification.`
);
