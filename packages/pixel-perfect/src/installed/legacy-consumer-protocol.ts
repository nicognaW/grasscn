import type { InstalledComponentSettings } from "@grasscn/tests/installed-registry-file";
import type { CapturedReferenceCase } from "@ppt/installed/reference-case";

import type avatar from "../../tests/reference/avatar/manifest.json";

export type AvatarCaptureManifest = typeof avatar;

/** Required ABI installed by the retained standalone Avatar consumer producer. */
interface LegacyAvatarBridge {
  renderCase: (
    sample: Pick<
      AvatarCaptureManifest["cases"][number],
      | "background"
      | "name"
      | "label"
      | "scale"
      | "width"
      | "x"
      | "y"
      | "checked"
      | "selected"
    >
  ) => void;
}

export type LegacyAvatarConsumerWindow = typeof window & LegacyAvatarBridge;

/** The retained Calendar bridge forwards the query to URLSearchParams and reads its keyed marker/background. */
export interface LegacyCalendarQuery {
  [field: string]: string;
  case: string;
  background: string;
}

/** Required ABI installed by the retained standalone Calendar consumer producer. */
interface LegacyCalendarBridge {
  renderCalendarCase: (query: LegacyCalendarQuery) => void;
}

export type LegacyCalendarConsumerWindow = typeof window & LegacyCalendarBridge;

export type CalendarConsumerSettings = Pick<
  InstalledComponentSettings,
  "aliases"
> & { rsc?: boolean };

/** Calendar/DatePicker renders day, Card, Label, arrow and optional Button captured constituents. */
export interface CalendarCaptureCase extends CapturedReferenceCase {
  alignment?: string;
  background?: string;
  checked?: boolean;
  label?: string;
  text?: string | null;
  x?: number;
  y?: number;
  wrapWidth?: number;
}

export interface CalendarCaptureManifest {
  sourceJarSha256: string;
  background?: string;
  cases: CalendarCaptureCase[];
}
