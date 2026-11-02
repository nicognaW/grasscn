/** Shared capture identity emitted by capture.mjs and capture-controls.mjs. */
export interface CapturedReferenceCase {
  name: string;
  sha256: string;
  state: string;
  width: number;
  height: number;
  scale: number;
}

export interface PositionedReferenceCase extends CapturedReferenceCase {
  x: number;
  y: number;
  background?: string;
}

export interface ToggleReferenceCase extends PositionedReferenceCase {
  checked: boolean;
  background: string;
}

export interface MenuReferenceCase extends PositionedReferenceCase {
  element: string;
  background: string;
  label?: string;
  labels?: string[];
  checked?: boolean;
  selectedIndex?: number;
  targetIndex?: number;
  value?: number;
}

export interface MenubarTriggerReferenceCase extends CapturedReferenceCase {
  label: string;
  x?: number;
  y?: number;
}

export interface PopoverReferenceCase extends PositionedReferenceCase {
  background: string;
  label?: string;
  text?: string;
}

export interface DialogReferenceCase extends PositionedReferenceCase {
  element: "dialog" | "alert-dialog";
  background: string;
  label: string;
  text: string;
  labels: string[];
  value?: number;
  wrapWidth?: number;
  disabledIndex?: number;
  targetIndex?: number;
  checked?: boolean;
}

interface FixtureCase extends CapturedReferenceCase {
  label?: string;
  checked?: boolean;
  background?: string;
  x?: number;
  y?: number;
}

interface BasicFixtureCase extends FixtureCase {
  element?: "button" | "checkbox" | "separator" | "radio-group" | "switch";
}

interface SliderReferenceCase extends FixtureCase {
  element: "slider";
  value: number;
}

interface TextInputReferenceCase extends PositionedReferenceCase {
  element: "input" | "textarea";
  label?: string;
  checked?: boolean;
  text: string;
  caretMs: number;
  placeholder?: string;
  maxLength?: number;
  cursor?: number;
  anchor?: number;
  value?: number;
}

interface TooltipReferenceCase extends PositionedReferenceCase {
  element: "tooltip";
  label?: string;
  checked?: boolean;
  background: string;
  text: string;
  wrapWidth: number;
}

interface CardReferenceCase extends PositionedReferenceCase {
  element: "card";
  label?: string;
  checked?: boolean;
  text?: string;
}

interface LabelReferenceCase extends PositionedReferenceCase {
  element: "label";
  checked?: boolean;
  label: string;
  alignment: string;
  wrapWidth?: number;
}

interface ScrollAreaReferenceCase extends PositionedReferenceCase {
  element: "scroll-area";
  checked?: boolean;
  label?: string;
  contentHeight: number;
  value: number;
}

interface ProgressReferenceCase extends PositionedReferenceCase {
  element: "progress";
  checked?: boolean;
  label?: string;
  value: number;
  color: string;
  overlay: string;
}

export interface TabsReferenceCase extends PositionedReferenceCase {
  element: "tabs-trigger" | "tabs";
  checked?: boolean;
  label?: string;
  labels?: string[];
  selected?: boolean;
  selectedIndex?: number;
  targetIndex?: number;
  disabledIndex?: number;
  timeMs: number;
  contentHeight?: number;
}

export interface SelectReferenceCase extends PositionedReferenceCase {
  element: "select-trigger" | "select-list";
  checked?: boolean;
  label?: string;
  labels?: string[];
  selectedIndex?: number;
  disabledIndex?: number;
  targetIndex?: number;
  timeMs: number;
  value?: number;
}

/** Registered native elements that use the verifier's unchanged general fixture path.
 * Only the common fields consumed by that path are projected; producer-specific
 * payload remains in the loaded record and is not fabricated here. */
interface OtherFixtureCase extends FixtureCase {
  element:
    | "advancement-badge"
    | "advancement-tree"
    | "air"
    | "alert-dialog"
    | "armor"
    | "book"
    | "chart-fps"
    | "chart-pie"
    | "chat-row"
    | "dialog"
    | "empty-row"
    | "experience"
    | "hanging-sign"
    | "health"
    | "hotbar"
    | "hunger"
    | "item-row"
    | "locator"
    | "map"
    | "menu-checkbox"
    | "menu-disabled"
    | "menu-label"
    | "menu-label-inset"
    | "menu-panel"
    | "menu-separator"
    | "menu-sub-trigger"
    | "native-list-background-crop"
    | "pagination-arrow"
    | "player-face"
    | "player-list"
    | "player-preview"
    | "popover"
    | "scoreboard"
    | "sign"
    | "spinner"
    | "suggestion-list"
    | "system-toast"
    | "toggle-filter"
    | "trading"
    | "trading-scrollbar";
}

export type FixtureReferenceCase =
  | OtherFixtureCase
  | BasicFixtureCase
  | SliderReferenceCase
  | TextInputReferenceCase
  | TooltipReferenceCase
  | CardReferenceCase
  | LabelReferenceCase
  | ScrollAreaReferenceCase
  | ProgressReferenceCase
  | TabsReferenceCase
  | SelectReferenceCase;

export interface InstalledReferenceManifest {
  sourceJarSha256: string;
  effectiveAssets?: {
    assetIndex: string;
    assetIndexSha256: string;
    resources: Record<string, { sha1: string; sha256: string; size: number }>;
  };
  cases: CapturedReferenceCase[];
}

export interface InstalledCaseResult {
  name: string;
  mismatchedPixels: number;
  decodedRgbaSha256: string;
  multipleDecodedRgbaSha256?: string;
  radioDecodedRgbaSha256?: string;
  openDecodedRgbaSha256?: string;
  expandedDecodedRgbaSha256?: string;
}
