import type cjkButton from "../../tests/reference/button-cjk/manifest.json";
import type otp from "../../tests/reference/input-otp/manifest.json";
import type item from "../../tests/reference/item/manifest.json";
import type label from "../../tests/reference/label/manifest.json";
import type button from "../../tests/reference/manifest.json";
import type separator from "../../tests/reference/separator/manifest.json";

export type OtpCaptureManifest = typeof otp;

type AttachmentRow = (typeof item)["cases"][number];

type AttachmentAction = (
  | (typeof button)["cases"][number]
  | (typeof cjkButton)["cases"][number]
) & {
  background?: never;
  selected?: never;
  text?: never;
  placeholder?: never;
  x?: number;
  y?: number;
};

/** Attachment rows use Item captures; actions use the two registered button producers. */
export interface AttachmentCaptureManifest {
  sourceJarSha256: string;
  background?: string;
  cases: (AttachmentRow | AttachmentAction)[];
}

type MarkerText = (typeof label)["cases"][number];

type MarkerLine = (typeof separator)["cases"][number] & {
  label?: never;
  alignment?: never;
  wrapWidth?: never;
};

/** Both current Marker constituent producers omit timeMs; keep the verifier's existing fallback read. */
export interface MarkerCaptureManifest {
  sourceJarSha256: string;
  cases: ((MarkerText | MarkerLine) & { timeMs?: never })[];
}
