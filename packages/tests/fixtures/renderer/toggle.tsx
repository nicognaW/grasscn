import { Toggle, toggleVariants } from "@grasscn/web/ui/toggle";
import * as React from "react";

const p = new URLSearchParams(location.search);
const scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3;
const state = p.get("state") ?? "normal";

export const ToggleFixture = () => {
  React.useLayoutEffect(() => {
    document.documentElement.style.background =
      p.get("background") ?? "#202020";
    document.body.style.margin = "0";
  }, []);

  const [pressed, setPressed] = React.useState(p.get("checked") === "true");
  const [events, setEvents] = React.useState(0);
  const [tag, setTag] = React.useState("");

  const ref = React.useRef<HTMLButtonElement>(null);
  const asChild = p.has("asChild");
  const anchor = p.has("anchor");
  const label = p.get("label") ?? "Recipe filter";

  return (
    <>
      <Toggle
        render={
          asChild ? (
            anchor ? (
              <a href="#target" />
            ) : (
              <button type="button" />
            )
          ) : undefined
        }
        id="subject"
        ref={ref}
        scale={scale}
        className="fixture-geometry-x fixture-placement-absolute fixture-geometry-y"
        style={{
          "--fixture-x": `${Number(p.get("x") ?? 16) * scale}px`,

          "--fixture-y": `${Number(p.get("y") ?? 16) * scale}px`,
        }}
        aria-label={label}
        disabled={state.startsWith("disabled")}
        {...(p.has("controlled")
          ? {
              onPressedChange: (next: boolean) => {
                setEvents((v) => v + 1);

                if (!p.has("reject")) {
                  setPressed(next);
                }
              },
              pressed,
            }
          : {
              defaultPressed: pressed,
              onPressedChange: () => {
                setEvents((v) => v + 1);
              },
            })}
        onClick={(event) => {
          if (p.has("cancel")) {
            event.preventDefault();
            event.preventBaseUIHandler();
          }
        }}
        data-subject="true"
      >
        {p.get("text")}
      </Toggle>
      <button
        type="button"
        id="external"
        onClick={() => {
          setPressed((v) => !v);
        }}
        className="fixture-toggle-external-control"
      >
        External
      </button>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setTag(ref.current?.tagName ?? "");
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
      <span
        id="helper"
        className={toggleVariants()}
        style={{ display: "none" }}
      />
    </>
  );
};
