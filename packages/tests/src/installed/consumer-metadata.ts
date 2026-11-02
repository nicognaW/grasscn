export interface PackageMetadata {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface InstalledMetadata {
  name: string;
  version: string;
}

export interface RegistryFile {
  path: string;
  type?: string;
  target?: string;
}

export interface RegistryPayload {
  name: string;
  files: RegistryFile[];
}

const isStringRecord = (value: unknown): value is Record<string, string> =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.values(value).every(
    (entry: unknown): entry is string => typeof entry === "string"
  );

export const isPackageMetadata = (value: unknown): value is PackageMetadata =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  (!("dependencies" in value) || isStringRecord(value.dependencies)) &&
  (!("devDependencies" in value) || isStringRecord(value.devDependencies));

export const isInstalledMetadata = (
  value: unknown
): value is InstalledMetadata =>
  value !== null &&
  typeof value === "object" &&
  "name" in value &&
  typeof value.name === "string" &&
  "version" in value &&
  typeof value.version === "string";

export const isMissingFileError = (
  value: unknown
): value is NodeJS.ErrnoException =>
  value instanceof Error && "code" in value && value.code === "ENOENT";

const isRegistryFile = (value: unknown): value is RegistryFile =>
  value !== null &&
  typeof value === "object" &&
  "path" in value &&
  typeof value.path === "string" &&
  (!("target" in value) || typeof value.target === "string") &&
  (!("type" in value) || typeof value.type === "string");

export const isRegistryPayload = (value: unknown): value is RegistryPayload =>
  value !== null &&
  typeof value === "object" &&
  "name" in value &&
  typeof value.name === "string" &&
  "files" in value &&
  Array.isArray(value.files) &&
  value.files.every(isRegistryFile);
