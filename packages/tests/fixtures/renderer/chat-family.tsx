import {
  BubbleGroup,
  Bubble,
  BubbleContent,
  BubbleReactions,
} from "@grasscn/web/ui/bubble";
import {
  MessageGroup,
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
  MessageFooter,
  MessageScale,
} from "@grasscn/web/ui/message";
import * as React from "react";

import { cn } from "./utils";

interface ChatFamilyReferenceStyle extends React.CSSProperties {
  "--mc-scale": number;
  "--mc-pixel": string;
}

const readChatReferenceGeometry = (
  q: URLSearchParams,
  scale: 1 | 2 | 3,
  native: boolean
) => {
  const width = Number(q.get("width") ?? 172);

  const scaledWidth = width * scale;

  const chatFixtureX = `${Number(q.get("x") ?? 16) * scale}px`;
  const chatFixtureY = `${Number(q.get("y") ?? 16) * scale}px`;
  const chatFixtureWidth = `${scaledWidth}px`;

  const chatFixtureHeight = native
    ? `${Number(q.get("height") ?? 9) * scale}px`
    : undefined;

  return {
    chatFixtureHeight,
    chatFixtureWidth,
    chatFixtureX,
    chatFixtureY,
    scaledWidth,
  };
};

export const ChatFamilyFixture = () => {
  const q = new URLSearchParams(location.search);
  const component = q.get("component") ?? q.get("part") ?? "message";

  // SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
  const scale =
    // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
    Number(q.get("scale") ?? 2) as 1 | 2 | 3;

  const native = q.has("native");
  const label = q.get("label") ?? "Hello Minecraft!";
  const [text, setText] = React.useState(label);
  const [events, setEvents] = React.useState(0);
  const [tag, setTag] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  const {
    chatFixtureWidth,
    chatFixtureX,
    chatFixtureY,
    chatFixtureHeight,
    scaledWidth,
  } = readChatReferenceGeometry(q, scale, native);

  const common: ChatFamilyReferenceStyle = {
    "--fixture-chat-color": q.get("color") ?? undefined,
    "--fixture-height": chatFixtureHeight,
    "--fixture-width": chatFixtureWidth,
    "--fixture-x": chatFixtureX,
    "--fixture-y": chatFixtureY,
    "--mc-pixel": `${scale}px`,
    "--mc-scale": scale,
  };

  const background = q.get("background") ?? "#202020";

  React.useLayoutEffect(() => {
    document.documentElement.style.background = background;
    document.body.style.background = background;
  }, [background]);

  const rich = q.has("rich");
  const content = rich ? <strong data-testid="rich-text">{text}</strong> : text;

  const subject =
    component === "bubble" ? (
      <BubbleGroup
        data-testid="bubble-group"
        className={cn({
          "fixture-chat-foreground fixture-placement-fixed fixture-geometry-x fixture-geometry-y fixture-geometry-width":
            !native,
        })}
        style={native ? undefined : common}
      >
        <Bubble
          align={q.get("align") === "end" ? "end" : "start"}
          data-testid="bubble"
        >
          <BubbleContent
            render={
              q.has("asChild") ? (
                <button
                  type="button"
                  disabled={q.has("disabled")}
                  aria-label="Chat action"
                  onClick={() => {
                    setTag("child");
                  }}
                />
              ) : undefined
            }
            id="subject"
            ref={ref}
            className={cn("fixture-chat-foreground", {
              "fixture-placement-fixed fixture-geometry-x fixture-geometry-y fixture-geometry-height":
                native,
            })}
            style={
              native
                ? {
                    ...common,
                    // oxlint-disable-next-line shadcn/no-inline-styles -- Approved native Bubble fixture input: BubbleContent reads element.style.width to select fixed sizing; a class changes that algorithm input.
                    width: scaledWidth,
                  }
                : { "--fixture-chat-color": common["--fixture-chat-color"] }
            }
            onClick={(event) => {
              setEvents((n) => n + 1);

              if (q.has("cancel")) {
                event.preventDefault();
              }
            }}
            data-subject="true"
          >
            {q.has("asChild") ? <span>{content}</span> : content}
          </BubbleContent>
          {rich ? (
            <BubbleReactions
              side={q.get("side") === "top" ? "top" : "bottom"}
              align={q.get("align") === "end" ? "end" : "start"}
              data-testid="reactions"
            >
              <button
                type="button"
                onClick={() => {
                  setEvents((n) => n + 1);
                }}
              >
                React
              </button>
            </BubbleReactions>
          ) : null}
        </Bubble>
      </BubbleGroup>
    ) : (
      <MessageGroup data-testid="message-group">
        <Message
          scale={scale}
          align={q.get("align") === "end" ? "end" : "start"}
          data-testid="message"
        >
          {rich ? (
            <>
              <MessageAvatar data-testid="avatar">
                <span>Player</span>
              </MessageAvatar>
              <MessageHeader data-testid="header">Player joined</MessageHeader>
            </>
          ) : null}
          <MessageContent
            id="subject"
            ref={ref}
            className={cn(
              "fixture-chat-foreground fixture-placement-fixed fixture-geometry-x fixture-geometry-y fixture-geometry-width",
              { "fixture-geometry-height": native }
            )}
            style={common}
            data-subject="true"
          >
            {content}
          </MessageContent>
          {rich ? (
            <MessageFooter data-testid="footer">Now</MessageFooter>
          ) : null}
        </Message>
      </MessageGroup>
    );

  return (
    <MessageScale value={scale}>
      {subject}
      <div className="fixture-chat-controls">
        <input
          aria-label="Chat text"
          spellCheck={false}
          autoCorrect="off"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
        <button
          type="button"
          id="read-ref"
          onClick={() => {
            setTag(ref.current?.tagName ?? "missing");
          }}
        >
          Read ref
        </button>
        <output id="tag">{tag}</output>
        <output id="events">{events}</output>
      </div>
    </MessageScale>
  );
};
