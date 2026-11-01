import { readFile } from "node:fs/promises";
import path from "node:path";

import ButtonExample from "../examples/button-example";
import { DocumentText } from "./document-text";
import { ExampleTabs } from "./example-tabs";

// The executable file itself is the displayed consumer source. No independent snippet or source transform.
const examples = {
  "button-example": {
    Component: ButtonExample,
    filename: "button-example.tsx",
    title: "Button example",
  },
};

export async function ComponentExample({ name }: { name: string }) {
  if (!Object.hasOwn(examples, name))
    return (
      <DocumentText role="alert">Example unavailable: {name}</DocumentText>
    );
  const entry = examples[name as keyof typeof examples];
  try {
    const code = await readFile(
      path.join(process.cwd(), "examples", entry.filename),
      "utf8"
    );
    return (
      <ExampleTabs code={code} filename={entry.filename} title={entry.title}>
        <entry.Component />
      </ExampleTabs>
    );
  } catch {
    return (
      <DocumentText role="alert">
        Example source could not be loaded: {name}. Reload this page to retry.
      </DocumentText>
    );
  }
}
