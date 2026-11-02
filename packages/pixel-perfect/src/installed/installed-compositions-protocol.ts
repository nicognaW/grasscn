import type { CapturedReferenceCase } from "@ppt/installed/reference-case";
import type { PNG } from "pngjs";

import type label from "../../tests/reference/label/manifest.json";

export type DecodedPixels = Pick<
  ReturnType<typeof PNG.sync.read>,
  "data" | "width" | "height"
>;

export type LabelCaptureManifest = typeof label;

/** Item rows, Label titles, and Separator lines expose these actual constituent render inputs. */
export interface ItemCaptureCase extends CapturedReferenceCase {
  background: string;
  x: number;
  y: number;
  label?: string;
  text?: string;
  selected?: boolean;
  placeholder?: string;
  alignment?: string;
  wrapWidth?: number;
}

export interface ItemCaptureManifest {
  sourceJarSha256: string;
  cases: ItemCaptureCase[];
}

export interface ItemVerificationTask {
  part: string;
  manifestFile: string;
  manifest: ItemCaptureManifest;
  c: ItemCaptureCase;
  mode: string;
  plain: boolean;
}

export interface InstalledItemResult {
  decodedRgbaSha256: string;
  manifest: string;
  mismatchedPixels: number;
  mode: string;
  name: string;
  part: string;
  plain: boolean;
  sourceJarSha256: string;
}

/** The Questionnaire part table consumes Button, Label, Controls and Input captures. */
export interface QuestionnaireCaptureCase extends CapturedReferenceCase {
  alignment?: string;
  background?: string;
  checked?: boolean;
  label?: string;
  text?: string;
  placeholder?: string;
  x?: number;
  y?: number;
  wrapWidth?: number;
  maxLength?: number;
  cursor?: number;
  anchor?: number;
  caretMs?: number;
}

export interface QuestionnaireCaptureManifest {
  sourceJarSha256: string;
  background?: string;
  cases: QuestionnaireCaptureCase[];
}

export interface QuestionnaireCaseResult {
  name: string;
  mismatchedPixels: number;
  decodedRgbaSha256?: string;
  previousDecodedRgbaSha256?: string;
  skipDecodedRgbaSha256?: string;
  submitDecodedRgbaSha256?: string;
  radioDecodedRgbaSha256?: string;
}

/** Projection read by the combined report; the original spread retains every other serialized field. */
export interface QuestionnairePartProof {
  browser: string;
  pageErrors: string[];
  files: { installedSha256: string; path: string; sourceSha256: string }[];
  cases: QuestionnaireCaseResult[];
}

/** Overlay surface and text slots consume Card and Label captures. */
export interface OverlayCaptureCase extends CapturedReferenceCase {
  background: string;
  x: number;
  y: number;
  alignment?: string;
  label?: string;
  text?: string;
  wrapWidth?: number;
}

export interface OverlayCaptureManifest {
  sourceJarSha256: string;
  cases: OverlayCaptureCase[];
}

export interface OverlayCaseResult {
  name: string;
  mismatchedPixels?: number;
  decodedRgbaSha256?: string;
  descriptionDecodedRgbaSha256?: string;
}

export interface InstalledOverlayDataset {
  cases: OverlayCaseResult[];
  manifest: string;
  negativeControlMismatchedPixels: number;
}

export interface InstalledOverlayProof {
  browser: string;
  datasets: InstalledOverlayDataset[];
  name: string;
  pageErrors: string[];
}
