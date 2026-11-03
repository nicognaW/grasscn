import {
  Marker,
  MarkerIcon,
  MarkerContent,
  markerVariants,
} from "@grasscn/web/ui/marker";
import * as React from "react";

export const MarkerFixture = () => {
  const q = new URLSearchParams(location.search);

  // SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
  const scale =
    // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
    Number(q.get("scale") ?? 2) as 1 | 2 | 3;

  const [count, setCount] = React.useState(0);
  const [tag, setTag] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const chainedBackgroundOuter = document.documentElement.style;
    const chainedBackgroundInner = document.body.style;
    const chainedBackgroundValue = q.get("background") ?? "#202020";
    chainedBackgroundInner.background = chainedBackgroundValue;
    chainedBackgroundOuter.background = chainedBackgroundValue;
  }, []);

  if (q.has("native")) {
    const part = q.get("part") ?? "text";

    return (
      <Marker
        id="subject"
        scale={scale}
        variant={part === "line" ? "border" : "default"}
        separatorEdge={q.get("state") === "footer" ? "footer" : "header"}
        className="fixture-geometry-height fixture-geometry-x fixture-placement-fixed fixture-geometry-y fixture-geometry-width fixture-marker-native-layout"
        style={{
          "--fixture-height": `${Number(q.get("height") ?? 9) * scale}px`,
          "--fixture-width": `${Number(q.get("width") ?? 200) * scale}px`,
          "--fixture-x": `${Number(q.get("x") ?? 16) * scale}px`,
          "--fixture-y": `${Number(q.get("y") ?? 16) * scale}px`,
        }}
        data-subject="true"
      >
        {part === "line" ? null : (
          <MarkerContent
            maxWidth={
              q.has("wrapWidth") ? Number(q.get("wrapWidth")) : undefined
            }
            align={q.get("align") === "center" ? "center" : "left"}
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
            onClick={() => {
              setCount((n) => n + 1);
            }}
          />
        }
        ref={ref}
      >
        <>
          <MarkerIcon>
            <span>!</span>
          </MarkerIcon>
          <MarkerContent>Checkpoint 世界</MarkerContent>
        </>
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
        type="button"
        id="read-marker-ref"
        onClick={() => {
          setTag(ref.current?.tagName ?? "");
        }}
      >
        Read ref
      </button>
      <output id="marker-ref">{tag}</output>
      <div id="helper" className={markerVariants({ variant: "border" })}>
        Helper
      </div>
    </>
  );
};
