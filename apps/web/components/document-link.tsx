"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { DocumentText } from "./document-text";

export const DocumentLink = ({
  children,
  className,
  href = "#",
  ...props
}: ComponentProps<"a">) => (
  <Link
    href={href}
    className={["minecraft-prose-link", className].filter(Boolean).join(" ")}
    {...props}
  >
    <DocumentText>{children}</DocumentText>
  </Link>
);
