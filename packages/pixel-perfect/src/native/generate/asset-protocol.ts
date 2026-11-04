import type { GlyphProbeProvenance } from "@ppt/native/generate/glyph-atlas";
import type { NativeInventory } from "@ppt/runtime/map-evidence";

import type retainedInventory from "../../../tests/reference/catalog/native-inventory.json";

/** Exact fixed catalog consumed by the authored asset generators. */
export type RetainedNativeInventory = NativeInventory & {
  assets: Record<keyof (typeof retainedInventory)["assets"], InventoryAsset>;
};

export type InventoryAsset = NonNullable<NativeInventory["assets"][string]>;

export interface SliceBorder {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface NativeNineSlice {
  type: string;
  width: number;
  height: number;
  border: number | SliceBorder;
  stretch_inner?: boolean;
}

export interface SpriteMetadata {
  gui: { scaling: NativeNineSlice };
}

export interface SpriteSource {
  sha256: string;
  metadataSha256?: string;
  scaling?: NativeNineSlice;
  sha1?: string;
}

export interface SourceProvenance {
  sources: Record<string, SpriteSource>;
}

export interface FontProvenance
  extends SourceProvenance, GlyphProbeProvenance {}

export interface EmbeddedAssetSource extends SpriteSource {
  embeddedBytes: string;
}

export interface SeparatorSource {
  sha256: string;
  width: number;
  height: number;
}

export interface SliderSprite {
  width: number;
  height: number;
  border: SliceBorder;
  stretch: boolean;
  image: string;
  pieces: string[];
}

export interface GlyphLabelManifest {
  captureSourceSha256: string;
  cases: { label?: string | null; labels?: string[] }[];
}

export interface GlyphObservationRepeat {
  glyphObservationEnabled: { runOne: boolean; runTwo: boolean };
  cases: { mismatchedPixels: number }[];
}
