"use client";

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

import "./minecraft-item.css";
import { MinecraftItemMedia } from "./minecraft-item-media";
import { MinecraftItemText } from "./minecraft-item-text";
import type { MinecraftItemTextProps } from "./minecraft-item-text";
import { MinecraftProse } from "./minecraft-prose";
import {
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
  MinecraftRender,
} from "./minecraft-render";
import type {
  MinecraftProps,
  MinecraftPolymorphicProps,
} from "./minecraft-render";
import { playMinecraftClick } from "./minecraft-sound";
import { Separator } from "./separator";

const ItemScale = React.createContext<1 | 2 | 3>(2);
const ItemClipWidth = React.createContext<number | undefined>(undefined);
const ItemInside = React.createContext(false);

const itemVariants = cva("mc-item", {
  defaultVariants: { size: "default", variant: "default" },
  variants: { size: { default: "" }, variant: { default: "" } },
});

type ItemProps = MinecraftPolymorphicProps<"div"> &
  VariantProps<typeof itemVariants> & {
    scale?: 1 | 2 | 3;
    selected?: boolean;
  };

const Item = ({
  className,
  children,
  render,
  variant = "default",
  size = "default",
  scale: providedScale,
  selected = false,
  style,
  ref,
  onClick,
  onClickCapture,
  onPointerDown,
  ...props
}: ItemProps) => {
  if (variant !== "default" || size !== "default") {
    throw new Error(
      "Minecraft world-list items support the default visual variant and size only"
    );
  }

  const inherited = React.useContext(ItemScale);
  const scale = providedScale ?? inherited;
  const node = React.useRef<HTMLElement>(null);

  React.useImperativeHandle(ref, () => node.current! as HTMLDivElement, []);

  const child = React.isValidElement(render) ? render : null;

  const interactive =
    (render ?? props.role === "button") || props.role === "link";

  const inactive =
    props["aria-disabled"] === true || props["aria-disabled"] === "true";

  // Custom render components retain their own activation audio, avoiding duplicate voices.
  const nativeActivation =
    ((child &&
      typeof child.type === "string" &&
      ["a", "button"].includes(child.type)) ??
      props.role === "button") ||
    props.role === "link";

  const Component = MinecraftRender;

  return (
    <ItemScale value={scale}>
      <ItemInside value={true}>
        <Component
          render={render}
          as="div"
          ref={node as React.Ref<HTMLDivElement>}
          data-slot="item"
          data-variant={variant}
          data-size={size}
          data-selected={selected ? "true" : undefined}
          data-mc-item-interactive={interactive && !inactive ? "true" : "false"}
          className={cn(itemVariants({ size, variant }), className)}
          style={minecraftStyle(
            style,
            (__style) =>
              ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
          )}
          {...props}
          onClickCapture={(event) => {
            if (inactive) {
              event.preventDefault();
              event.stopPropagation();

              return;
            }

            onClickCapture?.(event);
          }}
          onPointerDown={(event) => {
            if (inactive) {
              event.preventDefault();

              return;
            }

            onPointerDown?.(event);
          }}
          onClick={(event) => {
            if (inactive) {
              event.preventDefault();

              return;
            }

            onClick?.(event);

            if (!event.defaultPrevented && nativeActivation) {
              playMinecraftClick();
            }
          }}
        >
          {children}
        </Component>
      </ItemInside>
    </ItemScale>
  );
};

const ItemGroup = ({
  className,
  scale: providedScale,
  style,
  ...props
}: MinecraftProps<"div"> & {
  scale?: 1 | 2 | 3;
}) => {
  const inherited = React.useContext(ItemScale);
  const scale = providedScale ?? inherited;

  return (
    <ItemScale value={scale}>
      <div
        data-slot="item-group"
        role="list"
        className={cn(`mc-item-group`, className)}
        style={minecraftStyle(
          style,
          (__style) =>
            ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
        )}
        {...props}
      />
    </ItemScale>
  );
};

const ItemSeparator = ({
  className,
  scale: providedScale,
  ...props
}: MinecraftProps<typeof Separator>) => {
  const inherited = React.useContext(ItemScale);

  return (
    <Separator
      data-slot="item-separator"
      className={cn(`mc-item-separator`, className)}
      scale={providedScale ?? inherited}
      {...props}
    />
  );
};

