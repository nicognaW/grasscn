import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { SpeedInsights } from "@vercel/speed-insights/next";

import grassBlockIcon from "../assets/grass-block-16.png";
import grassBlockIcon48 from "../assets/grass-block-48.png";
import { LegacyDocumentationLinks } from "../components/legacy-documentation-links";
import { SiteFrame } from "../components/site-frame";
import { componentSymbols } from "../lib/component-symbols";
import { loadStarCount } from "../lib/github-stars";
import {
  siteDescription,
  siteImage,
  siteName,
  siteTitle,
  siteUrl,
} from "../lib/site";
import { source } from "../lib/source";

import "./globals.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  applicationName: siteName,
  authors: [{ name: "nicognaW", url: "https://github.com/nicognaW" }],
  description: siteDescription,
  icons: {
    apple: { sizes: "180x180", url: "/apple-touch-icon.png" },
    icon: [
      { sizes: "16x16", type: "image/png", url: grassBlockIcon.src },
      { sizes: "48x48", type: "image/png", url: grassBlockIcon48.src },
    ],
  },
  keywords: [
    "Minecraft UI",
    "shadcn",
    "shadcn/ui",
    "React components",
    "pixel art UI",
    "component registry",
  ],
  metadataBase: new URL(siteUrl),
  openGraph: {
    description: siteDescription,
    images: [siteImage],
    locale: "en_US",
    siteName,
    title: siteTitle,
    type: "website",
    url: "/",
  },
  title: { default: siteTitle, template: `%s · ${siteName}` },
  twitter: {
    card: "summary_large_image",
    creator: "@nicongdev",
    description: siteDescription,
    images: [siteImage],
    site: "@nicongdev",
    title: siteTitle,
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#202020",
};

const RootLayout = async ({ children }: { children: ReactNode }) => {
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

  const starCount = await loadStarCount();

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
          starCount={starCount}
        >
          {children}
        </SiteFrame>
        <LegacyDocumentationLinks pages={pages} groups={groups} />
        <SpeedInsights />
      </body>
    </html>
  );
};

export default RootLayout;
