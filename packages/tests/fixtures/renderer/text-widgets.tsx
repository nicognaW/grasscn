import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from "@grasscn/web/ui/message-scroller";
import { Spinner } from "@grasscn/web/ui/spinner";
import {
  Trace,
  TraceLine,
  TraceIcon,
  TraceTitle,
  TraceDescription,
  TraceCollapsible,
  TraceCollapsibleTrigger,
  TraceCollapsibleContent,
} from "@grasscn/web/ui/trace";
import * as React from "react";

const readQuery = () => new URLSearchParams(location.search);

const ScrollerFixture = () => {
  const q = readQuery();
  const api = useMessageScroller();
  const scrollable = useMessageScrollerScrollable();
  const visibility = useMessageScrollerVisibility();

  const [ids, setIds] = React.useState(
    Array.from({ length: 30 }, (_, i) => i + 1)
  );

  const [tag, setTag] = React.useState("");
  const viewport = React.useRef<HTMLDivElement>(null);

  return (
    <>
      <MessageScroller
        scale={
          // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
          Number(q.get("scale") ?? 2) as 1 | 2 | 3
        }
        id="subject"
        className="fixture-height-200 fixture-width-520"
        data-testid="scroller-root"
        data-subject="true"
      >
        <MessageScrollerViewport
          ref={viewport}
          preserveScrollOnPrepend
          aria-label="Chat history"
          data-testid="viewport"
        >
          <MessageScrollerContent
            data-testid="content"
            spacerClassName="box-border"
          >
            {ids.map((id) => (
              <MessageScrollerItem
                messageId={String(id)}
                scrollAnchor={id % 5 === 0}
                key={id}
                data-testid={`message-${id}`}
              >{`Message ${id} 世界`}</MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton direction="start" behavior="instant" />
        <MessageScrollerButton direction="end" behavior="instant" />
      </MessageScroller>
      <button
        type="button"
        onClick={() => {
          api.scrollToStart({ behavior: "instant" });
        }}
      >
        API start
      </button>
      <button
        type="button"
        onClick={() => {
          api.scrollToEnd({ behavior: "instant" });
        }}
      >
        API end
      </button>
      <button
        type="button"
        onClick={() => {
          api.scrollToMessage("15", { align: "start", behavior: "instant" });
        }}
      >
        API message
      </button>
      <button
        type="button"
        onClick={() => {
          setIds((values) => [...values, Math.max(...values) + 1]);
        }}
      >
        Append
      </button>
      <button
        type="button"
        onClick={() => {
          setIds((values) => [Math.min(...values) - 1, ...values]);
        }}
      >
        Prepend
      </button>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setTag(viewport.current?.tagName ?? "missing");
        }}
      >
        Read ref
      </button>
      <output id="tag">{tag}</output>
      <output data-testid="scrollable">{JSON.stringify(scrollable)}</output>
      <output data-testid="visible">{JSON.stringify(visibility)}</output>
    </>
  );
};

export const TextWidgetsFixture = () => {
  const q = readQuery();
  const component = q.get("component") ?? "trace";
  const [open, setOpen] = React.useState(q.has("open"));
  const [changes, setChanges] = React.useState(0);
  const [tag, setTag] = React.useState("");
  const [events, setEvents] = React.useState(0);
  const [phase, setPhase] = React.useState(0);
  const div = React.useRef<HTMLDivElement>(null);
  const svg = React.useRef<SVGSVGElement>(null);

  if (component === "message-scroller") {
    return (
      <MessageScrollerProvider
        defaultScrollPosition={q.get("position") === "start" ? "start" : "end"}
        autoScroll={!q.has("noauto")}
        scrollEdgeThreshold={2}
      >
        <ScrollerFixture />
      </MessageScrollerProvider>
    );
  }

  if (component === "spinner") {
    return (
      <>
        <Spinner
          ref={svg}
          id="subject"
          aria-label="Working"
          timeMs={q.has("animate") ? undefined : phase}
          scale={
            // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
            Number(q.get("scale") ?? 2) as 1 | 2 | 3
          }
          onClick={() => {
            setEvents((n) => n + 1);
          }}
          data-subject="true"
        >
          <title>Original loading dots</title>
        </Spinner>
        <button
          type="button"
          onClick={() => {
            setPhase(phase + 300);
          }}
        >
          Next phase
        </button>
        <button
          type="button"
          id="read-ref"
          onClick={() => {
            setTag(svg.current?.tagName ?? "missing");
          }}
        >
          Read ref
        </button>
        <output id="tag">{tag}</output>
        <output id="events">{events}</output>
      </>
    );
  }

  return (
    <Trace
      id="subject"
      scale={
        // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
        Number(q.get("scale") ?? 2) as 1 | 2 | 3
      }
      className="fixture-width-500"
      data-subject="true"
    >
      <TraceLine status="running" data-testid="running">
        <TraceIcon>O</TraceIcon>
        <TraceTitle>Running 世界</TraceTitle>
        <TraceDescription>1s</TraceDescription>
      </TraceLine>
      <TraceLine status="error" data-testid="error">
        <TraceTitle>Error 世界</TraceTitle>
      </TraceLine>
      <TraceLine status="pending" data-testid="pending">
        <TraceTitle>Pending 世界</TraceTitle>
      </TraceLine>
      <TraceCollapsible
        open={q.has("controlled") ? open : undefined}
        onOpenChange={(value) => {
          setOpen(value);
          setChanges((n) => n + 1);
        }}
        defaultOpen={!q.has("controlled") && q.has("open")}
      >
        <TraceCollapsibleTrigger disabled={q.has("disabled")}>
          Details
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent
          ref={div}
          className="caller-content"
          data-testid="details"
        >
          Native text details 世界
        </TraceCollapsibleContent>
      </TraceCollapsible>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setTag(div.current?.tagName ?? "missing");
        }}
      >
        Read ref
      </button>
      <output id="tag">{tag}</output>
      <output id="changes">{changes}</output>
    </Trace>
  );
};
