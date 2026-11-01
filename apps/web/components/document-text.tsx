"use client";

import { Children, Fragment, cloneElement, isValidElement } from "react";
import type { ReactNode, HTMLAttributes, CSSProperties } from "react";

import { minecraftGlyphs } from "../registry/ui/minecraft-font";
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

const textContent = (children: ReactNode): string =>
  /* eslint-disable react/no-react-children -- The MDX rendering boundary must flatten and preserve arbitrary React children before native glyph rendering. */
  Children.toArray(children)
    /* eslint-enable react/no-react-children */

    .map((child) => {
      if (isTextNode(child)) {
        return String(child);
      }

      return isValidElement<{ children?: ReactNode }>(child)
        ? textContent(child.props.children)
        : "";
    })
    .join("");

/** The game's word-wrap rule: prefer the last space, then split an overlong word at a glyph boundary. */
const paragraphLayout = (text: string, width: number) => {
  const breaks = new Set<number>();
  const spaces = new Set<number>();

  let start = 0;

  while (start < text.length) {
    let end = start;
    let used = 0;
    let lastSpace = -1;

    while (end < text.length && text[end] !== "\n") {
      if (text[end] === " ") {
        lastSpace = end;
      }

      const advance =
        minecraftGlyphs[(text.codePointAt(end) ?? 0) - 32]?.[2] ?? 0;

      if (used + advance > width && end > start) {
        break;
      }

      used += advance;
      end += 1;
    }

    if (end === text.length) {
      break;
    }

    if (text[end] === "\n") {
      start = end + 1;
      continue;
    }

    const split = lastSpace < start ? end : lastSpace;

    if (lastSpace >= start) {
      spaces.add(split);
    }

    start = split + Number(lastSpace >= start);
    breaks.add(start);
  }

  return { breaks, spaces };
};

/** Keep inline MDX semantics, links and token colours; render every text leaf with game glyphs. */

/* eslint-disable react-doctor/only-export-components -- Server documentation metadata and the shared MDX text adapter are intentional exports of this rendering owner. */
export const documentText = (
  children: ReactNode,
  maxWidth?: number
): ReactNode => {
  const content = textContent(children);

  const layout =
    maxWidth !== undefined && maxWidth > 0 && /^[ -~\n]*$/u.test(content)
      ? paragraphLayout(content, maxWidth)
      : undefined;

  let offset = 0;

  const visit = (nodes: ReactNode): ReactNode =>
    /* eslint-disable react/no-react-children -- The MDX rendering boundary must flatten and preserve arbitrary React children before native glyph rendering. */
    Children.map(nodes, (child): ReactNode => {
      if (isTextNode(child)) {
        if (layout) {
          const result: ReactNode[] = [];
          let run = "";

          const flush = () => {
            if (run) {
              result.push(
                <MinecraftText
                  /* eslint-disable react-doctor/no-array-index-as-key -- These positions identify immutable generated document segments; text and source identity own replacement. */
                  key={`text-${offset}`}
                  /* eslint-enable react-doctor/no-array-index-as-key */
                >
                  {run}
                </MinecraftText>
              );
              run = "";
            }
          };

          for (const char of String(child)) {
            if (layout.breaks.has(offset)) {
              flush();
              result.push(
                <br
                  /* eslint-disable react-doctor/no-array-index-as-key -- These positions identify immutable generated document segments; text and source identity own replacement. */
                  key={`break-${offset}`}
                  /* eslint-enable react-doctor/no-array-index-as-key */
                />
              );
            }

            if (layout.spaces.has(offset)) {
              flush();
              result.push(
                <span
                  /* eslint-disable react-doctor/no-array-index-as-key -- These positions identify immutable generated document segments; text and source identity own replacement. */
                  key={`space-${offset}`}
                  /* eslint-enable react-doctor/no-array-index-as-key */

                  /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
                  className="document-wrapped-space"
                  /* eslint-enable shadcn/no-unknown-classes */
                >
                  {char}
                </span>
              );
            } else if (char === "\n") {
              flush();
              result.push(
                <br
                  /* eslint-disable react-doctor/no-array-index-as-key -- These positions identify immutable generated document segments; text and source identity own replacement. */
                  key={`newline-${offset}`}
                  /* eslint-enable react-doctor/no-array-index-as-key */
                />
              );
            } else {
              run += char;
            }

            offset += 1;
          }

          flush();

          return result;
        }

        return String(child)
          .split(/(?<whitespace>\s+)/u)
          .map((word, index) => {
            if (!word) {
              return null;
            }

            if (word.includes("\n")) {
              return (
                <Fragment
                  /* eslint-disable react-doctor/no-array-index-as-key -- These positions identify immutable generated document segments; text and source identity own replacement. */
                  key={index}
                  /* eslint-enable react-doctor/no-array-index-as-key */
                >
                  {word.split("\n").map((line, part) => (
                    <Fragment
                      /* eslint-disable react-doctor/no-array-index-as-key -- These positions identify immutable generated document segments; text and source identity own replacement. */
                      key={part}
                      /* eslint-enable react-doctor/no-array-index-as-key */
                    >
                      {part > 0 ? <br /> : null}
                      {line ? (
                        <MinecraftText>
                          {line.replaceAll("\t", "  ")}
                        </MinecraftText>
                      ) : null}
                    </Fragment>
                  ))}
                </Fragment>
              );
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
          });
      }

      if (
        isValidElement<{ children?: ReactNode; style?: CSSProperties }>(child)
      ) {
        // Already rendered labels are opaque; recursively transforming them would duplicate accessibility text.
        if (
          child.type === MinecraftText ||
          child.type === MinecraftUnicodeLabel
        ) {
          offset += textContent(child.props.children).length;

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
  maxWidth,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { maxWidth?: number }) => (
  <span /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
    className={`document-text ${className ?? ""}`}
    /* eslint-enable shadcn/no-unknown-classes */ {...props}
  >
    {documentText(children, maxWidth)}
  </span>
);
