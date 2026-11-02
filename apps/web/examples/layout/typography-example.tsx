"use client";

import {
  TypographyH2,
  TypographyP,
  TypographyInlineCode,
} from "@/components/ui/typography";

const TypographyExample = () => (
  <section
    aria-label="World introduction" /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
    style={{ display: "grid", gap: 24 }}
    /* eslint-enable shadcn/no-inline-styles */
  >
    <TypographyH2 maxWidth={200}>A new adventure</TypographyH2>
    <TypographyP maxWidth={200}>
      {"Hello world\nWelcome to your world"}
    </TypographyP>
    <TypographyInlineCode>/gamemode creative</TypographyInlineCode>
  </section>
);

export default TypographyExample;
