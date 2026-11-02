import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

import { z } from "zod";

const sourceSchema = z.object({
  archiveSourceSha256: z.string().optional(),
  sourcePath: z.string(),
  sourceSha256: z.string(),
});

const bindingSchema = z.object({
  component: z.string(),
  manifest: z.string().nullable(),
  proofKind: z
    .enum(["native-installation", "utility-installation", "utility-behavior"])
    .default("native-installation"),
  registryItem: z.string(),
  reportPath: z.string(),
});

const reportBindingSchema = bindingSchema.extend({
  files: z.array(sourceSchema),
  reportSha256: z.string(),
});

const archiveFileSchema = sourceSchema.extend({
  bytes: z.number().int().positive(),
  compressedBytes: z.number().int().positive(),
  compressedPath: z.string(),
  compressedSha256: z.string(),
  rawSha256: z.string(),
});

const archiveSchema = z.object({
  files: z.array(archiveFileSchema),
  originCommit: z.string(),
  reports: z.array(reportBindingSchema),
  schemaVersion: z.literal(1),
  scope: z.literal("historical-source-snapshot"),
});

const transitionSchema = z.object({
  classification: z.enum([
    "preexisting-main-source-drift",
    "owned-behavior-repair",
    "reviewed-source-transition",
  ]),
  currentSha256: z.string(),
  historicalSha256: z.string(),
  reason: z.string().min(1),
  sourcePath: z.string(),
});

const policySchema = z.object({
  files: z.array(transitionSchema),
  originCommit: z.string(),
  schemaVersion: z.literal(1),
});

const componentSchema = z.object({
  implementation: z.object({
    evidenceScope: z.string().optional(),
    registryItem: z.string().nullish(),
    status: z.literal("implemented-and-install-verified"),
  }),
  mapping: z.object({ kind: z.string(), target: z.string() }).optional(),
  name: z.string(),
  pixelVerification: z.object({
    additionalInstallationReports: z.record(z.string(), z.string()).optional(),
    additionalManifests: z.array(z.string()).optional(),
    behaviorEvidenceScope: z.string().optional(),
    behaviorReport: z.string().nullish(),
    evidenceScope: z.string().optional(),
    installationReport: z.string().nullish(),
    manifest: z.string().nullish(),
    status: z.enum([
      "unverified",
      "reference-and-tests-available",
      "verified-declared-cases",
      "not-applicable-unskinned-utility",
    ]),
  }),
});

const mapSchema = z.object({
  components: z.array(componentSchema),
  recordedEvidenceScope: z.literal("historical-source-snapshot"),
});

const registrySchema = z.object({
  items: z.array(
    z.object({
      files: z.array(z.object({ path: z.string() })),
      name: z.string(),
    })
  ),
});

const sourceReportSchema = z.object({
  files: z.array(
    z.object({
      path: z.string(),
      sourcePath: z.string().optional(),
      sourceSha256: z.string(),
    })
  ),
});

export type HistoricalArchiveInput = z.input<typeof archiveSchema>;

export type HistoricalPolicyInput = z.input<typeof policySchema>;

type Component = z.infer<typeof componentSchema>;

type Binding = z.infer<typeof bindingSchema>;

type Source = z.infer<typeof sourceSchema>;

interface Options {
  archiveDirectory: string;
  resolvePath: (name: string) => string;
  map: unknown;
  registry: unknown;
}

interface CurrentSource extends Source {
  currentSha256: string;
  classification?: string;
  reason?: string;
}

interface Applicability extends Binding {
  reportSha256: string;
  scope: string;
  currentApplicability: string;
  matchingFiles: CurrentSource[];
  driftingFiles: CurrentSource[];
}

interface Evidence {
  scope: string;
  historicalIntegrity: string;
  originCommit: string;
  reports: Applicability[];
  currentBehaviorCoverage: string;
  currentPixelCoverage: string;
}

const compare = (left: string, right: string) => left.localeCompare(right);

const historicalScope = "historical-source-snapshot";
const originCommit = "977f538ddc56c7a432b49f96f41382282a65ff71";

const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

const key = (entry: Binding) =>
  JSON.stringify([
    entry.component,
    entry.registryItem,
    entry.manifest,
    entry.proofKind,
    entry.reportPath,
  ]);

const readJson = async <T>(
  filename: string,
  schema: z.ZodType<T>
): Promise<T> => {
  const value: unknown = JSON.parse(await readFile(filename, "utf-8"));

  return schema.parse(value);
};

const safePath = (name: string) => {
  assert.ok(
    name.length > 0 &&
      !name.includes("\\") &&
      !path.posix.isAbsolute(name) &&
      !path.win32.isAbsolute(name) &&
      name
        .split("/")
        .every((part) => part !== ".." && part !== "." && part !== ""),
    `Unsafe evidence path: ${name}`
  );

  return name;
};

