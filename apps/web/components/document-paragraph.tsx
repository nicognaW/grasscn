"use client";

import type { ComponentProps } from "react";

import { DocumentText } from "./document-text";

export const DocumentParagraph = ({
  children,
  ...props
}: ComponentProps<"p">) => (
  <div className="minecraft-paragraph">
    <p {...props}>
      <DocumentText>{children}</DocumentText>
    </p>
  </div>
);
