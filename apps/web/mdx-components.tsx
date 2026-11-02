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

export const getMDXComponents = (
  components: MDXComponents = {}
): MDXComponents => ({
  a: DocumentLink,
  blockquote: TypographyBlockquote,
  code: DocumentInlineCode,
  h1: DocumentH1,
  h2: DocumentH2,
  h3: DocumentH3,
  h4: DocumentH4,
  h5: DocumentH5,
  h6: DocumentH6,
  li: DocumentListItem,
  p: DocumentParagraph,
  pre: DocumentCodeBlock,
  table: TypographyTable,
  td: DocumentTableCell,
  th: DocumentTableHeader,
  ul: TypographyList,
  ...components,
});

export const useMDXComponents = getMDXComponents;
