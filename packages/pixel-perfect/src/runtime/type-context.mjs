import path from "node:path";

import { pixelPerfectRoot } from "@grasscn/tests/paths";

/** @type {string} */
export const bunRuntimeVersion = Bun.version;

/** @type {string} */
export const capturedReferenceOwner = path.join(pixelPerfectRoot, "tests");
