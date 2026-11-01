"use client";

import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type ReactNode,
  type HTMLAttributes,
  type CSSProperties,
} from "react";

import { minecraftGlyphs } from "../registry/ui/minecraft-font";
import { MinecraftText } from "../registry/ui/minecraft-text";
import { MinecraftUnicodeLabel } from "../registry/ui/minecraft-unicode-label";

import "./documentation.css";

const hexColor = /^#[\da-f]{6}$/i;
function nativeShadow(color: string) {
  return `#${[1, 3, 5].map((offset) => (Number.parseInt(color.slice(offset, offset + 2), 16) >> 2).toString(16).padStart(2, "0")).join("")}`;
}

function textContent(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number")
        return String(child);
      return isValidElement<{ children?: ReactNode }>(child)
        ? textContent(child.props.children)
        : "";
    })
    .join("");
}

/** The game's word-wrap rule: prefer the last space, then split an overlong word at a glyph boundary. */
function paragraphLayout(text: string, width: number) {
  const breaks = new Set<number>(),
    spaces = new Set<number>();
  let start = 0;
  while (start < text.length) {
    let end = start,
      used = 0,
      lastSpace = -1;
    while (end < text.length && text[end] !== "\n") {
      if (text[end] === " ") lastSpace = end;
      const advance = minecraftGlyphs[text.charCodeAt(end) - 32]?.[2] ?? 0;
      if (used + advance > width && end > start) break;
      used += advance;
      end++;
    }
    if (end === text.length) break;
    if (text[end] === "\n") {
      start = end + 1;
      continue;
    }
    const split = lastSpace < start ? end : lastSpace;
    if (lastSpace >= start) spaces.add(split);
    start = split + Number(lastSpace >= start);
    breaks.add(start);
  }
  return { breaks, spaces };
}

/** Keep inline MDX semantics, links and token colours; render every text leaf with game glyphs. */
export function documentText(
  children: ReactNode,
  maxWidth?: number
): ReactNode {
  const content = textContent(children);
  const layout =
    maxWidth != null && maxWidth > 0 && /^[\x20-\x7e\n]*$/.test(content)
      ? paragraphLayout(content, maxWidth)
      : undefined;
  let offset = 0;
  const visit = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (child): ReactNode => {
      if (typeof child === "string" || typeof child === "number") {
        if (layout) {
          const result: ReactNode[] = [];
          let run = "";
          const flush = () => {
            if (run) {
              result.push(
                <MinecraftText key={`text-${offset}`}>{run}</MinecraftText>
              );
              run = "";
            }
          };
          for (const char of String(child)) {
            if (layout.breaks.has(offset)) {
              flush();
              result.push(<br key={`break-${offset}`} />);
            }
            if (layout.spaces.has(offset)) {
              flush();
              result.push(
                <span
                  key={`space-${offset}`}
                  className="document-wrapped-space"
                >
                  {char}
                </span>
              );
            } else if (char === "\n") {
              flush();
              result.push(<br key={`newline-${offset}`} />);
            } else run += char;
            offset++;
          }
          flush();
          return result;
        }
        return String(child)
          .split(/(\s+)/)
          .map((word, index) => {
            if (!word) return null;
            if (word.includes("\n"))
              return (
                <Fragment key={index}>
                  {word.split("\n").map((line, part) => (
                    <Fragment key={part}>
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
            return (
              <span className="document-word" key={index}>
                {/^[\x20-\x7e]*$/.test(word) ? (
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
        const style =
          typeof color === "string" && hexColor.test(color)
            ? ({
                ...child.props.style,
                "--mc-ink": color,
                "--mc-shadow": nativeShadow(color),
              } as CSSProperties)
            : child.props.style;
        return cloneElement(child, { style }, visit(child.props.children));
      }
      return child;
    });
  return visit(children);
}

export function DocumentText({
  children,
  className,
  maxWidth,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { maxWidth?: number }) {
  return (
    <span className={`document-text ${className ?? ""}`} {...props}>
      {documentText(children, maxWidth)}
    </span>
  );
}
