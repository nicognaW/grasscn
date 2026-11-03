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

export const ChatFamilyFixture = () => {
  const q = new URLSearchParams(location.search);
  const component = q.get("component") ?? q.get("part") ?? "message";
  // SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
  const scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3;
  const native = q.has("native");
  const label = q.get("label") ?? "Hello Minecraft!";
  const [text, setText] = React.useState(label);
  const [events, setEvents] = React.useState(0);
  const [tag, setTag] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  const width = Number(q.get("width") ?? 172);

  const scaledWidth = width * scale;

  const common: ChatFamilyReferenceStyle = {
    "--fixture-x": `${Number(q.get("x") ?? 16) * scale}px`,
    "--fixture-y": `${Number(q.get("y") ?? 16) * scale}px`,
    "--fixture-width": `${scaledWidth}px`,
    ...(native ? { height: Number(q.get("height") ?? 9) * scale } : {}),
    color: q.get("color") ?? "#ffffff",
    "--mc-scale": scale,
    "--mc-pixel": `${scale}px`,
  };

  document.documentElement.style.background = q.get("background") ?? "#202020";
  document.body.style.background = q.get("background") ?? "#202020";

  const rich = q.has("rich");
  const content = rich ? <strong data-testid="rich-text">{text}</strong> : text;

  const subject =
    component === "bubble" ? (
      <BubbleGroup
        data-testid="bubble-group"
        className={cn({
          "fixture-placement-fixed fixture-geometry-x fixture-geometry-y fixture-geometry-width":
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
            className={cn({
              "fixture-placement-fixed fixture-geometry-x fixture-geometry-y":
                native,
            })}
            style={
              native
                ? {
                    ...common,
                    // oxlint-disable-next-line shadcn/no-inline-styles -- Approved native Bubble fixture input: BubbleContent reads element.style.width to select fixed sizing; a class changes that algorithm input.
                    width: scaledWidth,
                  }
                : { color: common.color }
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
            className="fixture-placement-fixed fixture-geometry-x fixture-geometry-y fixture-geometry-width"
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
