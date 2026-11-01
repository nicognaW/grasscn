import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

import { generatedCode } from "./tooling-scope.mjs";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [...(ultracite.ignorePatterns ?? []), ...generatedCode],
});
