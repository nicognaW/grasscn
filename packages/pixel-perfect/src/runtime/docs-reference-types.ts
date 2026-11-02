import assert from "node:assert/strict";

export interface NativeCase {
  name: string;
  sha256: string;
}

export interface NativeManifest {
  background?: string;
  captureSourceSha256?: string;
  caseDefinitionSha256?: string;
  cases: NativeCase[];
  minecraftVersion?: string;
  sourceJarSha256?: string;
}

export interface HeaderReference extends NativeCase {
  background: string;
  height: number;
  path: string;
  scale: number;
  width: number;
}

export interface HeaderManifest extends NativeManifest {
  cases: HeaderReference[];
  repeatDecodedRgbaEqual: boolean;
  scope: string;
}

export interface NavigationReference extends NativeCase {
  caretMs?: number;
  height: number;
  scale: number;
  state: string;
  width: number;
}

export interface NavigationManifest extends NativeManifest {
  captureSourceSha256: string;
  caseDefinitionSha256: string;
  cases: NavigationReference[];
  minecraftVersion: string;
  sourceJarSha256: string;
}

export interface HeaderCaseDefinition {
  background: string;
  name: string;
  scale: number;
}

export interface HeaderCapture {
  captureSourceSha256: string;
  caseDefinitionSha256: string;
  sourceJarSha256: string;
}

export interface ImageIdentity {
  decodedRgbaSha256: string;
  height: number;
  sha256: string;
  width: number;
}

export interface NativeLibrary {
  downloads?: { artifact?: { path?: string } };
  name: string;
  rules?: { action: string; os?: { arch?: string; name?: string } }[];
}

export interface MinecraftMetadata {
  assetIndex: { id: string };
  libraries: NativeLibrary[];
}

export interface InstallationCase {
  element: string;
  label?: string;
  name: string;
}

const isString = (value: unknown): value is string => typeof value === "string";

const isNumber = (value: unknown): value is number => typeof value === "number";

// eslint-disable-next-line anti-slop/no-unsafe-dictionary-type -- Native protocol members remain unknown until the adjacent field guards validate their domain shapes.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && value instanceof Object && !Array.isArray(value);

const isNativeCase = (value: unknown): value is NativeCase =>
  isRecord(value) && isString(value.name) && isString(value.sha256);

const isManifest = (value: unknown): value is NativeManifest =>
  isRecord(value) &&
  Array.isArray(value.cases) &&
  value.cases.every(isNativeCase) &&
  [
    value.background,
    value.captureSourceSha256,
    value.caseDefinitionSha256,
    value.minecraftVersion,
    value.sourceJarSha256,
  ].every((field) => field === undefined || isString(field));

const isHeaderReference = (value: unknown): value is HeaderReference =>
  isRecord(value) &&
  isString(value.name) &&
  isString(value.sha256) &&
  isString(value.background) &&
  isString(value.path) &&
  [value.height, value.width, value.scale].every(isNumber);

const isHeaderManifest = (value: unknown): value is HeaderManifest =>
  isRecord(value) &&
  Array.isArray(value.cases) &&
  value.cases.every(isHeaderReference) &&
  (value.repeatDecodedRgbaEqual === true ||
    value.repeatDecodedRgbaEqual === false) &&
  isString(value.scope) &&
  isManifest(value);

const isNavigationReference = (value: unknown): value is NavigationReference =>
  isRecord(value) &&
  isString(value.name) &&
  isString(value.sha256) &&
  [value.height, value.width, value.scale].every(isNumber) &&
  isString(value.state) &&
  (value.caretMs === undefined || isNumber(value.caretMs));

const isNavigationManifest = (value: unknown): value is NavigationManifest =>
  isRecord(value) &&
  Array.isArray(value.cases) &&
  value.cases.every(isNavigationReference) &&
  [
    value.captureSourceSha256,
    value.caseDefinitionSha256,
    value.minecraftVersion,
    value.sourceJarSha256,
  ].every(isString) &&
  isManifest(value);

const isHeaderCase = (value: unknown): value is HeaderCaseDefinition =>
  isRecord(value) &&
  isString(value.name) &&
  isString(value.background) &&
  isNumber(value.scale);

