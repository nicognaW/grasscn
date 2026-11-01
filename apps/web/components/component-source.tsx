import { readFile } from "node:fs/promises";
import path from "node:path";

import registry from "../registry.json";
import { CodeView } from "./code-view";
import { DocumentLink } from "./document-link";
import { DocumentParagraph } from "./document-paragraph";
import { DocumentText } from "./document-text";

export async function ComponentSource({
  name,
  title = name,
}: {
  name: string;
  title?: string;
}) {
  const item = registry.items.find((entry) => entry.name === name);
  const file = item?.files.find(
    (entry) => path.basename(entry.path) === `${name}.tsx`
  );
  if (!file)
    return (
      <DocumentText role="alert">
        Component source unavailable: {name}
      </DocumentText>
    );
  try {
    if (!file.path.startsWith("registry/"))
      throw Error("Unsupported registry source path");
    const code = await readFile(
      path.join(process.cwd(), "registry", file.path.slice("registry/".length)),
      "utf8"
    );
    const filename =
      "target" in file && typeof file.target === "string"
        ? file.target.replace("@components/", "components/")
        : `components/ui/${path.basename(file.path)}`;
    return (
      <section
        className="documentation-implementation"
        aria-label={`${title} implementation source`}
      >
        <DocumentParagraph>
          This is the component implementation. Its supporting styles, helpers
          and resources are also required. See{" "}
          <DocumentLink href="#installation">
            complete manual installation
          </DocumentLink>
          .
        </DocumentParagraph>
        <CodeView
          code={code}
          filename={filename}
          label="Component implementation"
        />
      </section>
    );
  } catch {
    return (
      <DocumentText role="alert">
        Component source could not be loaded: {name}. Reload this page to retry.
      </DocumentText>
    );
  }
}
