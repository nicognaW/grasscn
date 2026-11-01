"use client";

import type { ComponentProps, HTMLAttributes } from "react";

import { documentText, DocumentText } from "./document-text";

type HeadingProps = ComponentProps<"h2">;
type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

function Heading({
  as: Tag,
  children,
  className,
  ...props
}: HeadingProps & { as: HeadingTag }) {
  return (
    <Tag
      data-slot={`typography-${Tag}`}
      className={`document-heading ${className ?? ""}`}
      {...props}
    >
      <DocumentText>{children}</DocumentText>
    </Tag>
  );
}

export function DocumentH1(props: HeadingProps) {
  return <Heading as="h1" {...props} />;
}
export function DocumentH2(props: HeadingProps) {
  return <Heading as="h2" {...props} />;
}
export function DocumentH3(props: HeadingProps) {
  return <Heading as="h3" {...props} />;
}
export function DocumentH4(props: HeadingProps) {
  return <Heading as="h4" {...props} />;
}
export function DocumentH5(props: HeadingProps) {
  return <Heading as="h5" {...props} />;
}
export function DocumentH6(props: HeadingProps) {
  return <Heading as="h6" {...props} />;
}

export function DocumentListItem({
  children,
  className,
  ...props
}: ComponentProps<"li">) {
  return (
    <li className={`document-text ${className ?? ""}`} {...props}>
      {documentText(children)}
    </li>
  );
}
export function DocumentTableHeader({
  children,
  className,
  ...props
}: ComponentProps<"th">) {
  return (
    <th className={`document-text ${className ?? ""}`} {...props}>
      {documentText(children)}
    </th>
  );
}
export function DocumentTableCell({
  children,
  className,
  ...props
}: ComponentProps<"td">) {
  return (
    <td className={`document-text ${className ?? ""}`} {...props}>
      {documentText(children)}
    </td>
  );
}
export function DocumentInlineCode({
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <code {...props}>
      <DocumentText>{children}</DocumentText>
    </code>
  );
}