const unique = <T>(
  entries: T[],
  identity: (entry: T) => string,
  label: string
) => {
  const result = new Map<string, T>();

  for (const entry of entries) {
    const name = identity(entry);

    assert.ok(!result.has(name), `Duplicate ${label}: ${name}`);
    result.set(name, entry);
  }

  return result;
};

export const historicalBindings = (map: z.infer<typeof mapSchema>) => {
  const result: Binding[] = [];

  for (const component of map.components) {
    if (
      component.implementation.status === "implemented-and-install-verified"
    ) {
      assert.equal(
        component.implementation.evidenceScope,
        historicalScope,
        `${component.name}: installation status requires historical scope`
      );
    }

    if (
      component.pixelVerification.status === "not-applicable-unskinned-utility"
    ) {
      assert.equal(
        component.pixelVerification.manifest,
        null,
        "Unskinned utility must not claim a native manifest"
      );
      assert.equal(
        component.pixelVerification.behaviorEvidenceScope,
        historicalScope,
        "Utility behavior reports require historical scope"
      );

      const registryItem = z
        .string()
        .min(1)
        .parse(component.implementation.registryItem);

      const behaviorReport = z
        .string()
        .min(1)
        .parse(component.pixelVerification.behaviorReport);

      const installationReport = z
        .string()
        .min(1)
        .parse(component.pixelVerification.installationReport);

      result.push(
        {
          component: component.name,
          manifest: null,
          proofKind: "utility-behavior",
          registryItem,
          reportPath: safePath(behaviorReport),
        },
        {
          component: component.name,
          manifest: null,
          proofKind: "utility-installation",
          registryItem,
          reportPath: safePath(installationReport),
        }
      );
      continue;
    }

    if (component.pixelVerification.status !== "verified-declared-cases") {
      continue;
    }

    assert.equal(
      component.pixelVerification.evidenceScope,
      historicalScope,
      `${component.name}: pixel status requires historical scope`
    );

    const pixels = component.pixelVerification;
    const primaryManifest = z.string().min(1).parse(pixels.manifest);

    const installationReport = z
      .string()
      .min(1)
      .parse(pixels.installationReport);

    const registryItem = z
      .string()
      .min(1)
      .parse(component.implementation.registryItem);

    for (const manifest of [
      primaryManifest,
      ...(pixels.additionalManifests ?? []),
    ]) {
      const reportPath =
        manifest === primaryManifest
          ? installationReport
          : (pixels.additionalInstallationReports?.[manifest] ??
            path.posix.join(
              path.posix.dirname(manifest),
              "installation-verification.json"
            ));

      result.push({
        component: component.name,
        manifest: safePath(manifest),
        proofKind: "native-installation",
        registryItem,
        reportPath: safePath(reportPath),
      });
    }
  }

  return result;
};

/** Historical snapshots authenticate recorded proof only; they never grant current-source verification. */
export const assertCurrentSourceEvidence = (evidence: { scope: string }) => {
  assert.equal(
    evidence.scope,
    "current-source",
    "An explicitly current-source receipt is required; historical archives cannot satisfy it"
  );
};

