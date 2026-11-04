"use client";

import * as React from "react";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

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

interface ForwardedLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--mc-forwarded-examples-overlays-message-scroller-example-1-width": `${number}px`;
}

interface ForwardedLayoutStyle2 extends IntrinsicLayoutCSSProperties {
  "--mc-forwarded-examples-overlays-message-scroller-example-2-width": `${number}px`;
}

interface ForwardedLayoutStyle3 extends IntrinsicLayoutCSSProperties {
  "--mc-forwarded-examples-overlays-message-scroller-example-3-width": `${number}px`;
}

interface ForwardedLayoutStyle4 extends IntrinsicLayoutCSSProperties {
  "--mc-forwarded-examples-overlays-message-scroller-example-4-height": `${number}px`;
  "--mc-forwarded-examples-overlays-message-scroller-example-4-width": `${number}px`;
}

interface ForwardedLayoutStyle7 extends IntrinsicLayoutCSSProperties {
  "--mc-forwarded-examples-overlays-message-scroller-example-7-width": `${number}px`;
}

interface IntrinsicLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--mc-intrinsic-examples-overlays-message-scroller-example-1-min-height": `${number}px`;
  "--mc-intrinsic-examples-overlays-message-scroller-example-1-padding-top": `${number}px`;
}

interface Line {
  author?: string;
  messageId: string;
  text: string;
  system?: boolean;
}

const history: Line[] = [
  {
    author: "Steve",
    messageId: "1",
    text: "The dashboard is ready for review.",
  },
  { author: "Alex", messageId: "2", text: "带上你的镐子。" },
  { author: "Steve", messageId: "3", text: "I added the revenue breakdown." },
  { author: "Alex", messageId: "4", text: "找到钻石了！" },
  { author: "You", messageId: "5", text: "I will check the mobile layout." },
  { messageId: "6", system: true, text: "Changes saved." },
  { author: "Steve", messageId: "7", text: "The sun is setting." },
  { author: "Alex", messageId: "8", text: "回家吧。" },
  { author: "You", messageId: "9", text: "The bridge is finished." },
  { author: "Steve", messageId: "10", text: "Looks great!" },
  { author: "Alex", messageId: "11", text: "明天继续。" },
  { messageId: "12", system: true, text: "Changes saved." },
];

const History = ({ scale = 2 }: { scale?: 1 | 2 | 3 }) => {
  const [messages, setMessages] = React.useState(history);
  const [text, setText] = React.useState("The updated design looks great.");
  const api = useMessageScroller();

  const send = () => {
    if (!text.trim()) {
      return;
    }

    setMessages((values) => [
      ...values,
      { author: "You", messageId: String(values.length + 1), text },
    ]);
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
            className="w-(--mc-forwarded-examples-overlays-message-scroller-example-1-width) max-w-full"
            style={
              // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
              {
                "--mc-forwarded-examples-overlays-message-scroller-example-1-width": `${180 * scale}px`,
              } satisfies ForwardedLayoutStyle1 as ForwardedLayoutStyle1
            }
          />
        </label>
        <Button
          type="submit"
          scale={scale}
          className="w-(--mc-forwarded-examples-overlays-message-scroller-example-2-width) max-w-full"
          style={
            // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
            {
              "--mc-forwarded-examples-overlays-message-scroller-example-2-width": `${75 * scale}px`,
            } satisfies ForwardedLayoutStyle2 as ForwardedLayoutStyle2
          }
        >
          Send
        </Button>
        <Button
          type="button"
          scale={scale}
          className="w-(--mc-forwarded-examples-overlays-message-scroller-example-3-width) max-w-full"
          style={
            // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
            {
              "--mc-forwarded-examples-overlays-message-scroller-example-3-width": `${75 * scale}px`,
            } satisfies ForwardedLayoutStyle3 as ForwardedLayoutStyle3
          }
          onClick={() => api.scrollToStart({ behavior: "instant" })}
        >
          First
        </Button>
      </form>
      <div data-stage="message">
        <MessageScroller
          scale={scale}
          className="h-(--mc-forwarded-examples-overlays-message-scroller-example-4-height) w-(--mc-forwarded-examples-overlays-message-scroller-example-4-width) max-w-full"
          style={
            // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
            {
              "--mc-forwarded-examples-overlays-message-scroller-example-4-height": `${94 * scale}px`,
              "--mc-forwarded-examples-overlays-message-scroller-example-4-width": `${320 * scale}px`,
            } satisfies ForwardedLayoutStyle4 as ForwardedLayoutStyle4
          }
        >
          <MessageScrollerViewport
            aria-label="Player chat"
            className="h-auto flex-1"
          >
            <MessageScrollerContent
              role="log"
              aria-live="polite"
              className="justify-end overflow-clip"
            >
              {messages.map((message) => (
                <MessageScrollerItem
                  key={message.messageId}
                  messageId={message.messageId}
                >
                  <Message
                    author={message.author}
                    kind={message.system === true ? "system" : "chat"}
                  >
                    <MessageContent>{message.text}</MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <div
            className="flex min-h-(--mc-intrinsic-examples-overlays-message-scroller-example-1-min-height) justify-end pt-(--mc-intrinsic-examples-overlays-message-scroller-example-1-padding-top)"
            style={
              // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
              {
                "--mc-intrinsic-examples-overlays-message-scroller-example-1-min-height": `${20 * scale}px`,
                "--mc-intrinsic-examples-overlays-message-scroller-example-1-padding-top": `${2 * scale}px`,
              } satisfies IntrinsicLayoutStyle1 as IntrinsicLayoutStyle1
            }
          >
            <MessageScrollerButton
              direction="end"
              behavior="instant"
              className="relative top-auto right-auto bottom-auto left-auto w-(--mc-forwarded-examples-overlays-message-scroller-example-7-width) max-w-full transform-none"
              style={
                // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
                {
                  "--mc-forwarded-examples-overlays-message-scroller-example-7-width": `${100 * scale}px`,
                } satisfies ForwardedLayoutStyle7 as ForwardedLayoutStyle7
              }
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