const isCapture = (value: unknown): value is HeaderCapture =>
  isRecord(value) &&
  [
    value.captureSourceSha256,
    value.caseDefinitionSha256,
    value.sourceJarSha256,
  ].every(isString);

const isImageIdentity = (value: unknown): value is ImageIdentity =>
  isRecord(value) &&
  isString(value.sha256) &&
  isString(value.decodedRgbaSha256) &&
  isNumber(value.width) &&
  isNumber(value.height);

const isRule = (
  value: unknown
): value is NonNullable<NativeLibrary["rules"]>[number] =>
  isRecord(value) &&
  isString(value.action) &&
  (value.os === undefined ||
    (isRecord(value.os) &&
      [value.os.name, value.os.arch].every(
        (field) => field === undefined || isString(field)
      )));

const isLibrary = (value: unknown): value is NativeLibrary =>
  isRecord(value) &&
  isString(value.name) &&
  (value.rules === undefined ||
    (Array.isArray(value.rules) && value.rules.every(isRule))) &&
  (value.downloads === undefined ||
    (isRecord(value.downloads) &&
      (value.downloads.artifact === undefined ||
        (isRecord(value.downloads.artifact) &&
          (value.downloads.artifact.path === undefined ||
            isString(value.downloads.artifact.path))))));

const isMinecraftMetadata = (value: unknown): value is MinecraftMetadata =>
  isRecord(value) &&
  isRecord(value.assetIndex) &&
  isString(value.assetIndex.id) &&
  Array.isArray(value.libraries) &&
  value.libraries.every(isLibrary);

const isInstallationCase = (value: unknown): value is InstallationCase =>
  isRecord(value) &&
  isString(value.element) &&
  isString(value.name) &&
  (value.label === undefined || isString(value.label));

export const parseNativeManifest = (text: string): NativeManifest => {
  const value: unknown = JSON.parse(text);
  assert.ok(isManifest(value), "Native manifest case identities required");

  return value;
};

export const parseHeaderManifest = (text: string): HeaderManifest => {
  const value: unknown = JSON.parse(text);
  assert.ok(isHeaderManifest(value), "Header native reference fields required");

  return value;
};

export const parseNavigationManifest = (text: string): NavigationManifest => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isNavigationManifest(value),
    "Navigation native reference fields required"
  );

  return value;
};

export const parseHeaderCase = (text: string): HeaderCaseDefinition => {
  const value: unknown = JSON.parse(text);
  assert.ok(isHeaderCase(value), "Declared header case required");

  return value;
};

export const parseHeaderCapture = (text: string): HeaderCapture => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isCapture(value),
    "Header source and case capture identities required"
  );

  return value;
};

export const parseImageIdentity = (text: string): ImageIdentity => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isImageIdentity(value),
    "Decoded image dimensions and hashes required"
  );

  return value;
};

export const parseMinecraftMetadata = (text: string): MinecraftMetadata => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    isMinecraftMetadata(value),
    "Minecraft library and asset metadata required"
  );

  return value;
};

export const parseInstallationCases = (text: string): InstallationCase[] => {
  const value: unknown = JSON.parse(text);
  assert.ok(
    Array.isArray(value) && value.every(isInstallationCase),
    "Installation reference case definitions required"
  );

  return value;
};

export const nativeReference = (
  manifest: NativeManifest,
  name: string
): NativeCase => {
  const entry = manifest.cases.find((item) => item.name === name);
  assert.ok(entry, `Missing declared native case: ${name}`);

  return entry;
};

export interface InstallationInventory {
  files: { source: string }[];
}

const isInstallationFile = (value: unknown): value is { source: string } =>
  isRecord(value) && isString(value.source);

export const installationInventory = (
  // eslint-disable-next-line anti-slop/no-unknown-parameters -- Validate the public installation HTTP response before using its listed source paths.
  value: unknown
): InstallationInventory => {
  assert.ok(
    isRecord(value) &&
      Array.isArray(value.files) &&
      value.files.every(isInstallationFile),
    "Public installation source file inventory required"
  );

  return { files: value.files };
};
