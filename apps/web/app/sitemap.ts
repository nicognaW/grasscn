import type { MetadataRoute } from "next";

import { chartTypes } from "../components/charts/showcase";
import { siteUrl } from "../lib/site";
import { source } from "../lib/source";

const sitemap = (): MetadataRoute.Sitemap => [
  { priority: 1, url: siteUrl },
  ...chartTypes.map(([type]) => ({
    url:
      type === "overview" ? `${siteUrl}/charts` : `${siteUrl}/charts/${type}`,
  })),
  ...source.getPages().map((page) => ({ url: `${siteUrl}${page.url}` })),
];

export default sitemap;
