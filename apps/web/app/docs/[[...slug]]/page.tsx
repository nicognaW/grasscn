import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  DocumentationNavigation,
  TableOfContents,
} from "../../../components/document-navigation";
import { source } from "../../../lib/source";
import { getMDXComponents } from "../../../mdx-components";
import { TypographyH1 } from "../../../registry/ui/typography";

import "../../../components/document-navigation.css";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export const generateStaticParams = () => source.generateParams();

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  return { description: page.data.description, title: page.data.title };
};

const DocsPage = async ({ params }: PageProps) => {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  const Body = page.data.body;

  return (
    <div /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/document-navigation.css and loaded by the documentation layout. */
      className="minecraft-docs-layout"
      /* eslint-enable shadcn/no-unknown-classes */
    >
      <DocumentationNavigation tree={source.pageTree} currentUrl={page.url} />
      <main id="content" className="minecraft-document">
        <TypographyH1>{page.data.title}</TypographyH1>
        <article className="minecraft-prose">
          <Body components={getMDXComponents()} />
        </article>
      </main>
      <TableOfContents items={page.data.toc} />
    </div>
  );
};

export default DocsPage;
