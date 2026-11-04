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

import { fixtureFallbackLabel } from "./utils";

import "./native-reference.css";

interface TextReferenceStyle extends React.CSSProperties {
  "--reference-height": string | undefined;
  "--reference-width": string | undefined;
  "--reference-x": string;
  "--reference-y": string;
}

const q = new URLSearchParams(location.search);

// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale =
  // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
  Number(q.get("scale") ?? 2) as 1 | 2 | 3;

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
  const ref = React.useRef<Element>(null);

  const subjectRef = React.useCallback((node: Element | null) => {
    ref.current = node;
  }, []);

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
    ref: subjectRef,
    style: {
      "--reference-height": q.has("height")
        ? `${Number(q.get("height")) * scale}px`
        : undefined,
      "--reference-width": q.has("width")
        ? `${Number(q.get("width")) * scale}px`
        : undefined,
      "--reference-x": `${Number(q.get("x") ?? 16) * scale}px`,
      "--reference-y": `${Number(q.get("y") ?? 16) * scale}px`,
    } satisfies TextReferenceStyle as TextReferenceStyle,
  };

  const renderTextEmptyScenario = () => {
    if (native) {
      if (part === "title") {
        return (
          <EmptyTitle {...common} scale={scale} maxWidth={width} align={align}>
            {text}
          </EmptyTitle>
        );
      } else if (part === "description") {
        return (
          <EmptyDescription
            {...common}
            scale={scale}
            maxWidth={width}
            align={align}
          >
            {text}
          </EmptyDescription>
        );
      }

      return (
        <Empty {...common} scale={scale}>
          {text}
        </Empty>
      );
    }

    return (
      <Empty scale={scale} ref={subjectRef}>
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
  };

  const renderTextBadgeScenario = () => (
    // SAFETY: the existing native-reference stylesheet consumes exactly this finite CSS-variable map; satisfies checks its values before the CSSProperties view is passed to React.
    <Badge
      render={
        q.has("asChild") ? (
          <a
            href="#destination"
            aria-label={fixtureFallbackLabel("Text example", text)}
          />
        ) : undefined
      }
      scale={scale}
      maxWidth={width}
      {...common}
      style={
        native
          ? ({
              "--reference-height": q.has("height")
                ? `${(Number(q.get("height")) - 16) * scale}px`
                : undefined,
              "--reference-width": q.has("width")
                ? `${(Number(q.get("width")) - 16) * scale}px`
                : undefined,
              "--reference-x": `${(Number(q.get("x") ?? 16) + 8) * scale}px`,
              "--reference-y": `${(Number(q.get("y") ?? 16) + 8) * scale}px`,
            } satisfies TextReferenceStyle as TextReferenceStyle)
          : ({
              "--reference-height": q.has("height")
                ? `${Number(q.get("height")) * scale}px`
                : undefined,
              "--reference-width": q.has("width")
                ? `${Number(q.get("width")) * scale}px`
                : undefined,
              "--reference-x": `${Number(q.get("x") ?? 16) * scale}px`,
              "--reference-y": `${Number(q.get("y") ?? 16) * scale}px`,
            } satisfies TextReferenceStyle as TextReferenceStyle)
      }
    >
      {rich}
    </Badge>
  );

  const renderTextKbdScenario = () => (
    <Kbd
      scale={scale}
      {...common}
      tabIndex={q.has("tabIndex") || state === "focus" ? 0 : undefined}
      aria-disabled={state.startsWith("disabled") ? true : undefined}
    >
      {rich}
    </Kbd>
  );

  const renderTextTypographyScenario = () => {
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

    return (
      <Component
        render={
          q.has("asChild") ? (
            <a
              href="#destination"
              aria-label={fixtureFallbackLabel("Text example", text)}
            />
          ) : undefined
        }
        {...common}
        scale={scale}
        maxWidth={width}
        align={align}
      >
        {rich}
      </Component>
    );
  };

  const renderTextNativeBreadcrumbScenario = () =>
    part === "page" ? (
      <BreadcrumbPage {...common} scale={scale} maxWidth={width} align={align}>
        {text}
      </BreadcrumbPage>
    ) : (
      <BreadcrumbLink
        render={
          q.has("asChild") ? (
            // oxlint-disable-next-line jsx-a11y/anchor-has-content -- The owned asChild probes supply Continue or World through BreadcrumbLink children; preserve this empty render receiver so those real forwarding assertions stay meaningful.
            <a />
          ) : undefined
        }
        {...common}
        scale={scale}
        maxWidth={width}
        align={align}
        href="#destination"
      >
        {text}
      </BreadcrumbLink>
    );

  const renderTextBreadcrumbScenario = () => (
    <Breadcrumb scale={scale}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#home">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink
            render={
              // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- BreadcrumbLink supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
              <a href="#world" />
            }
          >
            World
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage ref={subjectRef}>Current page</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

  let subject: React.ReactNode;

  if (component === "empty") {
    subject = renderTextEmptyScenario();
  } else if (component === "badge") {
    subject = renderTextBadgeScenario();
  } else if (component === "kbd") {
    subject = renderTextKbdScenario();
  } else if (component === "typography") {
    subject = renderTextTypographyScenario();
  } else if (component === "breadcrumb" && native) {
    subject = renderTextNativeBreadcrumbScenario();
  } else {
    subject = renderTextBreadcrumbScenario();
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
