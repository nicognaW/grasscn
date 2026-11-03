import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
  InputGroupButton,
  InputGroupText,
} from "@grasscn/web/ui/input-group";
import * as React from "react";

const p = new URLSearchParams(location.search);
const native = p.has("native");
const part = p.get("part") ?? "input";

// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale =
  // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
  Number(p.get("scale") ?? 2) as 1 | 2 | 3;

const state = p.get("state") ?? "normal";
const width = Number(p.get("width") ?? 200);

export const InputGroupFixture = () => {
  React.useLayoutEffect(() => {
    const chainedBackgroundOuter = document.documentElement.style;
    const chainedBackgroundInner = document.body.style;
    const chainedBackgroundValue = p.get("background") ?? "#202020";
    chainedBackgroundInner.background = chainedBackgroundValue;
    chainedBackgroundOuter.background = chainedBackgroundValue;
  }, []);

  const [value, setValue] = React.useState(p.get("text") ?? "Hello Minecraft");
  const [events, setEvents] = React.useState(0);
  const [tag, setTag] = React.useState("");

  const input = React.useRef<HTMLInputElement>(null);
  const area = React.useRef<HTMLTextAreaElement>(null);
  const button = React.useRef<HTMLButtonElement>(null);

  const position: React.CSSProperties = {
    "--fixture-width": `${width * scale}px`,

    "--fixture-x": `${Number(p.get("x") ?? 16) * scale}px`,

    "--fixture-y": `${Number(p.get("y") ?? 16) * scale}px`,
  };

  const shared = {
    "aria-label": "Group field",
    className: "fixture-geometry-height fixture-geometry-width",
    "data-subject": "true",
    disabled: state.startsWith("disabled"),
    id: "subject",
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      setValue(event.target.value);
      setEvents((v) => v + 1);
    },
    placeholder: p.get("placeholder") ?? "",
    readOnly: state.includes("readonly"),
    style: {
      "--fixture-height": `${Number(p.get("height") ?? 20) * scale}px`,
      "--fixture-width": `${width * scale}px`,
    },
    value,
  };

  if (native) {
    return (
      <InputGroup
        scale={scale}
        className="fixture-geometry-x fixture-placement-absolute fixture-geometry-y fixture-geometry-width"
        style={position}
      >
        {part === "text" ? (
          <InputGroupText
            id="subject"
            maxWidth={
              p.has("wrapWidth") ? Number(p.get("wrapWidth")) : undefined
            }
            align={p.get("align") === "center" ? "center" : "left"}
            className="fixture-geometry-height"
            style={{
              "--fixture-height": `${Number(p.get("height") ?? 9) * scale}px`,
              width: width * scale,
            }}
            data-subject="true"
          >
            {p.get("label") ?? ""}
          </InputGroupText>
        ) : part === "button" ? (
          <InputGroupButton
            id="subject"
            ref={button}
            disabled={state.startsWith("disabled")}
            className="fixture-geometry-height fixture-geometry-width"
            style={{
              "--fixture-height": `${Number(p.get("height") ?? 20) * scale}px`,
              "--fixture-width": `${width * scale}px`,
            }}
            data-subject="true"
          >
            {p.get("label") ?? "Button"}
          </InputGroupButton>
        ) : part === "textarea" ? (
          <InputGroupTextarea ref={area} {...shared} />
        ) : (
          <InputGroupInput
            ref={input}
            maxLength={
              p.has("maxLength") ? Number(p.get("maxLength")) : undefined
            }
            {...shared}
          />
        )}
      </InputGroup>
    );
  }

  const align =
    // SAFETY: owned fixture callers serialize the align option from the actual component protocol (| "inline-start" | "inline-end" | "block-start" | "block-end"); preserve this URL read, original default and component handling.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
    (p.get("align") ?? "inline-start") as
      | "inline-start"
      | "inline-end"
      | "block-start"
      | "block-end";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setTag("submitted");
      }}
    >
      <InputGroup scale={scale} aria-label="Message controls">
        <InputGroupAddon
          align={align}
          onClick={(event) => {
            if (p.has("cancelAddon")) {
              event.preventDefault();
            }
          }}
        >
          <InputGroupText>Message</InputGroupText>
          <InputGroupButton
            ref={button}
            disabled={p.has("disabled")}
            className="fixture-geometry-width"
            style={{ "--fixture-width": `${80 * scale}px` }}
            onClick={() => {
              setEvents((v) => v + 1);
            }}
          >
            Send
          </InputGroupButton>
        </InputGroupAddon>
        {part === "textarea" ? (
          <InputGroupTextarea
            ref={area}
            aria-label="Group field"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
            }}
          />
        ) : (
          <InputGroupInput
            ref={input}
            aria-label="Group field"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
            }}
          />
        )}
      </InputGroup>
      <button
        type="submit"
        id="read-ref"
        onClick={(event) => {
          event.preventDefault();
          setTag(
            `${input.current?.tagName ?? area.current?.tagName}/${button.current?.tagName}`
          );
        }}
      >
        Read ref
      </button>
      <output aria-label="Group value">{value}</output>
      <output aria-label="Group actions">{events}</output>
      <output aria-label="Group refs">{tag}</output>
    </form>
  );
};
