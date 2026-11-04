import type { MetadataRoute } from "next";

import grassBlockIcon from "../assets/grass-block-48.png";
import { siteDescription, siteName } from "../lib/site";

const manifest = (): MetadataRoute.Manifest => ({
  background_color: "#202020",
  description: siteDescription,
  display: "browser",
  icons: [{ sizes: "48x48", src: grassBlockIcon.src, type: "image/png" }],
  name: siteName,
  short_name: siteName,
  start_url: "/",
  theme_color: "#202020",
});

export default manifest;
