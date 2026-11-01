import {
  Marker,
  MarkerIcon,
  MarkerContent,
  markerVariants,
} from "@grasscn/web/ui/marker";
import * as React from "react";
export function MarkerFixture() {
  const q = new URLSearchParams(location.search),
    scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3,
    [count, setCount] = React.useState(0),
    [tag, setTag] = React.useState(""),
    ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    document.documentElement.style.background = document.body.style.background =
      q.get("background") ?? "#202020";
  }, []);
  if (q.has("native")) {
    const part = q.get("part") ?? "text";
    return (
      <Marker
        id="subject"
        scale={scale}
        variant={part === "line" ? "border" : "default"}
        separatorEdge={q.get("state") === "footer" ? "footer" : "header"}
        style={{
          position: "fixed",
          left: Number(q.get("x") ?? 16) * scale,
          top: Number(q.get("y") ?? 16) * scale,
          width: Number(q.get("width") ?? 200) * scale,
          height: Number(q.get("height") ?? 9) * scale,
          minHeight: 0,
          padding: 0,
          alignItems: "flex-start",
        }}
        data-subject="true"
      >
        {part === "line" ? null : (
          <MarkerContent
            maxWidth={
              q.has("wrapWidth") ? Number(q.get("wrapWidth")) : undefined
            }
            align={(q.get("align") ?? "left") as "left" | "center"}
          >
            {q.get("label") ?? ""}
          </MarkerContent>
        )}
      </Marker>
    );
  }
  return (
    <>
      <Marker
        render={
          <a
            href="#marker"
            id="linked"
            onClick={() => setCount((n) => n + 1)}
          />
        }
        ref={ref}
      >
        {
          <>
            <MarkerIcon>
              <span>!</span>
            </MarkerIcon>
            <MarkerContent>Checkpoint 世界</MarkerContent>
          </>
        }
      </Marker>
      <Marker variant="separator" id="separated">
        <MarkerContent>Saved</MarkerContent>
      </Marker>
      <Marker variant="border">
        <MarkerContent>
          <strong id="rich">Real rich content</strong>
        </MarkerContent>
      </Marker>
      <output id="events">{count}</output>
      <button
        id="read-marker-ref"
        onClick={() => setTag(ref.current?.tagName ?? "")}
      >
        Read ref
      </button>
      <output id="marker-ref">{tag}</output>
      <div id="helper" className={markerVariants({ variant: "border" })}>
        Helper
      </div>
    </>
  );
}
