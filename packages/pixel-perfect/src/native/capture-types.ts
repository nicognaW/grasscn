/** Consumed fields from the selected launcher metadata. Extra producer fields remain untouched. */
export interface MinecraftCaptureLibrary {
  name: string;
  rules?: { action: string; os?: { name?: string; arch?: string } }[];
  downloads?: { artifact?: { path: string } };
}

export interface MinecraftCaptureVersion {
  libraries: MinecraftCaptureLibrary[];
  assetIndex: { id: string };
}

/** Native case-file fields read by the launchers; other fields are retained by object spread. */
export interface CaptureCaseInput {
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  page?: number | null;
  element?: string | null;
  text?: string | null;
  label?: string | null;
  labels?: string[] | null;
  textureFile?: string | null;
  textureSha256?: string | null;
}

export interface NativeCaptureLayout {
  width: number;
  height: number;
  renderedLines: string[];
  tabRects?: { x: number; y: number; width: number; height: number }[];
}

export interface MinecraftCaptureAssetObject {
  hash: string;
  size: number;
}

export interface MinecraftCaptureAssetIndex {
  objects: Record<string, MinecraftCaptureAssetObject | undefined>;
}

export interface CapturedInputResource {
  sha256: string;
  size: number;
  path: string;
}

export interface CapturedFontAssets {
  assetIndex: string;
  assetIndexSha256: string;
  resources: Record<
    string,
    { sha1: string; sha256: string; size: number } | undefined
  >;
}

export type ControlCaptureCase = CaptureCaseInput &
  Partial<NativeCaptureLayout> & {
    name: string;
    scale: number;
    sha256: string;
    widgetWidth?: number;
  };

export interface ControlCaptureManifest {
  source: string;
  minecraftVersion: string;
  sourceJarSha256: string;
  captureSourceSha256: string;
  caseDefinitionSha256: string;
  glyphObservationEnabled: boolean;
  mods: string[];
  resourcePacks: string[];
  background: string;
  guiScales: number[];
  labelLanguage: string;
  differenceTolerance: number;
  framesDirectory: string;
  frames: { name: string; sha256: string }[];
  cases: ControlCaptureCase[];
  effectiveAssets?: CapturedFontAssets;
  sourceDirectory?: string;
  inputResources?: Record<string, CapturedInputResource | undefined>;
}
