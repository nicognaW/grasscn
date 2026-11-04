import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemMedia,
  ItemActions,
  ItemHeader,
  ItemFooter,
  ItemGroup,
  ItemSeparator,
} from "@grasscn/web/ui/item";
import {
  playMinecraftClick,
  setMinecraftSoundVolume,
} from "@grasscn/web/ui/minecraft-sound";
import * as React from "react";

import { fixtureFallbackLabel } from "./utils";

const q = new URLSearchParams(location.search);

// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale =
  // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
  Number(q.get("scale") ?? 2) as 1 | 2 | 3;

const state = q.get("state") ?? "normal";
const title = q.get("label") ?? "New World";
const id = q.get("text") ?? "world-1";
const description = q.get("description") ?? "Survival Mode";

if (q.has("volume")) {
  setMinecraftSoundVolume(Number(q.get("volume")));
}

const CustomAction = ({
  onClick,
  ...props
}: React.ComponentProps<"button">) => (
  <button
    type="button"
    {...props}
    onClick={(event) => {
      onClick?.(event);

      if (!event.defaultPrevented) {
        playMinecraftClick();
      }
    }}
  />
);

const ItemFixture = () => {
  React.useLayoutEffect(() => {
    document.documentElement.style.background =
      q.get("background") ?? "#202020";
    document.body.style.background = q.get("background") ?? "#202020";
  }, []);

  const [events, setEvents] = React.useState(0);
  const [actions, setActions] = React.useState(0);
  const [tag, setTag] = React.useState("");
  const [width, setWidth] = React.useState(Number(q.get("width") ?? 270));
  const ref = React.useRef<React.ComponentRef<typeof Item>>(null);
  const part = q.get("part");
  const rich = q.has("rich");
  const customMedia = q.has("customMedia");

  const accessibleLabel = fixtureFallbackLabel(
    "World item",
    title,
    id,
    description,
    rich,
    customMedia
  );

  const children = (
    <>
      {rich ? <ItemHeader>Available worlds</ItemHeader> : null}
      <ItemMedia>
        {customMedia ? <span data-testid="custom-media">Icon</span> : undefined}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {q.has("richTitle") ? (
            <strong data-testid="rich-title">{title}</strong>
          ) : (
            title
          )}
        </ItemTitle>
        <ItemDescription>{`${id}\n${description}`}</ItemDescription>
      </ItemContent>
      {rich ? (
        <>
          <ItemActions>
            <button
              type="button"
              onClick={() => {
                setActions((n) => n + 1);
              }}
            >
              Item action
            </button>
          </ItemActions>
          <ItemFooter>World information</ItemFooter>
        </>
      ) : null}
    </>
  );

  const height = Number(q.get("height") ?? 36) * scale;
  const x = Number(q.get("x") ?? 16) * scale;
  const y = Number(q.get("y") ?? 16) * scale;

  const commonStyle = {
    "--fixture-height": `${height}px`,
    "--fixture-x": `${x}px`,

    "--fixture-y": `${y}px`,
    width: width * scale,
  } satisfies React.CSSProperties;

  let selectedSubject: React.JSX.Element;

  if (part === "title") {
    selectedSubject = (
      <ItemTitle
        id="subject"
        ref={ref}
        scale={scale}
        maxWidth={q.has("wrapWidth") ? Number(q.get("wrapWidth")) : undefined}
        align={q.get("align") === "center" ? "center" : "left"}

        style={{
          /* oxlint-disable shadcn/no-inline-styles -- Approved ItemTitle fixture contract: adding className switches the real renderer; retain the original inline geometry and absent className. */
          height,
          left: x,
          position: "fixed",
          top: y,
          width: commonStyle.width,
          /* oxlint-enable shadcn/no-inline-styles */
        }}
        data-subject="true"
      >
        {title}
      </ItemTitle>
    );
  } else if (part === "separator") {
    selectedSubject = (
      <ItemSeparator
        id="subject"
        ref={ref}
        scale={scale}
        edge={state === "footer" ? "footer" : "header"}
        role={q.has("semantic") ? "separator" : "none"}
        className="fixture-geometry-height fixture-geometry-x fixture-placement-fixed fixture-geometry-y"
        style={commonStyle}
        data-subject="true"
      />
    );
  } else if (part === "media") {
    selectedSubject = <ItemMedia id="subject" ref={ref} data-subject="true" />;
  } else {
    // The document-owned URL query is read-only: repeated plain branches have the same value.
    let selectedItemRender: React.ComponentProps<typeof Item>["render"];

    if (q.has("plain")) {
      selectedItemRender = undefined;
    } else if (q.has("customAction")) {
      selectedItemRender = <CustomAction />;
    } else {
      selectedItemRender = q.has("button") ? (
        <button type="button" aria-label={accessibleLabel} />
      ) : (
        <a
          href="#world"
          aria-label={accessibleLabel}
          onClick={(event) => {
            if (q.has("childCancel")) {
              event.preventDefault();
            }
          }}
        />
      );
    }

    selectedSubject = (
      <Item
        render={selectedItemRender}
        id="subject"
        ref={ref}
        scale={scale}
        selected={q.get("selected") === "true"}
        className="fixture-geometry-x fixture-placement-fixed fixture-geometry-y"
        style={{
          ...commonStyle,
          // oxlint-disable-next-line shadcn/no-inline-styles -- Approved Item default-layer probe removes inline height before asserting native dimensions; a height class would survive removal.
          height: rich ? undefined : height,
        }}
        tabIndex={state === "focus" ? 0 : undefined}
        onClick={(event) => {
          setEvents((n) => n + 1);

          if (q.has("cancel")) {
            event.preventDefault();
          }
        }}
        aria-disabled={q.has("disabled") ? true : undefined}
        data-subject="true"
      >
        {children}
      </Item>
    );
  }

  const subject = selectedSubject;

  return (
    <>
      {subject}
      <button
        type="button"
        id="read-ref"
        className="fixture-item-read-control"
        onClick={() => {
          setTag(ref.current?.tagName ?? "");
        }}
      >
        Read ref
      </button>
      <button
        type="button"
        id="resize"
        className="fixture-item-resize-control"
        onClick={() => {
          setWidth(340);
        }}
      >
        Resize
      </button>
      <output id="tag" className="fixture-item-ref-output">
        {tag}
      </output>
      <output id="events" className="fixture-item-event-output">
        {events}
      </output>
      <output id="actions" className="fixture-item-action-output">
        {actions}
      </output>
      <div className="fixture-item-hidden-variants">
        <ItemGroup>
          <Item />
          <ItemSeparator />
        </ItemGroup>
      </div>
    </>
  );
};

export { ItemFixture };
