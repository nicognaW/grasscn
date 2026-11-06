export type AppearanceField = "state" | "element";

export interface NativeFamily {
  classes: string[];
  assets: string[];
  fontDefinitions?: string[];
}

export interface ComponentEvidenceMap {
  catalog: string;
  nativeInventory: string;
  sourceJarSha256: string;
  minecraftVersion: string;
  families: Record<string, NativeFamily | undefined>;
  nativeExtensions?: { name: string; reason: string }[];
  excludedComponents?: { name: string; reason: string }[];
  components: {
    name: string;
    mapping: {
      kind: string;
      target: string;
      limitation: string;
      families: string[];
    };
    nextStep: string;
    referenceCases: { requiredDimensions: string[] };
    implementation: { registryItem?: string; status: string };
    pixelVerification: (
      | {
          status: "verified-declared-cases";
          manifest: string;
          installationReport: string;
          repeatabilityReport: string;
        }
      | {
          status: "not-applicable-unskinned-utility";
          manifest: null;
          behaviorReport: string;
          installationReport: string;
        }
      | {
          status: "unverified" | "reference-and-tests-available";
          manifest: string | null;
        }
    ) & {
      additionalManifests?: string[];
      additionalInstallationReports?: Record<string, string>;
      appearanceReuses?: {
        manifest: string;
        where: Partial<Record<AppearanceField, string>>;
        reportField: `${string}DecodedRgbaSha256`;
      }[];
    };
  }[];
}

export interface ComponentCatalog {
  names: string[];
  sources: { names: string[]; sha256: string; url: string }[];
}

export interface NativeInventory {
  jarSha256: string;
  classes: Record<
    string,
    { sha256: string; disassemblySha256: string } | undefined
  >;
  assets: Record<
    string,
    | ({ sha256: string; width: number; height: number } & (
        | {
            metadata: {
              gui?: { scaling?: { type: string } };
              animation?: { frametime?: number; frames?: number[] };
            };
            metadataSha256: string;
          }
        | { metadata?: undefined; metadataSha256?: undefined }
      ))
    | undefined
  >;
  resources: Record<string, { sha256: string } | undefined>;
}

export interface EvidenceRegistryItem {
  name: string;
  files: { path: string }[];
}

export interface EvidenceRegistry {
  items: EvidenceRegistryItem[];
}

export interface ResourcePin {
  sha1: string;
  sha256: string;
}

export interface NativeCaptureCase {
  state?: string;
  element?: string;
  name: string;
  sha256: string;
  label?: string;
  text?: string;
  labels?: string[];
}

export interface NativeCaptureManifest {
  sourceJarSha256: string;
  minecraftVersion: string;
  sourceDirectory?: string;
  captureSourceSha256?: string;
  caseDefinitionSha256?: string;
  cases: NativeCaptureCase[];
  framesDirectory?: string;
  frames: { name: string; sha256: string }[];
  glyphObservationEnabled?: boolean;
  effectiveAssets?: { resources: Record<string, ResourcePin> };
}

export interface NativeGlyphCaptureManifest extends NativeCaptureManifest {
  framesDirectory: string;
}

export interface InstalledEvidenceFile {
  path: string;
  sourcePath?: string;
  sourceSha256: string;
  installedSha256: string;
  comparison?: string;
}

export interface PixelEvidenceCase {
  [field: `${string}DecodedRgbaSha256`]: string | undefined;
  name: string;
  mismatchedPixels: number;
  decodedRgbaSha256: string;
}

export interface RepeatedEvidenceCase extends PixelEvidenceCase {
  runOnePngSha256: string;
  runTwoPngSha256: string;
}

export interface InstallationEvidence {
  sourceJarSha256: string;
  pageErrors: string[];
  files: InstalledEvidenceFile[];
  cases: PixelEvidenceCase[];
}

export interface UtilityInstallationEvidence {
  pageErrors: string[];
  files: (InstalledEvidenceFile & { comparison: string })[];
  typecheck?: { passed: boolean };
  consumerRsc: boolean;
  command: string;
}

export interface RepeatabilityEvidence {
  sourceJarSha256: string;
  captureSourceSha256: string;
  caseDefinitionSha256: string;
  cases: RepeatedEvidenceCase[];
}

export interface UtilityBehaviorEvidence {
  kind: string;
  nativeReferenceNotApplicable: string;
  scope: string;
  cases: { passed: boolean }[];
  files: { path: string; sourceSha256: string }[];
}

export interface GlyphProvenance {
  sources: Record<string, ResourcePin | undefined>;
  glyphAtlasSha256: string;
  glyphProbeSource?: string;
  glyphProbeSourceSha256: string;
  glyphObservationVerification?: string;
  glyphAtlasCaptureManifest?: string;
  glyphAtlasCaptureManifestSha256: string;
  glyphAtlasObservationFile: string;
}

export interface GlyphObservationEvidence {
  glyphObservationEnabled: { runOne: boolean; runTwo: boolean };
  captureSourceSha256: string;
  caseDefinitionSha256: string;
  cases: { name: string; mismatchedPixels: number }[];
}

type UpstreamRegistryItems = { type: string; name: string }[];

export type UpstreamRegistryCatalog =
  | { items: UpstreamRegistryItems }
  | (UpstreamRegistryItems & { items?: never });
