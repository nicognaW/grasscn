"use client";

import {
  TypographyH2,
  TypographyP,
  TypographyInlineCode,
} from "@/components/ui/typography";

const TypographyExample = () => (
  <section aria-label="World introduction" className="grid gap-6">
    <TypographyH2 maxWidth={200}>A new adventure</TypographyH2>
    <TypographyP maxWidth={200}>
      {"Hello world\nWelcome to your world"}
    </TypographyP>
    <TypographyInlineCode>/gamemode creative</TypographyInlineCode>
  </section>
);

export default TypographyExample;
