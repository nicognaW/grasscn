import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from "react";

import { CodeView } from "./code-view";

function plainCode(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number")
        return String(child);
      if (isValidElement<{ children?: ReactNode }>(child))
        return plainCode(child.props.children);
      return "";
    })
    .join("");
}

export function DocumentCodeBlock({
  children,
  ...props
}: ComponentProps<"pre"> & {
  "data-language"?: string;
  "data-title"?: string;
}) {
  const child = Children.toArray(children).find(isValidElement);
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
    codeProps?.className?.replace(/^language-/, "") ??
    "text";
  return (
    <CodeView
      code={plainCode(children)}
      language={language}
      filename={props["data-title"] ?? `snippet.${language}`}
      label="Code snippet"
    />
  );
}
