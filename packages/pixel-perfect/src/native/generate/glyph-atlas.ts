/** Fields observed by native glyph probes and consumed by atlas generators. */
export interface GlyphUV {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

export interface GlyphMetrics extends GlyphUV {
  left: number;
  right: number;
  up: number;
  down: number;
  advance: number;
  boldOffset: number;
  shadowOffset: number;
}

export interface GlyphAtlasProvenance {
  glyphAtlasSha256: string;
}

export interface GlyphProbeProvenance extends GlyphAtlasProvenance {
  glyphProbeSourceSha256: string;
}
