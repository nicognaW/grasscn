import type { ReactNode } from "react";

import { DocumentationNavigation } from "../../components/document-navigation";
import { source } from "../../lib/source";

import "../../components/document-navigation.css";

const DocsLayout = ({ children }: { children: ReactNode }) => (
  <div
    /* eslint-disable shadcn/no-unknown-classes -- Defined by the document-navigation.css imported above. */
    className="minecraft-docs-layout"
    /* eslint-enable shadcn/no-unknown-classes */
  >
    <DocumentationNavigation tree={source.pageTree} />
    {children}
  </div>
);

export default DocsLayout;
