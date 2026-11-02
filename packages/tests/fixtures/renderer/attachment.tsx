import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentTrigger,
  AttachmentAction,
  AttachmentActions,
  AttachmentGroup,
} from "@grasscn/web/ui/attachment";
import * as React from "react";

export const AttachmentFixture = () => {
  const q = new URLSearchParams(location.search);
  const scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3;
  const state = q.get("state") ?? "normal";
  const [opened, setOpened] = React.useState(0);
  const [removed, setRemoved] = React.useState(0);
  const [tag, setTag] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    document.documentElement.style.background = document.body.style.background =
      q.get("background") ?? "#202020";
  }, []);

  const bounds = {
    height: Number(q.get("height") ?? 36) * scale,
    left: Number(q.get("x") ?? 16) * scale,
    position: "fixed",
    top: Number(q.get("y") ?? 16) * scale,
    width: Number(q.get("width") ?? 270) * scale,
  } satisfies React.CSSProperties;

  if (q.has("native")) {
    if (q.get("part") === "action") {
      return (
        <AttachmentAction
          id="subject"
          scale={scale}
          disabled={state.startsWith("disabled")}
          style={bounds}
          data-subject="true"
        >
          {q.get("label") ?? "Button"}
        </AttachmentAction>
      );
    }

    return (
      <Attachment
        id="subject"
        scale={scale}
        selected={q.get("selected") === "true"}
        tabIndex={state === "focus" ? 0 : undefined}
        style={bounds}
        data-subject="true"
      >
        <AttachmentMedia />
        <AttachmentContent>
          <AttachmentTitle>{q.get("label") ?? "New World"}</AttachmentTitle>
          <AttachmentDescription>{`${q.get("text") ?? "world-1"}\n${q.get("description") ?? "Survival Mode"}`}</AttachmentDescription>
        </AttachmentContent>
        <AttachmentTrigger aria-label="Preview" />
      </Attachment>
    );
  }

  return (
    <>
      <Attachment
        ref={ref}
        scale={scale}
        disabled={q.has("disabled")}
        state="done"
      >
        <AttachmentMedia />
        <AttachmentContent>
          <AttachmentTitle>Screenshot 世界</AttachmentTitle>
          <AttachmentDescription>{"PNG\nReady"}</AttachmentDescription>
        </AttachmentContent>
        <AttachmentTrigger
          aria-label="Preview file"
          onClick={() => {
            setOpened((n) => n + 1);
          }}
        />
        <AttachmentActions>
          <AttachmentAction
            aria-label="Remove file"
            onClick={() => {
              setRemoved((n) => n + 1);
            }}
          >
            X
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
      <Attachment scale={scale}>
        <AttachmentMedia variant="image">
          <img
            alt="Actual custom preview"
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' fill='%23667788'/%3E%3C/svg%3E"
          />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>
            <strong id="rich-title">Rich filename</strong>
          </AttachmentTitle>
        </AttachmentContent>
        <AttachmentTrigger
          render={<a href="#preview" aria-label="Open link" />}
        >
          {undefined}
        </AttachmentTrigger>
      </Attachment>
      <AttachmentGroup id="files">
        <Attachment orientation="vertical" state="uploading">
          <AttachmentMedia />
          <AttachmentContent>
            <AttachmentTitle>Uploading</AttachmentTitle>
          </AttachmentContent>
        </Attachment>
        <Attachment state="error">
          <AttachmentContent>
            <AttachmentTitle>Error</AttachmentTitle>
          </AttachmentContent>
        </Attachment>
      </AttachmentGroup>
      <button
        type="button"
        id="read-attachment-ref"
        onClick={() => {
          setTag(ref.current?.tagName ?? "");
        }}
      >
        Read ref
      </button>
      <output id="attachment-ref">{tag}</output>
      <output id="opened">{opened}</output>
      <output id="removed">{removed}</output>
    </>
  );
};