const ItemMedia = ({
  className,
  variant = "default",
  children,
  ...props
}: MinecraftProps<"div"> & {
  variant?: "default";
}) => {
  if (variant !== "default") {
    throw new Error(
      "Minecraft item media supports the default thumbnail appearance only"
    );
  }

  const scale = React.useContext(ItemScale);

  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(`mc-item-media`, className)}
      {...props}
    >
      {children ?? <MinecraftItemMedia scale={scale} />}
    </div>
  );
};

const ItemContent = ({
  className,
  children,
  ref,
  ...props
}: MinecraftProps<"div">) => {
  const node = React.useRef<HTMLDivElement>(null);
  const scale = React.useContext(ItemScale);
  const [width, setWidth] = React.useState<number>();

  React.useImperativeHandle(ref, () => node.current!, []);
  React.useLayoutEffect(() => {
    const root = node.current!;

    const measure = () => {
      setWidth(Math.floor(root.clientWidth / scale));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);

    return () => {
      observer.disconnect();
    };
  }, [scale]);

  return (
    <ItemClipWidth value={width}>
      <div
        ref={node}
        data-slot="item-content"
        data-mc-item-content-ready={width != null}
        className={cn(`mc-item-content`, className)}
        {...props}
      >
        {children}
      </div>
    </ItemClipWidth>
  );
};

type ItemTitleProps = MinecraftProps<"div"> &
  Pick<
    MinecraftItemTextProps,
    "scale" | "maxWidth" | "align" | "clipWidth" | "render"
  >;

type ItemDescriptionProps = MinecraftProps<"p"> &
  Pick<
    MinecraftItemTextProps,
    "scale" | "maxWidth" | "align" | "clipWidth" | "render"
  >;

const ItemTitle = ({
  className,
  scale: providedScale,
  clipWidth: providedClip,
  ...props
}: ItemTitleProps) => {
  const scale = React.useContext(ItemScale);
  const clipWidth = React.useContext(ItemClipWidth);
  const inside = React.useContext(ItemInside);

  const common = {
    as: "div" as const,
    className: `mc-item-title ${className ?? ""}`,
    "data-slot": "item-title",
    scale: providedScale ?? scale,
    ...props,
  };

  return inside ||
    providedClip != null ||
    props.style?.color != null ||
    Boolean(className) ||
    (typeof props.children !== "string" &&
      typeof props.children !== "number") ? (
    <MinecraftItemText {...common} clipWidth={providedClip ?? clipWidth} />
  ) : (
    <MinecraftProse {...common} />
  );
};

const ItemDescription = ({
  className,
  scale: providedScale,
  clipWidth: providedClip,
  ...props
}: ItemDescriptionProps) => {
  const scale = React.useContext(ItemScale);
  const clipWidth = React.useContext(ItemClipWidth);

  return (
    <MinecraftItemText
      as="p"
      data-slot="item-description"
      className={cn(`mc-item-description`, className)}
      scale={providedScale ?? scale}
      clipWidth={providedClip ?? clipWidth}
      {...props}
    />
  );
};

const ItemActions = ({ className, ...props }: MinecraftProps<"div">) => {
  return (
    <div
      data-slot="item-actions"
      className={cn(`mc-item-actions`, className)}
      {...props}
    />
  );
};

const ItemHeader = ({
  className,
  children,
  ...props
}: MinecraftProps<"div">) => {
  const scale = React.useContext(ItemScale);

  return (
    <div
      data-slot="item-header"
      className={cn(`mc-item-header`, className)}
      {...props}
    >
      {isMinecraftTextContent(children) ? (
        <MinecraftItemText scale={scale}>{children}</MinecraftItemText>
      ) : (
        children
      )}
    </div>
  );
};

const ItemFooter = ({
  className,
  children,
  ...props
}: MinecraftProps<"div">) => {
  const scale = React.useContext(ItemScale);

  return (
    <div
      data-slot="item-footer"
      className={cn(`mc-item-footer`, className)}
      {...props}
    >
      {isMinecraftTextContent(children) ? (
        <MinecraftItemText scale={scale}>{children}</MinecraftItemText>
      ) : (
        children
      )}
    </div>
  );
};

export {
  Item,
  ItemGroup,
  ItemSeparator,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemHeader,
  ItemFooter,
};

export type { ItemProps, ItemTitleProps, ItemDescriptionProps };
