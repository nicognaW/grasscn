"use client";

import * as React from "react";

import { MinecraftProse } from "./minecraft-prose";
import type { MinecraftProseProps } from "./minecraft-prose";
import { minecraftClasses as cn } from "./minecraft-render";

import "./minecraft-typography.css";

type TypographyProps = MinecraftProseProps;

const Typography = ({ className, ...props }: TypographyProps) => (
  <MinecraftProse
    data-slot="typography"
    className={cn(`mc-typography`, className)}
    {...props}
  />
);

const textElement = (as: keyof React.JSX.IntrinsicElements, slot: string) =>
  function Text({ className, ...props }: TypographyProps) {
    return (
      <Typography as={as} data-slot={slot} className={className} {...props} />
    );
  };

const TypographyH1 = textElement("h1", "typography-h1");
const TypographyH2 = textElement("h2", "typography-h2");
const TypographyH3 = textElement("h3", "typography-h3");
const TypographyH4 = textElement("h4", "typography-h4");

const TypographyP = textElement("p", "typography-p");
const TypographyBlockquote = textElement("blockquote", "typography-blockquote");
const TypographyInlineCode = textElement("code", "typography-inline-code");

const TypographyLead = textElement("p", "typography-lead");
const TypographyLarge = textElement("div", "typography-large");
const TypographySmall = textElement("small", "typography-small");
const TypographyMuted = textElement("p", "typography-muted");

const TypographyList = ({
  className,
  ...props
}: React.ComponentProps<"ul">) => (
  <ul
    data-slot="typography-list"
    className={cn(`mc-typography-list`, className)}
    {...props}
  />
);

const TypographyTable = ({
  className,
  ...props
}: React.ComponentProps<"table">) => (
  <table
    data-slot="typography-table"
    className={cn(`mc-typography-table`, className)}
    {...props}
  />
);

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
