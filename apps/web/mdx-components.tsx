import type { MDXComponents } from "mdx/types"
import { DocumentParagraph } from "./components/document-paragraph"
import { DocumentLink } from "./components/document-link"
import {
  TypographyH1, TypographyH2, TypographyH3, TypographyH4,
  TypographyBlockquote, TypographyInlineCode,
  TypographyList, TypographyTable,
} from "./registry/ui/typography"

export function getMDXComponents(components: MDXComponents = {}): MDXComponents {
  return {
    a: DocumentLink,
    h1: TypographyH1,
    h2: TypographyH2,
    h3: TypographyH3,
    h4: TypographyH4,
    p: DocumentParagraph,
    blockquote: TypographyBlockquote,
    code: TypographyInlineCode,
    ul: TypographyList,
    table: TypographyTable,
    ...components,
  }
}

export const useMDXComponents = getMDXComponents
