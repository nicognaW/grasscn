import { expect, test } from "bun:test";

import { assertExamplePrerequisites } from "../../src/installed/example-prerequisites.mjs";

const code = `import { Tabs } from "@/components/ui/tabs";
import { Typography } from "@/components/ui/typography";`;

const manifests = [
  { files: [{ destination: "components/ui/tabs.tsx" }], name: "tabs" },
  {
    files: [{ destination: "components/ui/typography.tsx" }],
    name: "typography",
  },
];

test("copied example cannot borrow an undeclared prerequisite from the combined consumer", () => {
  expect(() => {
    assertExamplePrerequisites(code, ["tabs"], manifests);
  }).toThrow("@/components/ui/typography");
  expect(() => {
    assertExamplePrerequisites(code, ["tabs", "typography"], manifests);
  }).not.toThrow();
});
