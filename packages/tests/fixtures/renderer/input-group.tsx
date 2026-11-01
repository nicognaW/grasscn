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
const scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3;
const state = p.get("state") ?? "normal";
const width = Number(p.get("width") ?? 200);

export const InputGroupFixture = () => {
  React.useLayoutEffect(() => {
    document.documentElement.style.background = document.body.style.background =
      p.get("background") ?? "#202020";
  }, []);

  const [value, setValue] = React.useState(p.get("text") ?? "Hello Minecraft");
  const [events, setEvents] = React.useState(0);
  const [tag, setTag] = React.useState("");

  const input = React.useRef<HTMLInputElement>(null);
  const area = React.useRef<HTMLTextAreaElement>(null);
  const button = React.useRef<HTMLButtonElement>(null);

  const position: React.CSSProperties = {
    left: Number(p.get("x") ?? 16) * scale,
    position: "absolute",
    top: Number(p.get("y") ?? 16) * scale,
    width: width * scale,
  };

  const shared = {
    "aria-label": "Group field",
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
      height: Number(p.get("height") ?? 20) * scale,
      width: width * scale,
    },
    value,
  };

  if (native) {
    return (
      <InputGroup scale={scale} style={position}>
        {part === "text" ? (
          <InputGroupText
            id="subject"
            maxWidth={
              p.has("wrapWidth") ? Number(p.get("wrapWidth")) : undefined
            }
            align={p.get("align") === "center" ? "center" : "left"}
            style={{
              width: width * scale,
              height: Number(p.get("height") ?? 9) * scale,
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
            style={{
              width: width * scale,
              height: Number(p.get("height") ?? 20) * scale,
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

  const align = (p.get("align") ?? "inline-start") as
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
            style={{ width: 80 * scale }}
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
