"use client";

import type { ComponentProps, HTMLAttributes } from "react";

import { documentText, DocumentText } from "./document-text";

type HeadingProps = ComponentProps<"h2">;

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

const Heading = ({
  as: Tag,
  children,
  className,
  ...props
}: HeadingProps & { as: HeadingTag }) => (
  <Tag
    data-slot={`typography-${Tag}`}
    className={`document-heading ${className ?? ""}`}
    {...props}
  >
    <DocumentText>{children}</DocumentText>
  </Tag>
);

export const DocumentH1 = (props: HeadingProps) => (
  <Heading as="h1" {...props} />
);

export const DocumentH2 = (props: HeadingProps) => (
  <Heading as="h2" {...props} />
);

export const DocumentH3 = (props: HeadingProps) => (
  <Heading as="h3" {...props} />
);

export const DocumentH4 = (props: HeadingProps) => (
  <Heading as="h4" {...props} />
);

export const DocumentH5 = (props: HeadingProps) => (
  <Heading as="h5" {...props} />
);

export const DocumentH6 = (props: HeadingProps) => (
  <Heading as="h6" {...props} />
);

export const DocumentListItem = ({
  children,
  className,
  ...props
}: ComponentProps<"li">) => (
  <li /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
    className={`document-text ${className ?? ""}`}
    /* eslint-enable shadcn/no-unknown-classes */ {...props}
  >
    {documentText(children)}
  </li>
);

export const DocumentTableHeader = ({
  children,
  className,
  ...props
}: ComponentProps<"th">) => (
  <th /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
    className={`document-text ${className ?? ""}`}
    /* eslint-enable shadcn/no-unknown-classes */ {...props}
  >
    {documentText(children)}
  </th>
);

export const DocumentTableCell = ({
  children,
  className,
  ...props
}: ComponentProps<"td">) => (
  <td /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
    className={`document-text ${className ?? ""}`}
    /* eslint-enable shadcn/no-unknown-classes */ {...props}
  >
    {documentText(children)}
  </td>
);

export const DocumentInlineCode = ({
  children,
  ...props
}: HTMLAttributes<HTMLElement>) => (
  <code {...props}>
    <DocumentText>{children}</DocumentText>
  </code>
);
