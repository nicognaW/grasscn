import type { ReactNode } from "react";

import { DocumentationNavigation } from "../../components/document-navigation";
import { source } from "../../lib/source";

import "../../components/document-navigation.css";

const DocsLayout = ({ children }: { children: ReactNode }) => (
  <div
    className="minecraft-docs-layout"
  >
    <DocumentationNavigation tree={source.pageTree} />
    {children}
  </div>
);

export default DocsLayout;
