import type { QuestionnaireCaptureCase } from "@ppt/installed/installed-compositions-protocol";
import type { CapturedReferenceCase } from "@ppt/installed/reference-case";

import type extraSelect from "../../tests/reference/native-select-extra/manifest.json";
import type primarySelect from "../../tests/reference/native-select/manifest.json";
import type toast from "../../tests/reference/toast/manifest.json";

export type { DecodedPixels } from "@ppt/installed/installed-compositions-protocol";

export type NativeSelectCaptureManifest =
  | typeof primarySelect
  | typeof extraSelect;

export type ToastCaptureManifest = typeof toast;

/** Suggestion-menu and input captures selected by Command's existing route table. */
export interface CommandCaptureCase extends CapturedReferenceCase {
  element: string;
  background?: string;
  x?: number;
  y?: number;
  labels?: string[];
  selectedIndex?: number;
  targetIndex?: number;
  value?: number;
  text?: string;
  placeholder?: string;
  maxLength?: number;
  cursor?: number;
  anchor?: number;
  caretMs?: number;
}

export interface CommandCaptureManifest {
  sourceJarSha256: string;
  cases: CommandCaptureCase[];
}

/** Input Group consumes the same text/entry/button fields, plus captured textarea scroll position. */
export interface InputGroupCaptureCase extends QuestionnaireCaptureCase {
  value?: number;
}

export interface InputGroupCaptureManifest {
  sourceJarSha256: string;
  cases: InputGroupCaptureCase[];
}

export type InputGroupEntryElement = HTMLInputElement | HTMLTextAreaElement;
