import path from "node:path";

import { pixelPerfectRoot } from "@ppt/paths";

/** @type {string} */
export const bunRuntimeVersion = Bun.version;

/** @type {string} */
export const capturedReferenceOwner = path.join(pixelPerfectRoot, "tests");
