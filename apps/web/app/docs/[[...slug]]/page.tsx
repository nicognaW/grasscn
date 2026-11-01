import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { source } from "../../../lib/source"
import { getMDXComponents } from "../../../mdx-components"
import { TypographyH1 } from "../../../registry/ui/typography"
import { DocumentationNavigation, TableOfContents } from "../../../components/document-navigation"
import "../../../components/document-navigation.css"

type PageProps = { params: Promise<{ slug?: string[] }> }

export function generateStaticParams() { return source.generateParams() }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) notFound()
  return { title: page.data.title, description: page.data.description }
}

export default async function DocsPage({ params }: PageProps) {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) notFound()
  const Body = page.data.body
  return <div className="minecraft-docs-layout"><DocumentationNavigation tree={source.pageTree} currentUrl={page.url} /><main id="content" className="minecraft-document">
    <TypographyH1>{page.data.title}</TypographyH1>
    <article className="minecraft-prose"><Body components={getMDXComponents()} /></article>
  </main><TableOfContents items={page.data.toc} /></div>
}
