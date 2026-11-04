import type { Metadata } from "next";

export const siteUrl = "https://grasscn.dev";
export const siteName = "grasscn";
export const siteTitle = "grasscn: pixel-perfect Minecraft UI for shadcn";

export const siteDescription =
  "Pixel-perfect Minecraft UI components for shadcn, matched pixel by pixel against the game. Original textures, font and sounds. Open source.";

export const siteImage = {
  alt: "grasscn homepage: the GRASSCN block logo above Minecraft-style shadcn components, including buttons, inputs, a bar chart and a form",
  height: 1260,
  type: "image/png",
  url: "/og.png",
  width: 2400,
};

/** Page title, description, canonical URL and matching Open Graph and X card fields. */
export const pageMetadata = ({
  description = siteDescription,
  path,
  title,
}: {
  description?: string;
  path: string;
  title: string;
}): Metadata => {
  const fullTitle = `${title} · ${siteName}`;

  return {
    alternates: { canonical: path },
    description,
    openGraph: {
      description,
      images: [siteImage],
      locale: "en_US",
      siteName,
      title: fullTitle,
      type: "website",
      url: path,
    },
    title,
    twitter: {
      card: "summary_large_image",
      creator: "@nicongdev",
      description,
      images: [siteImage],
      site: "@nicongdev",
      title: fullTitle,
    },
  };
};
