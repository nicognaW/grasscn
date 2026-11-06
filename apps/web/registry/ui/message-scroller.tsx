"use client";

import { MessageScroller as Primitive } from "@shadcn/react/message-scroller";

import "./minecraft-message-scroller.css";
import * as React from "react";

import { Button } from "./button";
import { MessageContent, MessageScale } from "./message";
import {
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
} from "./minecraft-render";
import { minecraftTextareaAssets } from "./minecraft-textarea-assets";

export {
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from "@shadcn/react/message-scroller";

interface MessageScrollerPaintStyle extends React.CSSProperties {
  "--mc-scale": number;
  "--mc-thumb": string;
  "--mc-track": string;
}

const ScrollerScale = React.createContext<1 | 2 | 3>(2);

const MessageScrollerProvider = (
  props: React.ComponentProps<typeof Primitive.Provider>
) => <Primitive.Provider {...props} />;

const MessageScroller = ({
  className,
  scale = 2,
  style,
  ...props
}: React.ComponentProps<typeof Primitive.Root> & {
  scale?: 1 | 2 | 3;
}) => (
  <ScrollerScale value={scale}>
    <MessageScale value={scale}>
      <Primitive.Root
        data-slot="message-scroller"
        className={cn(`mc-message-scroller`, className)}
        style={minecraftStyle(style, (__style): MessageScrollerPaintStyle => ({
          "--mc-scale": scale,
          "--mc-thumb": `url("${minecraftTextareaAssets.scroller}")`,
          "--mc-track": `url("${minecraftTextareaAssets.scroller_background}")`,
          ...__style,
        }))}
        {...props}
      />
    </MessageScale>
  </ScrollerScale>
);

const MessageScrollerViewport = ({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Viewport>) => (
  <Primitive.Viewport
    data-slot="message-scroller-viewport"
    className={cn(`mc-message-scroller-viewport`, className)}
    {...props}
  />
);

const MessageScrollerContent = ({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) => (
  <Primitive.Content
    data-slot="message-scroller-content"
    className={cn(`mc-message-scroller-content`, className)}
    {...props}
  />
);

const MessageScrollerItem = ({
  className,
  scrollAnchor = false,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Item>) => (
  <Primitive.Item
    data-slot="message-scroller-item"
    scrollAnchor={scrollAnchor}
    className={cn(`mc-message-scroller-item`, className)}
    {...props}
  >
    {isMinecraftTextContent(children) ? (
      <MessageContent>{children}</MessageContent>
    ) : (
      children
    )}
  </Primitive.Item>
);

const MessageScrollerButton = ({
  direction = "end",
  className,
  children,
  render,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof Primitive.Button> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) => {
  const scale = React.useContext(ScrollerScale);

  return (
    <Primitive.Button
      data-slot="message-scroller-button"
      data-direction={direction}
      data-variant={variant}
      data-size={size}
      direction={direction}
      className={cn(`mc-message-scroller-button`, className)}
      render={render ?? <Button variant={variant} size={size} scale={scale} />}
      {...props}
    >
      {children ?? (direction === "end" ? "Scroll to end" : "Scroll to start")}
    </Primitive.Button>
  );
};

export {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
};
