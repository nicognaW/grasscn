"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { DocumentText } from "./document-text";

export function DocumentLink({
  children,
  href = "#",
  ...props
}: ComponentProps<"a">) {
  return (
    <Link href={href} {...props}>
      <DocumentText>{children}</DocumentText>
    </Link>
  );
}
