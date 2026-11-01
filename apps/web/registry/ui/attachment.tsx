"use client";

import * as React from "react";

import { Button } from "./button";
import { MinecraftItemMedia } from "./minecraft-item-media";
import { MinecraftItemText } from "./minecraft-item-text";
import type { MinecraftItemTextProps } from "./minecraft-item-text";
import {
  minecraftClasses as cn,
  minecraftStyle,
  MinecraftRender,
} from "./minecraft-render";
import type {
  MinecraftProps,
  MinecraftPolymorphicProps,
} from "./minecraft-render";
import { playMinecraftClick } from "./minecraft-sound";

import "./minecraft-item.css";
import "./minecraft-attachment.css";

const AttachmentContext = React.createContext<{
  scale: 1 | 2 | 3;
  disabled: boolean;
}>({ disabled: false, scale: 2 });

const AttachmentClip = React.createContext<number | undefined>(undefined);

type AttachmentProps = MinecraftProps<"div"> & {
  state?: "idle" | "uploading" | "processing" | "error" | "done";
  size?: "default";
  orientation?: "horizontal" | "vertical";
  scale?: 1 | 2 | 3;
  selected?: boolean;
  disabled?: boolean;
};

const Attachment = ({
  state = "done",
  size = "default",
  orientation = "horizontal",
  scale = 2,
  selected = false,
  disabled = false,
  className,
  style,
  ref,
  onClickCapture,
  ...props
}: AttachmentProps) => {
  if (size !== "default") {
    throw Error(
      "Minecraft attachment rows support the original default size only"
    );
  }

  const inactive =
    disabled ||
    props["aria-disabled"] === true ||
    props["aria-disabled"] === "true";

  const node = React.useRef<HTMLDivElement>(null);

  React.useImperativeHandle(ref, () => node.current!, []);
  React.useLayoutEffect(() => {
    const root = node.current!;

    const update = () => {
      root.dataset.mcItemInteractive = String(
        !inactive && !!root.querySelector("[data-slot=attachment-trigger]")
      );
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [inactive]);

  return (
    <AttachmentContext value={{ disabled: inactive, scale }}>
      <div
        ref={node}
        data-slot="attachment"
        data-state={state}
        data-size={size}
        data-orientation={orientation}
        data-selected={selected ? "true" : undefined}
        aria-disabled={inactive || undefined}
        className={cn(`mc-item mc-attachment`, className)}
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
      />
    </AttachmentContext>
  );
};

const AttachmentMedia = ({
  variant = "icon",
  className,
  children,
  ...props
}: MinecraftProps<"div"> & {
  variant?: "icon" | "image";
}) => {
  const { scale } = React.useContext(AttachmentContext);

  return (
    <div
      data-slot="attachment-media"
      data-variant={variant}
      className={cn(`mc-item-media mc-attachment-media`, className)}
      {...props}
    >
      {children ?? <MinecraftItemMedia scale={scale} />}
    </div>
  );
};

const AttachmentContent = ({
  className,
  ref,
  ...props
}: MinecraftProps<"div">) => {
  const { scale } = React.useContext(AttachmentContext);
  const node = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState<number>();

  React.useImperativeHandle(ref, () => node.current!, []);
  React.useLayoutEffect(() => {
    const element = node.current!;

    const measure = () => {
      setWidth(Math.floor(element.clientWidth / scale));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [scale]);

  return (
    <AttachmentClip value={width}>
      <div
        ref={node}
        data-slot="attachment-content"
        data-mc-item-content-ready={width != null}
        className={cn(`mc-item-content mc-attachment-content`, className)}
        {...props}
      />
    </AttachmentClip>
  );
};

type AttachmentTextProps = MinecraftProps<"span"> &
  Pick<MinecraftItemTextProps, "maxWidth" | "align" | "clipWidth" | "render">;

const AttachmentTitle = ({
  className,
  clipWidth,
  ...props
}: AttachmentTextProps) => {
  const { scale } = React.useContext(AttachmentContext);
  const inherited = React.useContext(AttachmentClip);

  return (
    <MinecraftItemText
      as="span"
      data-slot="attachment-title"
      scale={scale}
      clipWidth={clipWidth ?? inherited}
      className={cn(`mc-item-title mc-attachment-title`, className)}
      {...props}
    />
  );
};

const AttachmentDescription = ({
  className,
  clipWidth,
  ...props
}: AttachmentTextProps) => {
  const { scale } = React.useContext(AttachmentContext);
  const inherited = React.useContext(AttachmentClip);

  return (
    <MinecraftItemText
      as="span"
      data-slot="attachment-description"
      scale={scale}
      clipWidth={clipWidth ?? inherited}
      className={cn(`mc-item-description mc-attachment-description`, className)}
      {...props}
    />
  );
};

const AttachmentActions = ({ className, ...props }: MinecraftProps<"div">) => {
  return (
    <div
      data-slot="attachment-actions"
      className={cn(`mc-item-actions mc-attachment-actions`, className)}
      {...props}
    />
  );
};

const AttachmentAction = ({
  className,
  disabled,
  onClickCapture,
  ...props
}: MinecraftProps<typeof Button>) => {
  const context = React.useContext(AttachmentContext);
  const inactive = context.disabled || disabled;

  return (
    <Button
      data-slot="attachment-action"
      type="button"
      scale={context.scale}
      className={cn(`mc-attachment-action`, className)}
      {...props}
      disabled={inactive}
      aria-disabled={inactive ?? props["aria-disabled"]}
      onClickCapture={(event) => {
        if (inactive) {
          event.preventDefault();
          event.stopPropagation();

          return;
        }

        onClickCapture?.(event);
      }}
    />
  );
};

const AttachmentTrigger = ({
  render,
  className,
  disabled,
  onClick,
  onClickCapture,
  type,
  ...props
}: MinecraftPolymorphicProps<"button"> & {}) => {
  const context = React.useContext(AttachmentContext);
  const inactive = context.disabled || disabled;
  const Root = MinecraftRender;

  return (
    <Root
      render={render}
      as="button"
      data-slot="attachment-trigger"
      className={cn(`mc-attachment-trigger`, className)}
      type={render ? undefined : (type ?? "button")}
      disabled={inactive}
      aria-disabled={inactive ?? undefined}
      {...props}
      onClickCapture={(event) => {
        if (inactive) {
          event.preventDefault();
          event.stopPropagation();

          return;
        }

        onClickCapture?.(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        queueMicrotask(() => {
          if (!event.defaultPrevented && !inactive) {
            playMinecraftClick();
          }
        });
      }}
    />
  );
};

const AttachmentGroup = ({ className, ...props }: MinecraftProps<"div">) => {
  return (
    <div
      data-slot="attachment-group"
      className={cn(`mc-attachment-group`, className)}
      {...props}
    />
  );
};

export {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentTrigger,
};

export type { AttachmentProps, AttachmentTextProps };
