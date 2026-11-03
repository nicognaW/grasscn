"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Message, MessageContent } from "@/components/ui/message";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
  useMessageScroller,
} from "@/components/ui/message-scroller";

type Line = { author?: string; text: string; system?: boolean };

const history: Line[] = [
  { author: "Steve", text: "The dashboard is ready for review." },
  { author: "Alex", text: "带上你的镐子。" },
  { author: "Steve", text: "I added the revenue breakdown." },
  { author: "Alex", text: "找到钻石了！" },
  { author: "You", text: "I will check the mobile layout." },
  { system: true, text: "Changes saved." },
  { author: "Steve", text: "The sun is setting." },
  { author: "Alex", text: "回家吧。" },
  { author: "You", text: "The bridge is finished." },
  { author: "Steve", text: "Looks great!" },
  { author: "Alex", text: "明天继续。" },
  { system: true, text: "Changes saved." },
];

const History = ({ scale = 2 }: { scale?: 1 | 2 | 3 }) => {
  const [messages, setMessages] = React.useState(history);
  const [text, setText] = React.useState("The updated design looks great.");
  const api = useMessageScroller();

  const send = () => {
    if (!text.trim()) {
      return;
    }

    setMessages((values) => [...values, { author: "You", text }]);
    setText("");
  };

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label>
          Message
          <Input
            aria-label="Message text"
            scale={scale}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
            style={{ maxWidth: "100%", width: 180 * scale }}
          />
        </label>
        <Button
          type="submit"
          scale={scale}
          style={{ width: 75 * scale, maxWidth: "100%" }}
        >
          Send
        </Button>
        <Button
          type="button"
          scale={scale}
          style={{ width: 75 * scale, maxWidth: "100%" }}
          onClick={() => api.scrollToStart({ behavior: "instant" })}
        >
          First
        </Button>
      </form>
      <div data-stage="message">
        <MessageScroller
          scale={scale}
          style={{ height: 94 * scale, maxWidth: "100%", width: 320 * scale }}
        >
          <MessageScrollerViewport
            aria-label="Player chat"
            style={{ flex: 1, height: "auto" }}
          >
            <MessageScrollerContent
              role="log"
              aria-live="polite"
              style={{ justifyContent: "flex-end", overflow: "clip" }}
            >
              {messages.map((message, index) => (
                <MessageScrollerItem key={index} messageId={String(index + 1)}>
                  <Message
                    author={message.author}
                    kind={message.system ? "system" : "chat"}
                  >
                    <MessageContent>{message.text}</MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              minHeight: 20 * scale,
              paddingTop: 2 * scale,
            }}
          >
            <MessageScrollerButton
              direction="end"
              behavior="instant"
              style={{
                bottom: "auto",
                left: "auto",
                maxWidth: "100%",
                position: "relative",
                right: "auto",
                top: "auto",
                transform: "none",
                width: 100 * scale,
              }}
            >
              Latest
            </MessageScrollerButton>
          </div>
        </MessageScroller>
      </div>
      <div>
        <span />
        <output aria-label="Message count">{messages.length} messages</output>
      </div>
    </>
  );
};

const MessageDemo = (props: { scale?: 1 | 2 | 3 }) => (
  <MessageScrollerProvider
    autoScroll
    defaultScrollPosition="end"
    scrollMargin={0}
    scrollPreviousItemPeek={0}
  >
    <History {...props} />
  </MessageScrollerProvider>
);

export { MessageDemo as default };
