"use client";

import {
  TypographyH2,
  TypographyP,
  TypographyInlineCode,
} from "@/components/ui/typography";

export default function TypographyExample() {
  return (
    <section
      aria-label="World introduction"
      style={{ display: "grid", gap: 24 }}
    >
      <TypographyH2 maxWidth={200}>A new adventure</TypographyH2>
      <TypographyP maxWidth={200}>
        {"Hello world\nWelcome to your world"}
      </TypographyP>
      <TypographyInlineCode>/gamemode creative</TypographyInlineCode>
    </section>
  );
}
