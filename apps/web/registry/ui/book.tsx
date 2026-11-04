"use client";

import * as React from "react";

import { AdventureImage } from "./minecraft-adventure-image";
import { playBookPageTurn } from "./minecraft-book-sound";
import { MinecraftDocumentText } from "./minecraft-document-text";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";

import "./minecraft-book.css";

interface BookLayoutStyle1 extends React.CSSProperties {
  "--mc-dynamic-book-1-left": number;
  "--mc-dynamic-book-1-top": number;
}

interface BookLayoutStyle2 extends React.CSSProperties {
  "--mc-dynamic-book-2-height": number;
  "--mc-dynamic-book-2-left": number;
  "--mc-dynamic-book-2-top": number;
  "--mc-dynamic-book-2-width": number;
}

interface BookLayoutStyle3 extends React.CSSProperties {
  "--mc-dynamic-book-3-height": number;
  "--mc-dynamic-book-3-left": number;
  "--mc-dynamic-book-3-top": number;
  "--mc-dynamic-book-3-width": number;
}

interface BookScaleStyle extends React.CSSProperties {
  "--mc-book-height": string;
  "--mc-book-width": string;
  "--mc-scale": number;
}

type BookProps = React.ComponentProps<"div"> & {
  pages: readonly string[];
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  scale?: 1 | 2 | 3;
  turnSound?: boolean;
};

const Book = ({
  pages,
  page,
  defaultPage = 0,
  onPageChange,
  scale = 2,
  turnSound = true,
  className,
  style,
  onKeyDown,
  ...props
}: BookProps) => {
  const [current, setCurrent] = React.useState(defaultPage);
  const [hover, setHover] = React.useState<"forward" | "backward" | null>(null);

  const index = Math.max(
    0,
    Math.min(Math.max(0, pages.length - 1), page ?? current)
  );

  const change = (next: number, sound = false) => {
    if (next < 0 || next >= pages.length || next === index) {
      return;
    }

    if (page === undefined) {
      setCurrent(next);
    }

    onPageChange?.(next);

    if (sound && turnSound) {
      playBookPageTurn();
    }
  };

  return (
    <div
      {...props}
      data-slot="book"
      className={cn(`mc-book`, className)}
      tabIndex={props.tabIndex ?? 0}
      role={props.role ?? "group"}
      aria-label={props["aria-label"] ?? "Book"}
      style={minecraftStyle(style, (__style): BookScaleStyle => ({
        "--mc-book-height": `${192 * scale}px`,
        "--mc-book-width": `${192 * scale}px`,
        "--mc-scale": scale,
        ...__style,
      }))}
      onKeyDown={(event) => {
        onKeyDown?.(event);

        if (event.defaultPrevented) {
          return;
        }

        if (event.key === "ArrowRight" || event.key === "PageDown") {
          event.preventDefault();
          change(index + 1);
        }

        if (event.key === "ArrowLeft" || event.key === "PageUp") {
          event.preventDefault();
          change(index - 1);
        }
      }}
    >
      <AdventureImage
        texture="gui/book"
        scale={scale}
        className="mc-layout-book-1"
      />
      <MinecraftDocumentText
        text={`Page ${index + 1} of ${Math.max(1, pages.length)}`}
        width={114}
        scale={scale}
        align="right"
        className="mc-layout-book-2 mc-dynamic-layout-book-1"
        style={
          /* SAFETY: The owned mc-dynamic-layout-book-1 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
          {
            "--mc-dynamic-book-1-left": 34 * scale,
            "--mc-dynamic-book-1-top": 16 * scale,
          } satisfies BookLayoutStyle1 as BookLayoutStyle1
        }
      />
      <div
        className="mc-book-page mc-dynamic-layout-book-2"
        role="document"
        aria-label={`Page ${index + 1}`}
        style={
          /* SAFETY: The owned mc-dynamic-layout-book-2 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
          {
            "--mc-dynamic-book-2-height": 128 * scale,
            "--mc-dynamic-book-2-left": 36 * scale,
            "--mc-dynamic-book-2-top": 30 * scale,
            "--mc-dynamic-book-2-width": 114 * scale,
          } satisfies BookLayoutStyle2 as BookLayoutStyle2
        }
      >
        <MinecraftDocumentText
          text={pages[index] ?? ""}
          width={114}
          scale={scale}
        />
      </div>
      {(["backward", "forward"] as const).map((direction) => {
        const visible =
          direction === "backward" ? index > 0 : index < pages.length - 1;

        return (
          visible && (
            <button
              type="button"
              key={direction}
              className="mc-book-arrow mc-dynamic-layout-book-3"
              aria-label={
                direction === "forward" ? "Next page" : "Previous page"
              }
              onMouseEnter={() => {
                setHover(direction);
              }}
              onMouseLeave={() => {
                setHover(null);
              }}
              onFocus={() => {
                setHover(direction);
              }}
              onBlur={() => {
                setHover(null);
              }}
              onClick={(event) => {
                if (!event.defaultPrevented) {
                  change(index + (direction === "forward" ? 1 : -1), true);
                }
              }}
              style={
                /* SAFETY: The owned mc-dynamic-layout-book-3 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                {
                  "--mc-dynamic-book-3-height": 13 * scale,
                  "--mc-dynamic-book-3-left":
                    (direction === "forward" ? 116 : 43) * scale,
                  "--mc-dynamic-book-3-top": 157 * scale,
                  "--mc-dynamic-book-3-width": 23 * scale,
                } satisfies BookLayoutStyle3 as BookLayoutStyle3
              }
            >
              <AdventureImage
                texture={`gui/sprites/widget/page_${direction}${hover === direction ? "_highlighted" : ""}`}
                scale={scale}
              />
            </button>
          )
        );
      })}
    </div>
  );
};

export { Book };

export type { BookProps };
