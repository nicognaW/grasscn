import { Badge } from "@grasscn/web/ui/badge";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@grasscn/web/ui/breadcrumb";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@grasscn/web/ui/empty";
import { Kbd, KbdGroup } from "@grasscn/web/ui/kbd";
import {
  Typography,
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyP,
  TypographySmall,
  TypographyBlockquote,
  TypographyInlineCode,
  TypographyLead,
  TypographyLarge,
  TypographyMuted,
} from "@grasscn/web/ui/typography";
import * as React from "react";

import "./native-reference.css";

interface TextReferenceStyle extends React.CSSProperties {
  "--reference-height": string | undefined;
  "--reference-width": string | undefined;
  "--reference-x": string;
  "--reference-y": string;
}

const q = new URLSearchParams(location.search);

// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3;
const component = q.get("component") ?? "badge";
const state = q.get("state") ?? "normal";
const text = q.get("text") ?? q.get("label") ?? "Minecraft";
const native = q.has("native");
const part = q.get("part") ?? "default";

const TextComponentsFixture = () => {
  React.useLayoutEffect(() => {
    document.documentElement.style.background =
      q.get("background") ?? "#202020";
    document.body.style.background = q.get("background") ?? "#202020";
  }, []);

  const [events, setEvents] = React.useState(0);
  const [tag, setTag] = React.useState("");
  const ref = React.useRef<any>(null);
  const width = q.has("wrapWidth") ? Number(q.get("wrapWidth")) : undefined;
  const align = q.get("align") === "center" ? "center" : "left";

  const rich = q.has("rich") ? (
    <strong data-testid="rich">{text}</strong>
  ) : (
    text
  );

  // SAFETY: the existing native-reference stylesheet consumes exactly this finite CSS-variable map; satisfies checks its values before the CSSProperties view is passed to React.
  const common = {
    className: "native-reference-geometry",
    "data-native-height": q.has("height") || undefined,
    "data-native-width": q.has("width") || undefined,
    "data-subject": "true",
    id: "subject",
    onClick: () => {
      setEvents((n) => n + 1);
    },
    ref,
    style: {
      "--reference-x": `${Number(q.get("x") ?? 16) * scale}px`,
      "--reference-y": `${Number(q.get("y") ?? 16) * scale}px`,
      "--reference-width": q.has("width")
        ? `${Number(q.get("width")) * scale}px`
        : undefined,
      "--reference-height": q.has("height")
        ? `${Number(q.get("height")) * scale}px`
        : undefined,
    } satisfies TextReferenceStyle as TextReferenceStyle,
  };

  let subject: React.ReactNode;

  if (component === "empty") {
    subject = native ? (
      part === "title" ? (
        <EmptyTitle {...common} scale={scale} maxWidth={width} align={align}>
          {text}
        </EmptyTitle>
      ) : part === "description" ? (
        <EmptyDescription
          {...common}
          scale={scale}
          maxWidth={width}
          align={align}
        >
          {text}
        </EmptyDescription>
      ) : (
        <Empty {...common} scale={scale}>
          {text}
        </Empty>
      )
    ) : (
      <Empty scale={scale} ref={ref}>
        <EmptyHeader>
          <EmptyMedia>
            <span data-testid="media">*</span>
          </EmptyMedia>
          <EmptyTitle>No worlds found</EmptyTitle>
          <EmptyDescription maxWidth={160}>
            Create a world to begin your adventure.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <button
            type="button"
            onClick={() => {
              setEvents((n) => n + 1);
            }}
          >
            Create world
          </button>
        </EmptyContent>
      </Empty>
    );
  } else if (component === "badge") {
    // SAFETY: the existing native-reference stylesheet consumes exactly this finite CSS-variable map; satisfies checks its values before the CSSProperties view is passed to React.
    subject = (
      <Badge
        render={q.has("asChild") ? <a href="#destination" /> : undefined}
        scale={scale}
        maxWidth={width}
        {...common}
        style={
          native
            ? ({
                "--reference-x": `${(Number(q.get("x") ?? 16) + 8) * scale}px`,
                "--reference-y": `${(Number(q.get("y") ?? 16) + 8) * scale}px`,
                "--reference-width": q.has("width")
                  ? `${(Number(q.get("width")) - 16) * scale}px`
                  : undefined,
                "--reference-height": q.has("height")
                  ? `${(Number(q.get("height")) - 16) * scale}px`
                  : undefined,
              } satisfies TextReferenceStyle as TextReferenceStyle)
            : ({
                "--reference-x": `${Number(q.get("x") ?? 16) * scale}px`,
                "--reference-y": `${Number(q.get("y") ?? 16) * scale}px`,
                "--reference-width": q.has("width")
                  ? `${Number(q.get("width")) * scale}px`
                  : undefined,
                "--reference-height": q.has("height")
                  ? `${Number(q.get("height")) * scale}px`
                  : undefined,
              } satisfies TextReferenceStyle as TextReferenceStyle)
        }
      >
        {rich}
      </Badge>
    );
  } else if (component === "kbd") {
    subject = (
      <Kbd
        scale={scale}
        {...common}
        tabIndex={q.has("tabIndex") || state === "focus" ? 0 : undefined}
        aria-disabled={state.startsWith("disabled") ? true : undefined}
      >
        {rich}
      </Kbd>
    );
  } else if (component === "typography") {
    const parts: Readonly<Partial<Record<string, typeof Typography>>> = {
      blockquote: TypographyBlockquote,
      code: TypographyInlineCode,
      default: Typography,
      h1: TypographyH1,
      h2: TypographyH2,
      h3: TypographyH3,
      h4: TypographyH4,
      large: TypographyLarge,
      lead: TypographyLead,
      muted: TypographyMuted,
      p: TypographyP,
      small: TypographySmall,
    };

    const Component = parts[part] ?? Typography;

    subject = (
      <Component
        render={q.has("asChild") ? <a href="#destination" /> : undefined}
        {...common}
        scale={scale}
        maxWidth={width}
        align={align}
      >
        {rich}
      </Component>
    );
  } else if (component === "breadcrumb" && native) {
    subject =
      part === "page" ? (
        <BreadcrumbPage
          {...common}
          scale={scale}
          maxWidth={width}
          align={align}
        >
          {text}
        </BreadcrumbPage>
      ) : (
        <BreadcrumbLink
          render={q.has("asChild") ? <a /> : undefined}
          {...common}
          scale={scale}
          maxWidth={width}
          align={align}
          href="#destination"
        >
          {text}
        </BreadcrumbLink>
      );
  } else {
    subject = (
      <Breadcrumb scale={scale}>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#home">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<a href="#world" />}>
              {"World"}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage ref={ref}>Current page</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <>
      {subject}
      <button
        type="button"
        id="read-ref"
        className="native-reference-read-ref"
        onClick={() => {
          setTag(ref.current?.tagName ?? "");
        }}
      >
        Read ref
      </button>
      <output id="tag" className="native-reference-tag">
        {tag}
      </output>
      <output id="events" className="native-reference-events">
        {events}
      </output>
      <KbdGroup className="native-reference-hidden">
        <Kbd>Ctrl</Kbd>
        <Kbd>C</Kbd>
      </KbdGroup>
    </>
  );
};

export { TextComponentsFixture };
