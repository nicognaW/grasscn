import { ToggleGroup, ToggleGroupItem } from "@grasscn/web/ui/toggle-group";
import * as React from "react";

const p = new URLSearchParams(location.search);

// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale =
  // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
  Number(p.get("scale") ?? 2) as 1 | 2 | 3;

const state = p.get("state") ?? "normal";

export const ToggleGroupFixture = () => {
  const initial = p.get("checked") === "true" ? ["one"] : [];
  const [value, setValue] = React.useState(initial);
  const [events, setEvents] = React.useState(0);
  const [tag, setTag] = React.useState("");

  const root = React.useRef<HTMLDivElement>(null);
  const item = React.useRef<HTMLButtonElement>(null);
  const native = p.has("native");
  const multiple = p.get("type") === "multiple";
  const controlled = p.has("controlled");

  React.useLayoutEffect(() => {
    document.documentElement.style.background =
      p.get("background") ?? "#202020";
    document.body.style.margin = "0";
  }, []);

  const changed = function changed(next: string[]) {
    setEvents((v) => v + 1);

    if (!p.has("reject")) {
      setValue(next);
    }
  };

  const singleProps = controlled
    ? { onValueChange: changed, value }
    : { defaultValue: value, onValueChange: changed };

  const multipleProps = singleProps;

  const items = (native ? ["one"] : ["one", "two", "three"]).map((v, index) => (
    <ToggleGroupItem
      render={p.has("asChild") ? <a href={`#${v}`} /> : undefined}
      key={v}
      value={v}
      id={index === 0 ? "subject" : `item-${v}`}
      ref={index === 0 ? item : undefined}
      aria-label={`Filter ${v}`}
      disabled={p.get("disabledItem") === v}
      onClick={(event) => {
        if (p.has("cancel")) {
          event.preventDefault();
          event.preventBaseUIHandler();
        }
      }}
      data-subject={
        (index === 0 ? "subject" : `item-${v}`) === "subject"
          ? "true"
          : undefined
      }
    >
      {p.has("asChild") ? <span>{p.get("text")}</span> : p.get("text")}
    </ToggleGroupItem>
  ));

  const props = {
    "aria-label": "Recipe filters",
    className:
      "fixture-placement-absolute fixture-geometry-x fixture-geometry-y",
    dir: p.get("dir") === "rtl" ? ("rtl" as const) : ("ltr" as const),
    disabled: state.startsWith("disabled"),
    loopFocus: !p.has("noLoop"),
    orientation:
      p.get("orientation") === "vertical"
        ? ("vertical" as const)
        : ("horizontal" as const),
    ref: root,
    scale,
    style: {
      "--fixture-x": `${Number(p.get("x") ?? 16) * scale}px`,
      "--fixture-y": `${Number(p.get("y") ?? 16) * scale}px`,
    },
  };

  return (
    <>
      {multiple ? (
        <ToggleGroup {...props} {...multipleProps} multiple={true}>
          {items}
        </ToggleGroup>
      ) : (
        <ToggleGroup {...props} {...singleProps} multiple={false}>
          {items}
        </ToggleGroup>
      )}
      <button
        type="button"
        id="external"
        onClick={() => {
          setValue((v) => (v.length ? [] : ["two"]));
        }}
        className="fixture-toggle-external-control"
      >
        External
      </button>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setTag(`${root.current?.tagName}/${item.current?.tagName}`);
        }}
        className="fixture-toggle-read-control"
      >
        Read ref
      </button>
      <output id="events" className="fixture-toggle-event-output">
        {events}
      </output>
      <output id="tag" className="fixture-toggle-ref-output">
        {tag}
      </output>
      <output id="value" className="fixture-toggle-group-value-output">
        {value.join(",")}
      </output>
    </>
  );
};
