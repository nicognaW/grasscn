"use client";

import * as React from "react";

import "./minecraft-code-block.css";
import { Button } from "./button";
import { ChatChildren, MessageScale } from "./message";
import { minecraftLoadingGlyphs } from "./minecraft-loading-glyphs";
import {
  isMinecraftDocumentText,
  isMinecraftSelectableTextElement,
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
} from "./minecraft-render";
import { MinecraftSelectableText } from "./minecraft-selectable-text";

interface CodeBlockScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

const CodeScale = React.createContext<1 | 2 | 3>(2);

type CodeBlockProps = React.ComponentProps<"div"> & {
  variant?: "default" | "destructive";
  size?: "default";
  scale?: 1 | 2 | 3;
};

const CodeBlock = ({
  variant = "default",
  size = "default",
  scale = 2,
  className,
  style,
  ...props
}: CodeBlockProps) => {
  if (size !== "default" || !["default", "destructive"].includes(variant)) {
    throw new Error("Unsupported Minecraft code surface variant");
  }

  return (
    <CodeScale value={scale}>
      <MessageScale value={scale}>
        <div
          data-slot="code-block"
          data-variant={variant}
          data-size={size}
          className={cn(`mc-code-block`, className)}
          style={minecraftStyle(style, (__style): CodeBlockScaleStyle => ({
            "--mc-scale": scale,
            ...__style,
          }))}
          {...props}
        />
      </MessageScale>
    </CodeScale>
  );
};

const CodeBlockHeader = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="code-block-header"
    className={cn(`mc-code-block-header`, className)}
    {...props}
  />
);

const CodeBlockTitle = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="code-block-title"
    className={cn(`mc-code-block-title`, className)}
    {...props}
  >
    <ChatChildren>{children}</ChatChildren>
  </div>
);

const CodeBlockActions = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="code-block-actions"
    className={cn(`mc-code-block-actions`, className)}
    {...props}
  />
);

const CodeBlockCopyButton = ({
  value,
  variant = "default",
  size = "default",
  onClick,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  value: string;
}) => {
  const [copied, setCopied] = React.useState(false);
  const scale = React.useContext(CodeScale);
  const live = React.useRef(true);

  React.useEffect(() => {
    live.current = true;

    return () => {
      live.current = false;
    };
  }, []);
  React.useEffect((): (() => void) | undefined => {
    if (!copied) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [copied]);

  return (
    <>
      <Button
        data-slot="code-block-copy-button"
        data-copied={copied || undefined}
        aria-label={copied ? "Copied" : "Copy"}
        variant={variant}
        size={size}
        scale={scale}
        onClick={(event) => {
          onClick?.(event);

          if (event.defaultPrevented) {
            return;
          }

          const clipboardWrite = Promise.resolve(
            navigator.clipboard?.writeText(value)
          );

          const announceCopy = async () => {
            await clipboardWrite;

            if (live.current) {
              const { clipboard } = navigator;

              if (clipboard !== undefined && clipboard !== null) {
                setCopied(true);
              }
            }
          };

          announceCopy().catch(() => {
            // Copy failure intentionally leaves the copied state and announcement unchanged.
          });
        }}
        {...props}
      >
        {children ?? (copied ? "Copied" : "Copy")}
      </Button>
      <span aria-live="polite" className="mc-code-block-announcement">
        {copied ? "Copied" : ""}
      </span>
    </>
  );
};

const selectable = function selectable(
  value: React.ReactNode
): React.ReactNode {
  if (isMinecraftTextContent(value)) {
    return <MinecraftSelectableText text={String(value)} />;
  }

  if (Array.isArray(value)) {
    // oxlint-disable-next-line react/no-react-children -- This recursive renderer adapts opaque ReactNode children; React owns supplied-key composition and nested sibling scopes. Preserve the public children ABI without fabricating IDs or reimplementing key escaping.
    return React.Children.map(value, selectable);
  }

  if (isMinecraftSelectableTextElement(value)) {
    // oxlint-disable-next-line react/no-clone-element -- Selectable code adapts only the supported intrinsic formatting children, preserving each caller element key/ref/type/props while replacing its children; a wrapper or reconstructed element changes composition.
    return React.cloneElement(
      value,
      undefined,
      selectable(value.props.children)
    );
  }

  return value;
};

const CodeLineMarker = ({ variant }: { variant: "added" | "removed" }) => {
  const glyph = minecraftLoadingGlyphs[variant === "added" ? "+" : "-"];

  return (
    <svg
      aria-hidden="true"
      className="mc-code-block-line-marker"
      viewBox="0 0 8 9"
    >
      <g fill="currentColor">
        {glyph.pixels.map(([x, y], index) => (
          <rect key={index} x={x} y={y} width="1" height="1" />
        ))}
      </g>
    </svg>
  );
};

const CodeBlockLine = ({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<"span"> & {
  variant?: "default" | "added" | "removed" | "highlighted";
}) => {
  const empty =
    children === undefined ||
    children === null ||
    children === "" ||
    (Array.isArray(children) && children.length === 0);

  return (
    <span
      data-slot="code-block-line"
      data-variant={variant}
      className={cn(`mc-code-block-line`, className)}
      {...props}
    >
      <span data-slot="code-block-line-content">
        {empty ? "\n" : selectable(children)}
      </span>
      {variant === "added" || variant === "removed" ? (
        <CodeLineMarker variant={variant} />
      ) : null}
    </span>
  );
};

const CodeBlockContent = ({
  className,
  children,
  style,
  wrap = false,
  lineNumbers = false,
  startLine = 1,
  ...props
}: React.ComponentProps<"pre"> & {
  wrap?: boolean;
  lineNumbers?: boolean;
  startLine?: number;
}) => (
  <pre
    data-slot="code-block-content"
    data-wrap={wrap || undefined}
    data-numbered={lineNumbers || undefined}
    dir="ltr"

    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- This pre is the existing keyboard-scroll entry for overflowing code; removing its tab stop or replacing its native pre structure changes that access contract.
    tabIndex={0}
    style={minecraftStyle(
      style,
      (__style): React.CSSProperties & { "--mc-code-line-reset": string } => ({
        "--mc-code-line-reset": `line ${startLine - 1}`,
        ...__style,
      })
    )}
    className={cn(
      "mc-code-block-content",
      "[counter-reset:var(--mc-code-line-reset)]",
      className
    )}
    {...props}
  >
    <code data-slot="code-block-code">
      {lineNumbers && isMinecraftDocumentText(children)
        ? children
            .replace(/\n$/u, "")
            .split("\n")
            .map((line, index) => (
              <CodeBlockLine
                // oxlint-disable-next-line react-doctor/no-array-index-as-key -- This branch creates document line slots from a string only; repeated and empty lines are valid. Rich React children use the separate keyed-children path.
                key={index}
              >
                {line}
              </CodeBlockLine>
            ))
        : selectable(children)}
    </code>
  </pre>
);

const CodeBlockFooter = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="code-block-footer"
    className={cn(`mc-code-block-footer`, className)}
    {...props}
  >
    <ChatChildren>{children}</ChatChildren>
  </div>
);

export {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
  CodeBlockLine,
  CodeBlockFooter,
};

export type { CodeBlockProps };
