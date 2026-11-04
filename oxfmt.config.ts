import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

import {
  generatedCode,
  retainedEvidenceData,
  retainedSourceInputs,
  vendoredSkills,
} from "./tooling-scope";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    ...generatedCode,
    ...retainedSourceInputs,
    ...retainedEvidenceData,
    ...vendoredSkills,
  ],
});
