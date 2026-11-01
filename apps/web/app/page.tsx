import { DocumentLink } from "../components/document-link"
import { TypographyH1 } from "../registry/ui/typography"
import { DocumentParagraph } from "../components/document-paragraph"

export default function HomePage() {
  return <main id="content" className="minecraft-document">
    <TypographyH1>grasscn</TypographyH1>
    <DocumentParagraph>Minecraft UI. shadcn components. Yours to build.</DocumentParagraph>
    <DocumentLink href="/docs">Browse components</DocumentLink>
  </main>
}
