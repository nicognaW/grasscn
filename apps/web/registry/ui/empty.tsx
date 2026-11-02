"use client";

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import { MinecraftProse } from "./minecraft-prose";
import type { MinecraftProseProps } from "./minecraft-prose";
import {
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
} from "./minecraft-render";

import "./minecraft-empty.css";

interface EmptyScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

const EmptyScale = React.createContext<1 | 2 | 3>(2);

type EmptyProps = React.ComponentProps<"div"> & {
  scale?: 1 | 2 | 3;
};

const Empty = ({
  children,
  className,
  scale = 2,
  style,
  ref,
  ...props
}: EmptyProps) => {
  const node = React.useRef<HTMLDivElement>(null);
  const textNode = React.useRef<HTMLElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  React.useImperativeHandle(ref, () => node.current!, []);
  const plain = isMinecraftTextContent(children);
  React.useLayoutEffect(() => {
    if (!plain || !node.current || !textNode.current) {
      return;
    }

    const root = node.current;
    const text = textNode.current;

    const measure = () => {
      const width = Math.floor(root.clientWidth / scale);
      const height = Math.floor(root.clientHeight / scale);
      const textWidth = Math.round(text.getBoundingClientRect().width / scale);

      setPosition({
        x: (Math.floor(width / 2) - Math.floor(textWidth / 2)) * scale,
        y: (Math.floor(height / 2) - 4) * scale,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(text);

    return () => {
      observer.disconnect();
    };
  }, [plain, children, scale]);

  return (
    <EmptyScale value={scale}>
      <div
        ref={node}
        data-slot="empty"
        data-mc-empty-native={plain ? "true" : undefined}
        className={cn(`mc-empty`, className)}
        style={minecraftStyle(style, (__style): EmptyScaleStyle => ({
          "--mc-scale": scale,
          ...__style,
        }))}
        {...props}
      >
        {plain ? (
          <MinecraftProse
            ref={textNode}
            scale={scale}
            as="div"
            className="mc-empty-native-text"
            style={{ left: position.x, top: position.y }}
          >
            {children}
          </MinecraftProse>
        ) : (
          children
        )}
      </div>
    </EmptyScale>
  );
};

const EmptyHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="empty-header"
    className={cn(`mc-empty-header`, className)}
    {...props}
  />
);

const emptyMediaVariants = cva("mc-empty-media", {
  defaultVariants: { variant: "default" },
  variants: { variant: { default: "" } },
});

const EmptyMedia = ({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) => {
  if (variant !== "default") {
    throw new Error(
      "Minecraft empty-list media supports the default appearance only"
    );
  }

  return (
    <div
      data-slot="empty-media"
      className={cn(emptyMediaVariants({ variant }), className)}
      {...props}
    />
  );
};

const EmptyTitle = ({ scale, className, ...props }: MinecraftProseProps) => {
  const inherited = React.useContext(EmptyScale);

  return (
    <MinecraftProse
      as="div"
      data-slot="empty-title"
      scale={scale ?? inherited}
      className={cn(`mc-empty-title`, className)}
      {...props}
    />
  );
};

const EmptyDescription = ({
  scale,
  className,
  ...props
}: MinecraftProseProps) => {
  const inherited = React.useContext(EmptyScale);

  return (
    <MinecraftProse
      as="p"
      data-slot="empty-description"
      scale={scale ?? inherited}
      className={cn(`mc-empty-description`, className)}
      {...props}
    />
  );
};

const EmptyContent = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="empty-content"
    className={cn(`mc-empty-content`, className)}
    {...props}
  />
);

export {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
};

export type { EmptyProps };
