import * as React from "react";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

import type { DemoVariables } from "../demo-variables";
import { Button } from "../registry/ui/button";
import { Input } from "../registry/ui/input";
import { Message, MessageContent } from "../registry/ui/message";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
  useMessageScroller,
} from "../registry/ui/message-scroller";
import type { DemoProps } from "../types";

interface ForwardedLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--mc-forwarded-demos-message-1-height": `${number}px`;
  "--mc-forwarded-demos-message-1-width": `${number}px`;
}

interface ForwardedLayoutStyle4 extends IntrinsicLayoutCSSProperties {
  "--mc-forwarded-demos-message-4-width": `${number}px`;
}

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

const History = ({ scale }: DemoProps) => {
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
        className="demo-options"
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
            className="w-(--demo-width) max-w-full"
            style={
              /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
              {
                "--demo-width": `${180 * scale}px`,
              } satisfies DemoVariables as DemoVariables
            }
          />
        </label>
        <Button
          type="submit"
          scale={scale}
          className="w-(--demo-width) max-w-full"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${75 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
        >
          Send
        </Button>
        <Button
          type="button"
          scale={scale}
          className="w-(--demo-width) max-w-full"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${75 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
          onClick={() => api.scrollToStart({ behavior: "instant" })}
        >
          First
        </Button>
      </form>
      <div className="demo-stage" data-stage="message">
        <MessageScroller
          scale={scale}
          className="h-(--mc-forwarded-demos-message-1-height) w-(--mc-forwarded-demos-message-1-width) max-w-full"
          style={
            // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
            {
              "--mc-forwarded-demos-message-1-height": `${94 * scale}px`,
              "--mc-forwarded-demos-message-1-width": `${320 * scale}px`,
            } satisfies ForwardedLayoutStyle1 as ForwardedLayoutStyle1
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
              {messages.map((message, index) => (
                <MessageScrollerItem key={index} messageId={String(index + 1)}>
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
            className="flex min-h-(--demo-min-height) justify-end pt-(--demo-padding-top)"
            style={
              /* SAFETY: satisfies checks --demo-min-height, --demo-padding-top against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
              {
                "--demo-min-height": `${20 * scale}px`,
                "--demo-padding-top": `${2 * scale}px`,
              } satisfies DemoVariables as DemoVariables
            }
          >
            <MessageScrollerButton
              direction="end"
              behavior="instant"
              className="relative top-auto right-auto bottom-auto left-auto w-(--mc-forwarded-demos-message-4-width) max-w-full transform-none"
              style={
                // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
                {
                  "--mc-forwarded-demos-message-4-width": `${100 * scale}px`,
                } satisfies ForwardedLayoutStyle4 as ForwardedLayoutStyle4
              }
            >
              Latest
            </MessageScrollerButton>
          </div>
        </MessageScroller>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Message count">{messages.length} messages</output>
      </div>
    </>
  );
};

const MessageDemo = (props: DemoProps) => (
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
