import path from "node:path";

import { installationSource } from "../lib/installation";
import registry from "../registry.json";
import { CodeView } from "./code-view";
import { DocumentLink } from "./document-link";
import { DocumentParagraph } from "./document-paragraph";
import { DocumentText } from "./document-text";

export const ComponentSource = async ({
  name,
  title = name,
  initialFile,
}: {
  name: string;
  title?: string;
  initialFile?: string;
}) => {
  const item = registry.items.find((entry) => entry.name === name);

  const index =
    item?.files.findIndex((entry) =>
      initialFile !== undefined && initialFile !== ""
        ? entry.path === initialFile
        : path.posix.basename(entry.path) === `${name}.tsx`
    ) ?? -1;

  if (index < 0) {
    return (
      <DocumentText role="alert">
        Component source unavailable: {name}
      </DocumentText>
    );
  }

  let source;

  try {
    source = await installationSource(name, String(index));
  } catch {
    // Source I/O failures use the existing retry message below.
  }

  if (!source) {
    return (
      <DocumentText role="alert">
        Component source could not be loaded: {name}. Reload this page to retry.
      </DocumentText>
    );
  }

  return (
    <section
      /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
      className="documentation-implementation"
      /* eslint-enable shadcn/no-unknown-classes */
      aria-label={`${title} implementation source`}
    >
      <DocumentParagraph>
        This is the component implementation. Its supporting styles, helpers and
        resources are also required. See{" "}
        <DocumentLink href="#installation">
          complete manual installation
        </DocumentLink>
        .
      </DocumentParagraph>
      <CodeView
        code={source.contents}
        filename={source.destination}
        label="Component implementation"
      />
    </section>
  );
};
