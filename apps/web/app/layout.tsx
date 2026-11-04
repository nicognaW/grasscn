import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Analytics } from "@vercel/analytics/next";

import grassBlockIcon from "../assets/grass-block-16.png";
import { LegacyDocumentationLinks } from "../components/legacy-documentation-links";
import { SiteFrame } from "../components/site-frame";
import { componentSymbols } from "../lib/component-symbols";
import { source } from "../lib/source";

import "./globals.css";

export const metadata: Metadata = {
  description: "Pixel-perfect Minecraft UI. shadcn components. Yours to build.",
  icons: {
    icon: { sizes: "16x16", type: "image/png", url: grassBlockIcon.src },
  },
  title: { default: "grasscn", template: "%s · grasscn" },
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  const pages: Record<string, string> = {};

  for (const page of source.getPages()) {
    if (page.slugs.length !== 2 || page.slugs[0] !== "components") {
      continue;
    }

    pages[page.slugs[1]] = page.url;

    for (const alias of page.data.aliases) {
      /* eslint-disable react/todo -- Build source-owned server route metadata before JSX; React Compiler is not enabled. */
      pages[alias] ??= page.url;
      /* eslint-enable react/todo */
    }
  }

  const groups: Record<string, { from: string; url: string }> = {};

  for (const [name, info] of Object.entries(componentSymbols)) {
    if (name === info.registryItem || !pages[name]) {
      continue;
    }

    for (const symbol of info.exports) {
      /* eslint-disable react/todo -- Build source-owned server route metadata before JSX; React Compiler is not enabled. */
      groups[symbol] ??= { from: info.registryItem, url: pages[name] };
      /* eslint-enable react/todo */
    }
  }

  return (
    <html lang="en">
      <body>
        <SiteFrame
          searchPages={source.getPages().map((page) => ({
            description: page.data.description ?? "",
            terms: [
              ...page.data.aliases,
              ...page.data.exports,
              ...(componentSymbols[page.slugs.at(-1) ?? ""]?.exports ?? []),
            ],
            title: page.data.title,
            url: page.url,
          }))}
        >
          {children}
        </SiteFrame>
        <LegacyDocumentationLinks pages={pages} groups={groups} />
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
