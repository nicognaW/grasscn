"use client";
import * as React from "react";

import { MinecraftProse, type MinecraftProseProps } from "./minecraft-prose";
import { minecraftClasses as cn } from "./minecraft-render";

import "./minecraft-typography.css";
type TypographyProps = MinecraftProseProps;
function Typography({ className, ...props }: TypographyProps) {
  return (
    <MinecraftProse
      data-slot="typography"
      className={cn(`mc-typography ${""}`, className)}
      {...props}
    />
  );
}
const textElement = (as: keyof React.JSX.IntrinsicElements, slot: string) =>
  function Text({ className, ...props }: TypographyProps) {
    return (
      <Typography as={as} data-slot={slot} className={className} {...props} />
    );
  };
const TypographyH1 = textElement("h1", "typography-h1"),
  TypographyH2 = textElement("h2", "typography-h2"),
  TypographyH3 = textElement("h3", "typography-h3"),
  TypographyH4 = textElement("h4", "typography-h4");
const TypographyP = textElement("p", "typography-p"),
  TypographyBlockquote = textElement("blockquote", "typography-blockquote"),
  TypographyInlineCode = textElement("code", "typography-inline-code");
const TypographyLead = textElement("p", "typography-lead"),
  TypographyLarge = textElement("div", "typography-large"),
  TypographySmall = textElement("small", "typography-small"),
  TypographyMuted = textElement("p", "typography-muted");
function TypographyList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="typography-list"
      className={cn(`mc-typography-list ${""}`, className)}
      {...props}
    />
  );
}
function TypographyTable({
  className,
  ...props
}: React.ComponentProps<"table">) {
  return (
    <table
      data-slot="typography-table"
      className={cn(`mc-typography-table ${""}`, className)}
      {...props}
    />
  );
}
export {
  Typography,
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyP,
  TypographyBlockquote,
  TypographyInlineCode,
  TypographyLead,
  TypographyLarge,
  TypographySmall,
  TypographyMuted,
  TypographyList,
  TypographyTable,
};
export type { TypographyProps };
