"use client";

import * as React from "react";

import "./minecraft-trace.css";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "./collapsible";
import { ChatChildren, MessageScale } from "./message";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";

interface TraceScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

const Trace = ({
  className,
  scale = 2,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  scale?: 1 | 2 | 3;
}) => (
  <MessageScale value={scale}>
    <div
      data-slot="trace"
      className={cn(`mc-trace`, className)}
      style={minecraftStyle(style, (__style): TraceScaleStyle => ({
        "--mc-scale": scale,
        ...__style,
      }))}
      {...props}
    />
  </MessageScale>
);

const TraceLine = ({
  className,
  status,
  ...props
}: React.ComponentProps<"span"> & {
  status?: "running" | "error" | "pending";
}) => (
  <span
    data-slot="trace-line"
    data-status={status}
    className={cn(`mc-trace-line`, className)}
    {...props}
  />
);

const TraceIcon = ({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    data-slot="trace-icon"
    aria-hidden="true"
    className={cn(`mc-trace-icon`, className)}
    {...props}
  >
    <ChatChildren>{children}</ChatChildren>
  </span>
);

const TraceTitle = ({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    data-slot="trace-title"
    className={cn(`mc-trace-title`, className)}
    {...props}
  >
    <ChatChildren>{children}</ChatChildren>
  </span>
);

const TraceDescription = ({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    data-slot="trace-description"
    className={cn(`mc-trace-description`, className)}
    {...props}
  >
    <ChatChildren>{children}</ChatChildren>
  </span>
);

type TraceCollapsibleProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "render" | "open"
> &
  (
    | {
        open?: undefined;
      }
    | {
        open: boolean;
        onOpenChange: NonNullable<
          React.ComponentProps<typeof Collapsible>["onOpenChange"]
        >;
      }
  );

const TraceCollapsible = ({
  className,
  scale: ownScale,
  ...props
}: TraceCollapsibleProps) => {
  const inherited = React.useContext(MessageScale);
  const scale = ownScale ?? inherited;

  return (
    <MessageScale value={scale}>
      <Collapsible
        scale={scale}
        data-slot="trace-collapsible"
        className={cn(`mc-trace-collapsible`, className)}
        {...props}
      />
    </MessageScale>
  );
};

const TraceCollapsibleTrigger = ({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof CollapsibleTrigger>, "render">) => (
  <CollapsibleTrigger
    data-slot="trace-collapsible-trigger"
    className={cn(`mc-trace-collapsible-trigger`, className)}
    {...props}
  >
    {children}
    <TraceIcon className="mc-trace-chevron">
      <span className="mc-trace-closed">
        <ChatChildren>{">"}</ChatChildren>
      </span>
      <span className="mc-trace-open">
        <ChatChildren>v</ChatChildren>
      </span>
    </TraceIcon>
  </CollapsibleTrigger>
);

const TraceCollapsibleContent = ({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof CollapsibleContent>, "render">) => (
  <CollapsibleContent
    data-slot="trace-collapsible-content"
    className="mc-trace-collapsible-content"
    {...props}
  >
    <div
      data-slot="trace-collapsible-content-inner"
      className={cn(`mc-trace-collapsible-content-inner`, className)}
    >
      <ChatChildren>{children}</ChatChildren>
    </div>
  </CollapsibleContent>
);

export {
  Trace,
  TraceLine,
  TraceIcon,
  TraceTitle,
  TraceDescription,
  TraceCollapsible,
  TraceCollapsibleTrigger,
  TraceCollapsibleContent,
};

export type { TraceCollapsibleProps };
