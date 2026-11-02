"use client";

import { Children, cloneElement, isValidElement } from "react";
import type { ReactNode, HTMLAttributes, CSSProperties } from "react";

import { MinecraftText } from "../registry/ui/minecraft-text";
import { MinecraftUnicodeLabel } from "../registry/ui/minecraft-unicode-label";

import "./documentation.css";

const isTextNode = (value: ReactNode): value is string | number =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- ReactNode is the rendering boundary; native text and element nodes require distinct handling.
  typeof value === "string" || typeof value === "number";

const hexColor = /^#[\da-f]{6}$/iu;

const nativeShadow = (color: string) =>
  `#${[1, 3, 5]
    .map((offset) =>
      Math.floor(Number.parseInt(color.slice(offset, offset + 2), 16) / 4)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;

/** Keep inline MDX semantics, links and token colours; render every text leaf with game glyphs. */

/* eslint-disable react-doctor/only-export-components -- Server documentation metadata and the shared MDX text adapter are intentional exports of this rendering owner. */
export const documentText = (children: ReactNode): ReactNode => {
  const visit = (nodes: ReactNode): ReactNode =>
    /* eslint-disable react/no-react-children -- The MDX rendering boundary must flatten and preserve arbitrary React children before native glyph rendering. */
    Children.map(nodes, (child): ReactNode => {
      if (isTextNode(child)) {
        return (
          String(child)
            .split(/(?<whitespace>\s+)/u)
            // Preserve literal punctuation and identifier text while allowing native-sized segments to wrap.
            .flatMap((segment) =>
              /^[ -~]*$/u.test(segment)
                ? segment.split(/(?<=[\p{P}\p{S}])/u)
                : [segment]
            )
            .map((word, index) => {
              if (!word) {
                return null;
              }

              if (/^\s+$/u.test(word)) {
                return word;
              }

              return (
                <span /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
                  className="document-word"
                  /* eslint-enable shadcn/no-unknown-classes */
                  /* eslint-disable react-doctor/no-array-index-as-key -- These positions identify immutable generated document segments; text and source identity own replacement. */
                  key={index}
                  /* eslint-enable react-doctor/no-array-index-as-key */
                >
                  {/^[ -~]*$/u.test(word) ? (
                    <MinecraftText>{word}</MinecraftText>
                  ) : (
                    <MinecraftUnicodeLabel text={word} />
                  )}
                </span>
              );
            })
        );
      }

      if (
        isValidElement<{ children?: ReactNode; style?: CSSProperties }>(child)
      ) {
        // Already rendered labels are opaque; recursively transforming them would duplicate accessibility text.
        if (
          child.type === MinecraftText ||
          child.type === MinecraftUnicodeLabel
        ) {
          return child;
        }

        const color = child.props.style?.color;

        const style:
          | (CSSProperties & {
              "--mc-ink"?: string;
              "--mc-shadow"?: string;
            })
          | undefined =
          color !== undefined && hexColor.test(color)
            ? {
                ...child.props.style,
                "--mc-ink": color,
                "--mc-shadow": nativeShadow(color),
              }
            : child.props.style;

        return (
          /* eslint-disable react/no-clone-element -- Preserve authored inline MDX elements and their props while replacing only text leaves and native ink styles. */
          cloneElement(child, { style }, visit(child.props.children))
          /* eslint-enable react/no-clone-element */
        );
      }

      return child;
    });
  /* eslint-enable react/no-react-children */

  return visit(children);
};
/* eslint-enable react-doctor/only-export-components */

export const DocumentText = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) => (
  <span /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
    className={`document-text ${className ?? ""}`}
    /* eslint-enable shadcn/no-unknown-classes */ {...props}
  >
    {documentText(children)}
  </span>
);
