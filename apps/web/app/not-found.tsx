import { DocumentLink } from "../components/document-link";
import { DocumentParagraph } from "../components/document-paragraph";
import { TypographyH1 } from "../registry/ui/typography";

const NotFound = () => (
  <main id="content" className="minecraft-document">
    <TypographyH1>Page not found</TypographyH1>
    <DocumentParagraph>This page is not available.</DocumentParagraph>
    <DocumentLink href="/docs">Back to components</DocumentLink>
  </main>
);

export default NotFound;