export const validateHistoricalEvidence = async ({
  archiveDirectory,
  resolvePath,
  map,
  registry: registryInput,
}: Options): Promise<Evidence> => {
  const registry = registrySchema.parse(registryInput);
  const parsedMap = mapSchema.parse(map);

  const [archive, transitions] = await Promise.all([
    readJson(path.join(archiveDirectory, "manifest.json"), archiveSchema),
    readJson(
      path.join(archiveDirectory, "current-transitions.json"),
      policySchema
    ),
  ]);

  assert.equal(archive.schemaVersion, 1);
  assert.equal(transitions.schemaVersion, 1);
  assert.equal(archive.originCommit, originCommit);
  assert.equal(transitions.originCommit, originCommit);

  const blobs = unique(
    archive.files,
    (entry) => safePath(entry.sourcePath),
    "archive source"
  );

  const policies = unique(
    transitions.files,
    (entry) => safePath(entry.sourcePath),
    "current transition"
  );

  const bindings = unique(archive.reports, key, "report binding");
  const expected = historicalBindings(parsedMap);
  const requested = unique(expected, key, "map binding");

  const sortedBindingKeys = [...bindings.keys()];
  sortedBindingKeys.sort(compare);
  const sortedRequestedKeys = [...requested.keys()];
  sortedRequestedKeys.sort(compare);
  assert.deepEqual(
    sortedBindingKeys,
    sortedRequestedKeys,
    "Historical report binding set differs from the declared map"
  );
  const sortedPolicyKeys = [...policies.keys()];
  sortedPolicyKeys.sort(compare);
  const sortedBlobKeys = [...blobs.keys()];
  sortedBlobKeys.sort(compare);
  assert.deepEqual(
    sortedPolicyKeys,
    sortedBlobKeys,
    "Current transition policy must cover exactly the archived source set"
  );

  const archived = new Map<string, string>();

  const packedFiles = await Promise.all(
    [...blobs.values()].map(async (entry) => ({
      ...entry,
      packed: await readFile(
        path.join(archiveDirectory, safePath(entry.compressedPath))
      ),
    }))
  );

  for (const entry of packedFiles) {
    assert.equal(
      entry.compressedPath,
      `blobs/${entry.sourceSha256}.gz`,
      "Archive blob must be content addressed"
    );
    assert.match(entry.sourceSha256, /^[a-f0-9]{64}$/u);
    assert.equal(
      entry.rawSha256,
      entry.sourceSha256,
      "Archived raw hash must equal the declaring source hash"
    );
    assert.ok(Number.isSafeInteger(entry.bytes) && entry.bytes > 0);

    const { packed } = entry;

    assert.equal(
      packed.length,
      entry.compressedBytes,
      `Historical compressed length: ${entry.sourcePath}`
    );
    assert.equal(
      digest(packed),
      entry.compressedSha256,
      `Historical compressed hash: ${entry.sourcePath}`
    );

    const raw = gunzipSync(packed, { maxOutputLength: entry.bytes });

    assert.equal(
      raw.length,
      entry.bytes,
      `Historical raw length: ${entry.sourcePath}`
    );
    assert.equal(
      digest(raw),
      entry.sourceSha256,
      `Historical raw hash: ${entry.sourcePath}`
    );

    const policy = policies.get(entry.sourcePath);

    assert.ok(policy, "Missing current transition policy");
    assert.equal(
      policy.historicalSha256,
      entry.sourceSha256,
      "Transition must name the exact historical source"
    );
    assert.match(policy.currentSha256, /^[a-f0-9]{64}$/u);
    assert.ok(
      [
        "preexisting-main-source-drift",
        "owned-behavior-repair",
        "reviewed-source-transition",
      ].includes(policy.classification)
    );

    archived.set(entry.sourcePath, entry.sourceSha256);
  }

  const items = new Map(registry.items.map((item) => [item.name, item]));
  const used = new Set<string>();
  const reports: Applicability[] = [];

  const reportReads = await Promise.all(
    expected.map(async (request) => ({
      reportBytes: await readFile(resolvePath(request.reportPath)),
      request,
    }))
  );

  const sourcePaths = [
    ...new Set(
      archive.reports.flatMap((entry) =>
        entry.files.map((file) => safePath(file.sourcePath))
      )
    ),
  ];

  const currentDigests = new Map(
    await Promise.all(
      sourcePaths.map(
        async (sourcePath) =>
          [sourcePath, digest(await readFile(resolvePath(sourcePath)))] as const
      )
    )
  );

  for (const { request, reportBytes } of reportReads) {
    const binding = bindings.get(key(request));
    assert.ok(binding, "Missing historical report binding");

    assert.equal(
      digest(reportBytes),
      binding.reportSha256,
      `Historical declaring report hash: ${request.reportPath}`
    );

    const report = sourceReportSchema.parse(
      JSON.parse(reportBytes.toString("utf-8"))
    );

    const files = report.files.map((entry) => ({
      sourcePath: safePath(
        entry.sourcePath ?? path.posix.join("registry/ui", entry.path)
      ),
      sourceSha256: entry.sourceSha256,
    }));

    const declared = unique(
      binding.files,
      (entry) => safePath(entry.sourcePath),
      "report source binding"
    );

    const originals = unique(
      files,
      (entry) => entry.sourcePath,
      "report source"
    );

    const sortedDeclaredKeys = [...declared.keys()];
    sortedDeclaredKeys.sort(compare);
    const sortedOriginalKeys = [...originals.keys()];
    sortedOriginalKeys.sort(compare);
    assert.deepEqual(
      sortedDeclaredKeys,
      sortedOriginalKeys,
      `Incomplete historical source binding: ${request.reportPath}`
    );

    const item = items.get(request.registryItem);

    assert.ok(
      item,
      `Historical component has no current registry item: ${request.registryItem}`
    );

    const matchingFiles: CurrentSource[] = [];
    const driftingFiles: CurrentSource[] = [];

    for (const entry of files) {
      assert.ok(
        item.files.some((file) => file.path === entry.sourcePath),
        `Historical proof source is not part of its current item: ${entry.sourcePath}`
      );

      const declaration = declared.get(entry.sourcePath);

      assert.ok(declaration, "Missing historical source binding");
      assert.equal(
        declaration.sourceSha256,
        entry.sourceSha256,
        "Historical source binding differs from its report"
      );

      const currentSha256 = currentDigests.get(entry.sourcePath);
      assert.ok(currentSha256 !== undefined, "Missing current source digest");
      const snapshot = archived.get(entry.sourcePath);

      if (snapshot === undefined) {
        assert.equal(
          declaration.archiveSourceSha256,
          undefined,
          "Unmapped historical archive source binding"
        );
      } else {
        assert.equal(
          declaration.archiveSourceSha256,
          snapshot,
          "Missing or wrong historical archive source binding"
        );
        assert.equal(
          entry.sourceSha256,
          snapshot,
          "Historical archive belongs to another source version"
        );
        used.add(entry.sourcePath);
      }

      if (currentSha256 === entry.sourceSha256) {
        matchingFiles.push({ ...entry, currentSha256 });
        continue;
      }

      const policy = policies.get(entry.sourcePath);

      assert.ok(
        snapshot !== undefined && policy?.currentSha256 === currentSha256,
        `unrecognized current source drift: ${entry.sourcePath}`
      );
      driftingFiles.push({
        ...entry,
        classification: policy.classification,
        currentSha256,
        reason: policy.reason,
      });
    }

    reports.push({
      ...request,
      currentApplicability:
        driftingFiles.length === 0
          ? "recorded-source-matches"
          : "recorded-source-drift",
      driftingFiles,
      matchingFiles,
      reportSha256: binding.reportSha256,
      scope: historicalScope,
    });
  }

  const sortedUsedSources = [...used];
  sortedUsedSources.sort(compare);
  const sortedArchivedSources = [...blobs.keys()];
  sortedArchivedSources.sort(compare);
  assert.deepEqual(
    sortedUsedSources,
    sortedArchivedSources,
    "Unused historical archive source binding"
  );

  return {
    currentBehaviorCoverage:
      "Not established by historical integrity; fresh ordinary and consumer checks cover their actual current cases.",
    currentPixelCoverage:
      "Not established by historical integrity; fresh selected Base receipts cover only their actual current cases.",
    historicalIntegrity: "valid",
    originCommit,
    reports,
    scope: historicalScope,
  };
};

