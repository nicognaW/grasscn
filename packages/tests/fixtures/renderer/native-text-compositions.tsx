import { CodeBlock, CodeBlockContent } from "@grasscn/web/ui/code-block";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
} from "@grasscn/web/ui/message-scroller";
import { Spinner } from "@grasscn/web/ui/spinner";
import { Trace, TraceLine, TraceTitle } from "@grasscn/web/ui/trace";
import * as React from "react";

import "./native-reference.css";

export function NativeTextCompositionsFixture() {
  const q = new URLSearchParams(location.search),
    component = q.get("component") ?? q.get("part") ?? "code-block",
    scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3,
    label = q.get("label") ?? "Hello Minecraft!",
    width = Number(q.get("width") ?? 172),
    height = Number(q.get("height") ?? 9),
    style = {
      "--reference-x": Number(q.get("x") ?? 16) * scale + "px",
      "--reference-y": Number(q.get("y") ?? 16) * scale + "px",
      "--reference-width": width * scale + "px",
      "--reference-height": height * scale + "px",
      "--reference-color": q.get("color") ?? undefined,
      "--mc-scale": scale,
      "--mc-pixel": scale + "px",
    } as React.CSSProperties;
  React.useLayoutEffect(() => {
    document.documentElement.style.background =
      q.get("background") ?? "#202020";
    document.body.style.background = q.get("background") ?? "#202020";
  }, []);
  if (component === "spinner")
    return (
      <Spinner
        className="native-reference-geometry native-reference-size native-reference-color"
        id="subject"
        scale={scale}
        logicalWidth={width}
        timeMs={Number(q.get("timeMs") ?? 0)}
        style={style}
        data-subject="true"
      />
    );
  if (component === "trace")
    return (
      <Trace scale={scale}>
        <TraceLine
          id="subject"
          className="native-reference-geometry native-reference-size native-reference-color native-reference-text native-reference-block"
          style={style}
          data-subject="true"
        >
          <TraceTitle className="native-reference-title">{label}</TraceTitle>
        </TraceLine>
      </Trace>
    );
  if (component === "message-scroller")
    return (
      <MessageScrollerProvider autoScroll={false} defaultScrollPosition="start">
        <MessageScroller scale={scale} className="native-reference-scroller">
          <MessageScrollerViewport>
            <MessageScrollerContent>
              <MessageScrollerItem
                className="native-reference-geometry native-reference-size native-reference-color"
                id="subject"
                style={style}
                data-subject="true"
              >
                {label}
              </MessageScrollerItem>
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
      </MessageScrollerProvider>
    );
  return (
    <CodeBlock scale={scale} className="native-reference-code">
      <CodeBlockContent
        id="subject"
        className="native-reference-geometry native-reference-size native-reference-color native-reference-text"
        style={style}
        data-subject="true"
      >
        {label}
      </CodeBlockContent>
    </CodeBlock>
  );
}
