import { readFile } from "node:fs/promises";
import path from "node:path";

import { examples } from "../examples/catalog";
import { DocumentText } from "./document-text";
import { ExampleTabs } from "./example-tabs";

export async function ComponentExample({
  name,
  title,
  tabListWidth,
}: {
  name: string;
  title?: string;
  tabListWidth?: number;
}) {
  if (!Object.hasOwn(examples, name))
    return (
      <DocumentText role="alert">Example unavailable: {name}</DocumentText>
    );
  const entry = examples[name];
  try {
    const code = await readFile(
      path.join(process.cwd(), "examples", entry.filename),
      "utf8"
    );
    return (
      <ExampleTabs
        code={code}
        filename={entry.filename}
        title={title ?? entry.title}
        tabListWidth={tabListWidth}
      >
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
