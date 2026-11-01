import path from "node:path";

const hasForbiddenCasePathCharacters = (value: string) => {
  for (const char of value) {
    const code = char.codePointAt(0);

    if (code !== undefined && (code < 32 || code === 127 || char === "›")) {
      return true;
    }
  }

  return false;
};

const isRelativeCasePathCandidate = (
  value: string | undefined
): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  !hasForbiddenCasePathCharacters(value) &&
  !path.posix.isAbsolute(value) &&
  !path.win32.isAbsolute(value) &&
  !/^[A-Za-z]:/u.test(value);

export function normalizeCasePath(value: string | undefined) {
  if (!isRelativeCasePathCandidate(value)) {
    throw new Error("Expected a safe relative case path");
  }

  const normalized = value.replaceAll("\\", "/");

  if (
    normalized.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("Case path must not escape or contain ambiguous segments");
  }

  return normalized;
}

export function relativeCaseFile(root: string, file: string) {
  return normalizeCasePath(path.relative(root, file).replaceAll(path.sep, "/"));
}

const escape = (value: string) =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");

export function browserFilePattern(file: string) {
  return String.raw`(?:^|[\\/])${normalizeCasePath(file)
    .split("/")
    .map(escape)
    .join(String.raw`[\\/]`)}$`;
}
