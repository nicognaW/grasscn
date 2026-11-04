import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocumentH1 } from "../../../components/document-elements";
import { TableOfContents } from "../../../components/document-navigation";
import { pageMetadata } from "../../../lib/site";
import { source } from "../../../lib/source";
import { getMDXComponents } from "../../../mdx-components";

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

  return pageMetadata({
    description: page.data.description,
    path: page.url,
    title: page.data.title,
  });
};

const DocsPage = async ({ params }: PageProps) => {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  const Body = page.data.body;

  return (
    <>
      <main id="content" className="minecraft-document">
        <DocumentH1>{page.data.title}</DocumentH1>
        <article className="minecraft-prose">
          <Body components={getMDXComponents()} />
        </article>
      </main>
      <TableOfContents items={page.data.toc} />
    </>
  );
};

export default DocsPage;
