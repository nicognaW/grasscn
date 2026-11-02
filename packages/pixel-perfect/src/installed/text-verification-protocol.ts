import type {
  CapturedReferenceCase,
  InstalledCaseResult,
} from "@ppt/installed/reference-case";

import type registry from "../../../../apps/web/registry.json";
import type minecraftMap from "../../../../apps/web/registry/minecraft-map.json";
import type messageCapture from "../../tests/reference/message/manifest.json";
import type spinnerCapture from "../../tests/reference/spinner/manifest.json";

export type InstalledTextRegistry = typeof registry;

export type InstalledTextItem = InstalledTextRegistry["items"][number];

export type InstalledTextMap = typeof minecraftMap;

export type MessageCaptureManifest = typeof messageCapture;

export type ComposedTextCaptureManifest =
  | typeof messageCapture
  | typeof spinnerCapture;

/** Button, label, advancement badge and empty-row captures consumed by text aliases. */
export interface TextCaptureCase extends CapturedReferenceCase {
  label: string;
  text?: string;
  alignment?: string;
  background?: string;
  x?: number;
  y?: number;
  wrapWidth?: number;
}

export interface TextCaptureManifest {
  sourceJarSha256: string;
  cases: TextCaptureCase[];
}

export interface TextCaptureGroup {
  manifest: TextCaptureManifest;
  manifestFile: string;
  parts: string[];
}

type InstalledPixelResult = Pick<
  InstalledCaseResult,
  "name" | "mismatchedPixels" | "decodedRgbaSha256"
>;

export type InstalledTextResult = InstalledPixelResult & {
  manifest: string;
  part: string;
};

export type InstalledChatResult = InstalledPixelResult & { part: string };

export type InstalledComposedTextResult = InstalledPixelResult;

export type InstalledChatError =
  | { error: string }
  | { error: string | undefined; name: string; part: string };

/** Preserve the current message projection from the owned Node/PNG/Playwright failure APIs. */
export interface InstalledTextFailure {
  message?: string;
}
