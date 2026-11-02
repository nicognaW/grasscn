import { AspectRatio } from "@grasscn/web/ui/aspect-ratio";
import { Button } from "@grasscn/web/ui/button";
import {
  ButtonGroup,
  ButtonGroupText,
  ButtonGroupSeparator,
  buttonGroupVariants,
} from "@grasscn/web/ui/button-group";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@grasscn/web/ui/pagination";
import * as React from "react";

const p = new URLSearchParams(location.search);
const scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3;
const kind = p.get("component") ?? "button-group";
const state = p.get("state") ?? "normal";
const native = p.has("native");
const label = p.get("label") ?? "Button";
const width = Number(p.get("width") ?? 200);
const height = Number(p.get("height") ?? 20);

const position: React.CSSProperties = {
  left: Number(p.get("x") ?? 16) * scale,
  position: "absolute",
  top: Number(p.get("y") ?? 16) * scale,
};

export const StructuralFixture = () => {
  React.useLayoutEffect(() => {
    document.documentElement.style.background =
      p.get("background") ?? "#202020";
    document.body.style.background = p.get("background") ?? "#202020";
  }, []);

  const [events, setEvents] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const ref = React.useRef<HTMLAnchorElement>(null);
  const [tag, setTag] = React.useState("");

  const subject = (
    <Button
      id="subject"
      scale={scale}
      disabled={state === "disabled"}
      style={{ height: height * scale, width: width * scale }}
      onClick={() => {
        setEvents((v) => v + 1);
      }}
      data-subject="true"
    >
      {label}
    </Button>
  );

  if (kind === "aspect-ratio") {
    return (
      <>
        <div
          id="container"
          style={{ ...position, width: Number(p.get("containerWidth") ?? 320) }}
        >
          <AspectRatio
            id="ratio"
            ratio={Number(p.get("ratio") ?? 16 / 9)}
            style={{ overflow: p.has("clip") ? "hidden" : "visible" }}
            ref={(node) => {
              if (node) {
                node.dataset.ref = "true";
              }
            }}
          >
            <div id="art" className="fixture-structural-art" />
            {native ? subject : null}
          </AspectRatio>
        </div>
      </>
    );
  }

  if (kind === "button-group") {
    return (
      <>
        <ButtonGroup
          id="group"
          aria-label="Game actions"
          orientation={
            p.get("orientation") === "vertical" ? "vertical" : "horizontal"
          }
          scale={scale}
          style={position}
        >
          {p.get("part") === "text" ? (
            <ButtonGroupText
              id="subject"
              scale={scale}
              maxWidth={
                p.has("wrapWidth") ? Number(p.get("wrapWidth")) : undefined
              }
              align={p.get("alignment") === "center" ? "center" : "left"}
              style={{
                padding: 0,
                width: width * scale,
                height: height * scale,
                display: "block",
              }}
              data-subject="true"
            >
              {label}
            </ButtonGroupText>
          ) : p.get("part") === "separator" ? (
            <ButtonGroupSeparator
              id="subject"
              scale={scale}
              orientation="horizontal"
              edge={p.get("edge") === "footer" ? "footer" : "header"}
              style={{ width: width * scale, minWidth: 0 }}
              data-subject="true"
            />
          ) : (
            subject
          )}
          {!native ? (
            <>
              <ButtonGroupSeparator scale={scale} role="separator" />
              <ButtonGroupText scale={scale}>Game</ButtonGroupText>
              <ButtonGroupText render={<span id="slotted" />}>
                {"Slotted text"}
              </ButtonGroupText>
              <Button
                scale={scale}
                style={{ width: 80 * scale }}
                onClick={() => {
                  setEvents((v) => v + 1);
                }}
              >
                Next
              </Button>
            </>
          ) : null}
        </ButtonGroup>
        <output id="events" className="fixture-structural-events">
          {events}
        </output>
        <span
          id="variant"
          className={buttonGroupVariants({ orientation: "vertical" })}
        />
      </>
    );
  }

  if (kind === "pagination" && p.get("part") === "arrow") {
    const Arrow =
      p.get("checked") === "true" ? PaginationNext : PaginationPrevious;

    return (
      <Arrow
        id="subject"
        scale={scale}
        aria-disabled={state.startsWith("disabled") || undefined}
        href="#next"
        style={position}
        onClick={(event) => {
          if (p.has("cancel")) {
            event.preventDefault();
          }
        }}
        data-subject="true"
      >
        {p.get("text")}
      </Arrow>
    );
  }

  if (kind === "pagination") {
    return (
      <>
        <Pagination
          aria-label="World pages"
          style={
            native
              ? {
                  ...position,
                  width: width * scale,
                  justifyContent: "flex-start",
                }
              : undefined
          }
        >
          <PaginationContent>
            <PaginationItem style={{ display: native ? "none" : undefined }}>
              <PaginationPrevious scale={scale} href="#previous" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                id="subject"
                ref={ref}
                scale={scale}
                style={{ width: width * scale, height: height * scale }}
                href="#next"
                aria-disabled={state === "disabled" || undefined}
                isActive={p.has("active")}
                onClick={(event) => {
                  if (p.has("cancel")) {
                    event.preventDefault();

                    return;
                  }

                  setEvents((v) => v + 1);
                  setPage(2);
                }}
                data-subject="true"
              >
                {native ? label : String(page)}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem style={{ display: native ? "none" : undefined }}>
              <PaginationEllipsis scale={scale} />
            </PaginationItem>
            <PaginationItem style={{ display: native ? "none" : undefined }}>
              <PaginationNext scale={scale} href="#next" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <button
          type="button"
          id="read-ref"
          onClick={() => {
            setTag(ref.current?.tagName ?? "");
          }}
        >
          Read ref
        </button>
        <output id="tag">{tag}</output>
        <output id="events">{events}</output>
        <output id="page">{page}</output>
      </>
    );
  }

  return null;
};
