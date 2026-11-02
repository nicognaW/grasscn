export interface NativeTraceIdentity {
  sourceJarSha256: string;
  captureSourceSha256: string;
  caseDefinitionSha256: string;
}

export interface TradingTraceRepeat extends NativeTraceIdentity {
  identical: boolean;
  offerCounts: number[];
  count: number;
}

export type TradingTraceEvents = Record<
  string,
  { kind: string; result: number }[]
>;

export interface TerrainProvenance {
  inputSha256: string;
  inputBytes: number;
  chunks: number;
  sourceRegionSha256: string;
  originalRegionUnchanged: boolean;
  sourceRegionAfterGenerationSha256: string;
  center: number[];
  mapScale: number;
  previewPaletteSha256: string;
}

export interface NativeMapGeneration {
  sourceRegionSha256: string;
  inputSha256: string;
  unsupportedRequests: number;
  unexploredPixels: number;
  centerX: number;
  centerZ: number;
  mapScale: number;
  colorsSha256: string;
}

export interface NativeMapRepeat {
  generationRunOne: NativeMapGeneration;
  generationRunTwo: NativeMapGeneration;
  colorsBytes: number;
  mismatchedPaletteBytes: number;
  colorsSha256: string;
}

export interface FrozenTerrainInput {
  // This integrity check consumes only the collection count; native generation owns chunk contents.
  chunks: unknown[];
  sourceRegionSha256: string;
}

export interface SkinPin {
  sha256: string;
}

export type SkinProvenance = Record<string, SkinPin | string>;
