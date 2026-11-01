import assert from "node:assert/strict";

import { directoryIdentity, sha256 } from "./consumer-boundary.mjs";

/** @param {string} directory @param {string} framework */
export const consumerBuildIdentity = async (directory, framework) => {
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

  return {
    files,
    sha256: sha256(
      JSON.stringify(
        Object.entries(files).toSorted(([first], [second]) => {
          if (first < second) {
            return -1;
          }

          return Number(first > second);
        })
      )
    ),
  };
};
