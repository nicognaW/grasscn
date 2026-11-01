import type { MDXComponents } from "mdx/types";

import { DocumentCodeBlock } from "./components/document-code-block";
import {
  DocumentH1,
  DocumentH2,
  DocumentH3,
  DocumentH4,
  DocumentH5,
  DocumentH6,
  DocumentListItem,
  DocumentTableCell,
  DocumentTableHeader,
  DocumentInlineCode,
} from "./components/document-elements";
import { DocumentLink } from "./components/document-link";
import { DocumentParagraph } from "./components/document-paragraph";
import {
  TypographyBlockquote,
  TypographyList,
  TypographyTable,
} from "./registry/ui/typography";

export function getMDXComponents(
  components: MDXComponents = {}
): MDXComponents {
  return {
    a: DocumentLink,
    h1: DocumentH1,
    h2: DocumentH2,
    h3: DocumentH3,
    h4: DocumentH4,
    h5: DocumentH5,
    h6: DocumentH6,
    p: DocumentParagraph,
    blockquote: TypographyBlockquote,
    code: DocumentInlineCode,
    pre: DocumentCodeBlock,
    li: DocumentListItem,
    th: DocumentTableHeader,
    td: DocumentTableCell,
    ul: TypographyList,
    table: TypographyTable,
    ...components,
  };
}

export const useMDXComponents = getMDXComponents;
