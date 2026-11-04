"use client";

import * as React from "react";

import "./minecraft-message.css";
import { MinecraftChatText } from "./minecraft-chat-text";
import {
  isMinecraftEmptyChild,
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
} from "./minecraft-render";

interface MessageScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

const MessageScale = React.createContext<1 | 2 | 3>(2);
const MessageAuthor = React.createContext<string | undefined>(undefined);

type MessageProps = React.ComponentProps<"div"> & {
  align?: "start" | "end";
  scale?: 1 | 2 | 3;
  author?: string;
  kind?: "chat" | "system";
};

const MessageGroup = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="message-group"
    className={cn(`mc-message-group`, className)}
    {...props}
  />
);

const Message = ({
  className,
  align = "start",
  scale: ownScale,
  author,
  kind = "chat",
  style,
  ...props
}: MessageProps) => {
  const inherited = React.useContext(MessageScale);
  const scale = ownScale ?? inherited;

  return (
    <MessageScale value={scale}>
      <MessageAuthor value={author}>
        <div
          data-slot="message"
          data-align={align}
          data-author={author}
          data-kind={kind}
          className={cn(
            "mc-message",
            kind === "system" && "mc-message-system",
            className
          )}
          style={minecraftStyle(style, (__style): MessageScaleStyle => ({
            "--mc-scale": scale,
            ...__style,
          }))}
          {...props}
        />
      </MessageAuthor>
    </MessageScale>
  );
};

const MessageAvatar = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="message-avatar"
    className={cn(`mc-message-avatar`, className)}
    {...props}
  />
);

type MinecraftChatInline =
  | null
  | undefined
  | boolean
  | string
  | number
  | readonly MinecraftChatInline[]
  | React.ReactElement<
      { children?: MinecraftChatInline },
      | typeof React.Fragment
      | "span"
      | "a"
      | "strong"
      | "em"
      | "b"
      | "i"
      | "u"
      | "s"
      | "small"
      | "code"
      | "mark"
      | "abbr"
      | "sub"
      | "sup"
    >;

const isChatInline = function isChatInline(
  value: React.ReactNode
): value is MinecraftChatInline {
  if (isMinecraftEmptyChild(value) || isMinecraftTextContent(value)) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isChatInline);
  }

  return (
    React.isValidElement<{
      children?: React.ReactNode;
    }>(value) &&
    (value.type === React.Fragment ||
      (typeof value.type === "string" &&
        [
          "span",
          "a",
          "strong",
          "em",
          "b",
          "i",
          "u",
          "s",
          "small",
          "code",
          "mark",
          "abbr",
          "sub",
          "sup",
        ].includes(value.type))) &&
    isChatInline(value.props.children)
  );
};

const ChatChildren = ({
  children,
}: React.PropsWithChildren): React.ReactNode => {
  const scale = React.useContext(MessageScale);

  return isChatInline(children) ? (
    <MinecraftChatText scale={scale} className="mc-owned-paint-message-1">
      {children}
    </MinecraftChatText>
  ) : (
    children
  );
};

const MessageContent = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<"div">) => {
  const scale = React.useContext(MessageScale);
  const author = React.useContext(MessageAuthor);
  const node = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState<number>();
  const scalar = isMinecraftTextContent(children);

  React.useImperativeHandle<typeof node.current, typeof node.current>(
    ref,
    () => node.current,
    []
  );
  React.useLayoutEffect(() => {
    const element = node.current!;

    const update = () => {
      setWidth(Math.floor(element.clientWidth / scale) - 12);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [scale]);

  return (
    <div
      ref={node}
      data-slot="message-content"
      data-mc-chat-surface={scalar ? "true" : undefined}
      data-mc-chat-ready={width === undefined ? "false" : "true"}
      className={cn(`mc-message-content`, className)}
      {...props}
    >
      {scalar ? (
        <MinecraftChatText
          scale={scale}
          maxWidth={(width ?? 0) > 0 ? width : undefined}
          className="mc-owned-paint-message-2"
        >
          {author === undefined || author === ""
            ? children
            : `<${author}> ${children}`}
        </MinecraftChatText>
      ) : (
        children
      )}
    </div>
  );
};

const MessageHeader = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="message-header"
    className={cn(`mc-message-header`, className)}
    {...props}
  >
    <ChatChildren>{children}</ChatChildren>
  </div>
);

const MessageFooter = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="message-footer"
    className={cn(`mc-message-footer`, className)}
    {...props}
  >
    <ChatChildren>{children}</ChatChildren>
  </div>
);

export {
  MessageGroup,
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
  MessageFooter,
  MessageScale,
  MessageAuthor,
  ChatChildren,
  isChatInline,
};

export type { MessageProps };
