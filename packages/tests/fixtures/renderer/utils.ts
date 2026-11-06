import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
};

// Preserve content-derived names; supply a nonvisual name only when every rendered naming source is blank.
export const fixtureFallbackLabel = function fixtureFallbackLabel(
  fallback: string,
  ...sources: (string | boolean | null | undefined)[]
): string | undefined {
  return sources.some(
    (source) =>
      source === true || (source !== false && (source?.trim().length ?? 0) > 0)
  )
    ? undefined
    : fallback;
};
