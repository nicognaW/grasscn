import assert from "node:assert/strict";

import { directoryIdentity, sha256 } from "./consumer-boundary";
import type { DirectoryIdentity } from "./consumer-validation-types";

/** @param {string} directory @param {string} framework */
export const consumerBuildIdentity = async (
  directory: string,
  framework: string
): Promise<DirectoryIdentity> => {
  assert.ok(["next", "vite"].includes(framework));

  const identity = await directoryIdentity(
    directory,
    new Set(["cache", "trace", "trace-build"])
  );

  if (framework !== "next") {
    return identity;
  }

  // Pinned Next writes request-time response cache here, outside compiled app/chunks.
  const files = Object.fromEntries(
    Object.entries(identity.files).filter(
      ([filename]) => !filename.startsWith("server/route-cache/")
    )
  );

  const sortedFiles = Object.entries(files);
  sortedFiles.sort(([first], [second]) => {
    if (first < second) {
      return -1;
    }

    return Number(first > second);
  });

  return {
    files,
    sha256: sha256(JSON.stringify(sortedFiles)),
  };
};
