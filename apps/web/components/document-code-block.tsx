import { Children, isValidElement } from "react";
import type { ComponentProps, ReactNode } from "react";

import { CodeView } from "./code-view";

const isTextNode = (value: ReactNode): value is string | number =>
  typeof value === "string" || typeof value === "number";

const plainCode = (node: ReactNode): string =>
  /* eslint-disable react/no-react-children -- The MDX rendering boundary must flatten and preserve arbitrary React children before native glyph rendering. */
  Children.toArray(node)
    /* eslint-enable react/no-react-children */

    .map((child) => {
      if (isTextNode(child)) {
        return String(child);
      }

      if (isValidElement<{ children?: ReactNode }>(child)) {
        return plainCode(child.props.children);
      }

      return "";
    })
    .join("");

export const DocumentCodeBlock = ({
  children,
  ...props
}: ComponentProps<"pre"> & {
  "data-language"?: string;
  "data-title"?: string;
}) => {
  const child =
    /* eslint-disable react/no-react-children -- The MDX rendering boundary must flatten and preserve arbitrary React children before native glyph rendering. */
    Children.toArray(children)
      /* eslint-enable react/no-react-children */
      .find(isValidElement);

  const codeProps = isValidElement<{
    className?: string;
    "data-language"?: string;
    children?: ReactNode;
  }>(child)
    ? child.props
    : undefined;

  const language =
    props["data-language"] ??
    codeProps?.["data-language"] ??
    codeProps?.className?.replace(/^language-/u, "") ??
    "text";

  return (
    <CodeView
      code={plainCode(children)}
      language={language}
      filename={props["data-title"] ?? `snippet.${language}`}
      label="Code snippet"
    />
  );
};
