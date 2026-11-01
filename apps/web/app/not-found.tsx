import { DocumentLink } from "../components/document-link"
import { TypographyH1 } from "../registry/ui/typography"
import { DocumentParagraph } from "../components/document-paragraph"

export default function NotFound() {
  return <main id="content" className="minecraft-document">
    <TypographyH1>Page not found</TypographyH1>
    <DocumentParagraph>This page is not available.</DocumentParagraph>
    <DocumentLink href="/docs">Back to components</DocumentLink>
  </main>
}
