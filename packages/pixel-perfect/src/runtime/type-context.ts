import path from "node:path";

import { pixelPerfectRoot } from "@ppt/paths";

/** @type {string} */
export const bunRuntimeVersion: string = Bun.version;

/** @type {string} */
export const capturedReferenceOwner: string = path.join(
  pixelPerfectRoot,
  "tests"
);
