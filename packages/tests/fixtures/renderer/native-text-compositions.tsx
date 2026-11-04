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

// Navigation owns this immutable fixture query; state updates keep the same document.
const q = new URLSearchParams(location.search);

interface NativeCompositionReferenceStyle extends React.CSSProperties {
  "--mc-pixel": string;
  "--mc-scale": number;
  "--reference-color": string | undefined;
  "--reference-height": string;
  "--reference-width": string;
  "--reference-x": string;
  "--reference-y": string;
}

export const NativeTextCompositionsFixture = () => {
  const component = q.get("component") ?? q.get("part") ?? "code-block";

  // SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
  const scale =
    // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
    Number(q.get("scale") ?? 2) as 1 | 2 | 3;

  const label = q.get("label") ?? "Hello Minecraft!";
  const width = Number(q.get("width") ?? 172);
  const height = Number(q.get("height") ?? 9);

  const style: NativeCompositionReferenceStyle = {
    "--mc-pixel": `${scale}px`,
    "--mc-scale": scale,
    "--reference-color": q.get("color") ?? undefined,
    "--reference-height": `${height * scale}px`,
    "--reference-width": `${width * scale}px`,
    "--reference-x": `${Number(q.get("x") ?? 16) * scale}px`,
    "--reference-y": `${Number(q.get("y") ?? 16) * scale}px`,
  };

  React.useLayoutEffect(() => {
    document.documentElement.style.background =
      q.get("background") ?? "#202020";
    document.body.style.background = q.get("background") ?? "#202020";
  }, []);

  if (component === "spinner") {
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
  }

  if (component === "trace") {
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
  }

  if (component === "message-scroller") {
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
  }

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
};