export const historicalComponentSummary = (
  component: Component,
  evidence: Evidence
) => {
  const reports = evidence.reports.filter(
    (report) => report.component === component.name
  );

  let currentApplicability = "not-assessed-by-native-history";

  if (reports.length > 0) {
    currentApplicability = reports.some(
      (report) => report.driftingFiles.length > 0
    )
      ? "recorded-source-drift"
      : "recorded-source-matches";
  }

  return {
    currentApplicability,
    currentBehaviorCoverage: evidence.currentBehaviorCoverage,
    currentPixelCoverage: evidence.currentPixelCoverage,
    historicalReports: reports,
    implementation: {
      evidenceScope: component.implementation.evidenceScope ?? "not-claimed",
      status: component.implementation.status,
    },
    kind: component.mapping?.kind ?? "not-declared",
    name: component.name,
    pixels: {
      evidenceScope: component.pixelVerification.evidenceScope ?? "not-claimed",
      status: component.pixelVerification.status,
    },
    reference: component.mapping?.target ?? "not-declared",
  };
};

export const historicalMapComponents = (text: string, evidence: Evidence) => {
  const map = mapSchema.parse(JSON.parse(text));
  const bindings = historicalBindings(map);

  assert.equal(
    evidence.scope,
    historicalScope,
    "Summary requires historical scope"
  );
  const sortedMapBindings = bindings.map(key);
  sortedMapBindings.sort(compare);
  const sortedEvidenceBindings = evidence.reports.map(key);
  sortedEvidenceBindings.sort(compare);
  assert.deepEqual(
    sortedMapBindings,
    sortedEvidenceBindings,
    "Summary map must match its authenticated historical report bindings"
  );

  return map.components.map((component) =>
    historicalComponentSummary(component, evidence)
  );
};

/** Recorded utility reports must authenticate the same source versions, independently of current applicability. */
export const assertHistoricalUtilitySources = (
  behaviorText: string,
  installationText: string
) => {
  const behavior = sourceReportSchema.parse(JSON.parse(behaviorText));
  const installation = sourceReportSchema.parse(JSON.parse(installationText));

  const versions = new Map(
    behavior.files.map((file) => [file.path, file.sourceSha256])
  );

  assert.equal(
    versions.size,
    behavior.files.length,
    "Duplicate utility behavior source"
  );
  const sortedVersionPaths = [...versions.keys()];
  sortedVersionPaths.sort(compare);
  const sortedInstallationPaths = installation.files.map((file) => file.path);
  sortedInstallationPaths.sort(compare);
  assert.deepEqual(
    sortedVersionPaths,
    sortedInstallationPaths,
    "Utility source sets differ"
  );

  for (const file of installation.files) {
    assert.equal(
      versions.get(file.path),
      file.sourceSha256,
      "Utility report source versions differ"
    );
  }
};
