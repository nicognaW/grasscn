import { readFile } from "node:fs/promises";
import path from "node:path";

import { examples } from "../examples/catalog";
import { DocumentText } from "./document-text";
import { ExampleTabs } from "./example-tabs";

export const ComponentExample = async ({
  name,
  title,
  tabListWidth,
}: {
  name: string;
  title?: string;
  tabListWidth?: number;
}) => {
  if (!Object.hasOwn(examples, name)) {
    return (
      <DocumentText
        /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
        role="alert"
        /* eslint-enable jsx-a11y/prefer-tag-over-role */
      >
        Example unavailable: {name}
      </DocumentText>
    );
  }

  const entry = examples[name];

  let code: string | undefined;

  try {
    code = await readFile(
      path.join(process.cwd(), "examples", entry.filename),
      "utf-8"
    );
  } catch {
    // Source I/O failures use the existing retry message below.
  }

  if (code === undefined) {
    return (
      <DocumentText
        /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
        role="alert"
        /* eslint-enable jsx-a11y/prefer-tag-over-role */
      >
        Example source could not be loaded: {name}. Reload this page to retry.
      </DocumentText>
    );
  }

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
};
