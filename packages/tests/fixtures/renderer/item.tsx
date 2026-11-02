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

const q = new URLSearchParams(location.search);
const scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3;
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
}: React.ComponentProps<"button">) => {
  return (
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
};

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
  const ref = React.useRef<any>(null);
  const part = q.get("part");
  const rich = q.has("rich");

  const children = (
    <>
      {rich ? <ItemHeader>Available worlds</ItemHeader> : null}
      <ItemMedia>
        {q.has("customMedia") ? (
          <span data-testid="custom-media">Icon</span>
        ) : undefined}
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

  const commonStyle = {
    height: Number(q.get("height") ?? 36) * scale,
    left: Number(q.get("x") ?? 16) * scale,
    position: "fixed",
    top: Number(q.get("y") ?? 16) * scale,
    width: width * scale,
  } satisfies React.CSSProperties;

  const subject =
    part === "title" ? (
      <ItemTitle
        id="subject"
        ref={ref}
        scale={scale}
        maxWidth={q.has("wrapWidth") ? Number(q.get("wrapWidth")) : undefined}
        align={q.get("align") === "center" ? "center" : "left"}
        style={commonStyle}
        data-subject="true"
      >
        {title}
      </ItemTitle>
    ) : part === "separator" ? (
      <ItemSeparator
        id="subject"
        ref={ref}
        scale={scale}
        edge={state === "footer" ? "footer" : "header"}
        role={q.has("semantic") ? "separator" : "none"}
        style={commonStyle}
        data-subject="true"
      />
    ) : part === "media" ? (
      <ItemMedia id="subject" ref={ref} data-subject="true" />
    ) : (
      <Item
        render={
          q.has("plain") ? undefined : q.has("plain") ? undefined : q.has(
              "customAction"
            ) ? (
            <CustomAction />
          ) : q.has("button") ? (
            <button type="button" />
          ) : (
            <a
              href="#world"
              onClick={(event) => {
                if (q.has("childCancel")) {
                  event.preventDefault();
                }
              }}
            />
          )
        }
        id="subject"
        ref={ref}
        scale={scale}
        selected={q.get("selected") === "true"}
        style={{
          ...commonStyle,
          height: rich ? undefined : commonStyle.height,
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
        {q.has("plain") ? (
          q.has("plain") ? (
            children
          ) : q.has("customAction") ? (
            <CustomAction>{children}</CustomAction>
          ) : q.has("button") ? (
            <button type="button">{children}</button>
          ) : (
            <a
              href="#world"
              onClick={(event) => {
                if (q.has("childCancel")) {
                  event.preventDefault();
                }
              }}
            >
              {children}
            </a>
          )
        ) : (
          children
        )}
      </Item>
    );

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
