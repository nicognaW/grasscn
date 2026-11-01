"use client";

import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";

import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";

import "./minecraft-resizable.css";
import "./minecraft-resizable-assets.css";

const ScaleContext = React.createContext<1 | 2 | 3>(2);

const ResizablePanelGroup = ({
  className,
  scale = 2,
  style,
  ...props
}: ResizablePrimitive.GroupProps & {
  scale?: 1 | 2 | 3;
}) => {
  return (
    <ScaleContext.Provider value={scale}>
      <ResizablePrimitive.Group
        data-slot="resizable-panel-group"
        className={cn(`mc-resizable-group`, className)}
        style={minecraftStyle(
          style,
          (__style) =>
            ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
        )}
        {...props}
      />
    </ScaleContext.Provider>
  );
};

const ResizablePanel = ({
  className,
  ...props
}: ResizablePrimitive.PanelProps) => {
  return (
    <ResizablePrimitive.Panel
      data-slot="resizable-panel"
      className={cn(`mc-resizable-panel`, className)}
      {...props}
    />
  );
};

const ResizableHandle = ({
  withHandle = false,
  className,
  style,
  children,
  scale: scaleProp,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean;
  scale?: 1 | 2 | 3;
}) => {
  const inherited = React.useContext(ScaleContext);
  const scale = scaleProp ?? inherited;

  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      data-with-handle={String(withHandle)}
      className={cn(`mc-resizable-handle`, className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
      )}
      {...props}
    >
      {children}
      <span className="mc-resizable-track" aria-hidden="true" />
      {withHandle ? (
        <span
          data-slot="resizable-grip"
          className="mc-resizable-grip"
          aria-hidden="true"
        >
          <span
            data-slot="resizable-arrow"
            data-direction="backward"
            className="mc-resizable-arrow"
          />
          <span
            data-slot="resizable-arrow"
            data-direction="forward"
            className="mc-resizable-arrow"
          />
        </span>
      ) : null}
    </ResizablePrimitive.Separator>
  );
};

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
