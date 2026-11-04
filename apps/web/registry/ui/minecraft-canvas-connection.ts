import * as React from "react";

interface CanvasPaintConnection {
  canvas: HTMLCanvasElement;
}

/** A committed attachment owns paint completion; Activity can reconnect the same node. */
export const useCanvasPaintConnection = (
  ref: React.RefObject<HTMLCanvasElement | null>
) => {
  const [connection, setConnection] =
    React.useState<CanvasPaintConnection | null>(null);

  const attach = React.useCallback(
    (canvas: HTMLCanvasElement | null) => {
      ref.current = canvas;
      setConnection(canvas === null ? null : { canvas });
    },
    [ref]
  );

  return { attach, connection };
};
