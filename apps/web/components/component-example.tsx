import { readFile } from "node:fs/promises";
import path from "node:path";

import { examples } from "../examples/catalog";
import { exampleInstallation } from "../lib/example-installation";
import { TypographyList } from "../registry/ui/typography";
import { DocumentListItem } from "./document-elements";
import { DocumentLink } from "./document-link";
import { DocumentText } from "./document-text";
import { ExampleTabs } from "./example-tabs";

export const ComponentExample = async ({
  name,
  title,
  tabListLayout,
}: {
  name: string;
  title?: string;
  tabListLayout?: "responsive" | "compact";
}) => {
  if (!Object.hasOwn(examples, name)) {
    return (
      <DocumentText
        role="alert"
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
        role="alert"
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
      tabListLayout={tabListLayout}
      installation={
        <div data-example-installation={entry.filename}>
          <DocumentText>
            To run this copied example, install these items using the linked CLI
            or manual instructions:
          </DocumentText>
          <TypographyList>
            {exampleInstallation(code).map((item) => (
              <DocumentListItem key={item}>
                <DocumentLink
                  href={`/docs/components/${item}#installation`}
                  data-example-item={item}
                >
                  {item}
                </DocumentLink>
              </DocumentListItem>
            ))}
          </TypographyList>
        </div>
      }
    >
      <entry.Component />
    </ExampleTabs>
  );
};
