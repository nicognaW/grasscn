import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@grasscn/web/ui/collapsible";
import { loadUnihex } from "@grasscn/web/ui/minecraft-unifont";
import * as React from "react";

export const CollapsibleFirstFrameFixture = () => {
  const q = new URLSearchParams(location.search);

  // SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
  const scale =
    // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
    Number(q.get("scale") ?? 2) as 1 | 2 | 3;

  const warm = q.has("warm");
  const [ready, setReady] = React.useState(!warm);

  React.useLayoutEffect((): ReturnType<React.EffectCallback> => {
    if (warm) {
      let live = true;
      const glyphResource = loadUnihex();

      const finishWarmup = async () => {
        await glyphResource;

        if (live) {
          setReady(true);
        }
      };

      void finishWarmup();

      return () => {
        live = false;
      };
    }
  }, [warm]);

  return (
    <div data-warm-ready={ready} className="fixture-collapsible-warm-frame">
      <Collapsible
        scale={scale}
        className="fixture-geometry-width fixture-collapsible-max-width"
        style={{
          "--fixture-width": `${Number(q.get("width") ?? 200) * scale}px`,
        }}
      >
        <CollapsibleTrigger disabled={!ready}>World details</CollapsibleTrigger>
        <CollapsibleContent>
          {q.get("text") ?? "你好，世界\nHello Minecraft"}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
