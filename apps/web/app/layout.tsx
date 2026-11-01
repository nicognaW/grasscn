import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LegacyDocumentationLinks } from "../components/legacy-documentation-links";
import { SiteFrame } from "../components/site-frame";
import { componentSymbols } from "../lib/component-symbols";
import { source } from "../lib/source";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "grasscn", template: "%s · grasscn" },
  description: "Pixel-perfect Minecraft UI. shadcn components. Yours to build.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const pages: Record<string, string> = {};
  for (const page of source.getPages()) {
    if (page.slugs.length !== 2 || page.slugs[0] !== "components") continue;
    pages[page.slugs[1]] = page.url;
    for (const alias of page.data.aliases) pages[alias] ??= page.url;
  }
  const groups: Record<string, { from: string; url: string }> = {};
  for (const [name, info] of Object.entries(componentSymbols)) {
    if (name === info.registryItem || !pages[name]) continue;
    for (const symbol of info.exports)
      groups[symbol] ??= { from: info.registryItem, url: pages[name] };
  }
  return (
    <html lang="en">
      <body>
        <SiteFrame>{children}</SiteFrame>
        <LegacyDocumentationLinks pages={pages} groups={groups} />
      </body>
    </html>
  );
}
