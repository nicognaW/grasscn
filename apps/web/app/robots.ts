import type { MetadataRoute } from "next";

import { siteUrl } from "../lib/site";

const robots = (): MetadataRoute.Robots => ({
  host: siteUrl,
  rules: { allow: "/", disallow: "/api/", userAgent: "*" },
  sitemap: `${siteUrl}/sitemap.xml`,
});

export default robots;
