import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

import {
  generatedCode,
  retainedEvidenceData,
  retainedSourceInputs,
} from "./tooling-scope";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    ...generatedCode,
    ...retainedSourceInputs,
    ...retainedEvidenceData,
  ],
  sortImports: {
    groups: [
      "type",
      "builtin",
      "external",
      ["internal", "subpath"],
      ["parent", "sibling", "index"],
      "style",
      "unknown",
    ],
    ignoreCase: true,
    newlinesBetween: true,
    order: "asc",
  },
});
