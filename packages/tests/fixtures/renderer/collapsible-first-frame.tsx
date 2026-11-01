import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@grasscn/web/ui/collapsible";
import { loadUnihex } from "@grasscn/web/ui/minecraft-unifont";
import * as React from "react";

export const CollapsibleFirstFrameFixture = () => {
  const q = new URLSearchParams(location.search);
  const scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3;
  const warm = q.has("warm");
  const [ready, setReady] = React.useState(!warm);

  React.useLayoutEffect(() => {
    if (warm) {
      let live = true;
      void loadUnihex().then(() => {
        if (live) {
          setReady(true);
        }
      });

      return () => {
        live = false;
      };
    }
  }, [warm]);

  return (
    <div data-warm-ready={ready} style={{ width: "100%" }}>
      <Collapsible
        scale={scale}
        style={{
          maxWidth: "100%",
          width: Number(q.get("width") ?? 200) * scale,
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
