"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import * as React from "react";

import { minecraftGlyphs } from "./minecraft-font";
import {
  isMinecraftTextContent,
  minecraftClasses as cn,
  minecraftStyle,
  MinecraftRender,
} from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";
import { minecraftSelectAssets as assets } from "./minecraft-select-assets";
import { selectUnihexAtlas } from "./minecraft-select-atlas";
import { playMinecraftClick } from "./minecraft-sound";
import { MinecraftText } from "./minecraft-text";
import { minecraftTextareaAssets as scrollbar } from "./minecraft-textarea-assets";
import { MinecraftUnicodeLabel } from "./minecraft-unicode-label";
import { getUnihexGlyph, loadUnihex } from "./minecraft-unifont";

import "./minecraft-button.css";
import "./minecraft-select.css";

const ScaleContext = React.createContext<1 | 2 | 3>(2);
const AnchorContext = React.createContext("");

function useElement<T extends HTMLElement>(ref: React.Ref<T> | undefined) {
  const [element, setElement] = React.useState<T | null>(null);

  const callback = React.useCallback(
    (node: T | null) => {
      setElement(node);

      if (typeof ref === "function") {
        const cleanup = ref(node);

        if (typeof cleanup === "function") {
          return () => {
            setElement(null);
            cleanup();
          };
        }
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );

  return [element, callback] as const;
}

function textSkin(children: React.ReactNode): React.ReactNode {
  if (Array.isArray(children)) {
    return children.map((child, index) => (
      <React.Fragment key={index}>{textSkin(child)}</React.Fragment>
    ));
  }

  if (isMinecraftTextContent(children)) {
    const text = String(children);

    return /^[\u0020-\u007E]*$/u.test(text) ? (
      <MinecraftText>{text}</MinecraftText>
    ) : (
      <MinecraftUnicodeLabel text={text} atlas={selectUnihexAtlas} />
    );
  }

  return children;
}

const Select = <Value = string, Multiple extends boolean = false>({
  scale = 2,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: MinecraftProps<typeof SelectPrimitive.Root<Value, Multiple>> & {
  scale?: 1 | 2 | 3;
}) => {
  const anchorId = React.useId();
  const [localOpen, setLocalOpen] = React.useState(defaultOpen ?? false);
  const actualOpen = open ?? localOpen;

  const previous = React.useRef(actualOpen);
  const requested = React.useRef(false);

  React.useEffect(() => {
    if (actualOpen && !previous.current && requested.current) {
      playMinecraftClick();
    }

    previous.current = actualOpen;
    requested.current = false;
  }, [actualOpen]);

  return (
    <ScaleContext.Provider value={scale}>
      <AnchorContext.Provider value={anchorId}>
        <SelectPrimitive.Root<Value, Multiple>
          open={actualOpen}
          onOpenChange={(next, details) => {
            onOpenChange?.(next, details);

            if (details.isCanceled) {
              requested.current = false;

              return;
            }

            requested.current = next;

            if (open === undefined) {
              setLocalOpen(next);
            }
          }}
          {...props}
        />
      </AnchorContext.Provider>
    </ScaleContext.Provider>
  );
};

const SelectGroup = (props: MinecraftProps<typeof SelectPrimitive.Group>) => (
  <SelectPrimitive.Group data-slot="select-group" {...props} />
);

const SelectValue = ({
  children,
  placeholder,
  render,
  ...props
}: MinecraftProps<typeof SelectPrimitive.Value>) => {
  const artworkRender: NonNullable<SelectPrimitive.Value.Props["render"]> = (
    elementProps,
    state
  ) => {
    const painted = {
      ...elementProps,
      children: textSkin(elementProps.children),
    };

    if (typeof render === "function") {
      return render(painted, state);
    }

    return render ? (
      <MinecraftRender as="span" render={render} {...painted} />
    ) : (
      <span {...painted} />
    );
  };

  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      render={artworkRender}
      placeholder={textSkin(placeholder)}
      {...props}
    >
      {children === undefined
        ? undefined
        : typeof children === "function"
          ? (value): React.ReactNode => textSkin(children(value))
          : textSkin(children)}
    </SelectPrimitive.Value>
  );
};

type SelectTriggerProps = MinecraftProps<typeof SelectPrimitive.Trigger> & {
  size?: "default";
};

const SelectTrigger = ({
  children,
  className,
  size = "default",
  style,
  ref,
  render,
  ...props
}: SelectTriggerProps) => {
  if (size !== "default") {
    throw new Error(
      "Minecraft cycle buttons support the default visual size only"
    );
  }

  const scale = React.useContext(ScaleContext);
  const anchorId = React.useContext(AnchorContext);
  const [element, forwarded] = useElement(ref);

  React.useLayoutEffect(() => {
    if (!element) {
      return;
    }

    let frame = 0,
      loading = false,
      stopped = false;

    const measure = () => {
      const label = element.querySelector<HTMLElement>(
        ".mc-select-trigger-label"
      )!;

      const text = label.textContent ?? "";

      if (/[^\u0000-\u007F]/u.test(text) && !loading) {
        loading = true;
        void loadUnihex().then(() => {
          if (!stopped) {
            element.dataset.mcSelectReady = "false";
          }
        });
      }

      const width = Math.floor(element.clientWidth / scale);

      const textWidth = Math.ceil(
        [...text].reduce(
          (sum, char) =>
            sum +
            (minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ??
              getUnihexGlyph(char)?.advance ??
              6),
          0
        )
      );

      const available = width - 4;
      const overflow = textWidth - available;

      let x = Math.floor(width / 2) - Math.floor(textWidth / 2);

      if (overflow > 0) {
        const period = Math.max(overflow * 0.5, 3);

        const phase =
          Math.sin(
            (Math.PI / 2) *
              Math.cos((2 * Math.PI * (Date.now() / 1000)) / period)
          ) /
            2 +
          0.5;

        x = 2 - Math.trunc(phase * overflow);
      }

      element.style.setProperty("--mc-select-label-x", `${(x - 2) * scale}px`);
      element.dataset.mcSelectReady = "true";
      frame = requestAnimationFrame(measure);
    };

    measure();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, [element, scale]);

  const contents = (
    <>
      <span className="mc-button-surface" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} />
        ))}
      </span>
      <span className="mc-select-trigger-window">
        <span className="mc-select-trigger-label">{textSkin(children)}</span>
      </span>
    </>
  );

  return (
    <SelectPrimitive.Trigger
      render={render}
      data-slot="select-trigger"
      data-mc-select-anchor={anchorId}
      data-size={size}
      ref={forwarded}
      className={cn(`mc-button mc-select-trigger`, className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
      )}
      {...props}
    >
      {contents}
    </SelectPrimitive.Trigger>
  );
};

interface ContentContext {
  scale: number;
  viewport: HTMLDivElement | null;
}

const ListContext = React.createContext<ContentContext>({
  scale: 2,
  viewport: null,
});

const SelectContent = ({
  children,
  className,
  style,
  align = "start",
  sideOffset,
  collisionPadding = 10,
  ref,
  render,
  side = "bottom",
  alignOffset,
  collisionBoundary,
  collisionAvoidance,
  alignItemWithTrigger = true,
  keepMounted,
  ...props
}: MinecraftProps<typeof SelectPrimitive.Popup> &
  (Pick<
    MinecraftProps<typeof SelectPrimitive.Positioner>,
    | "side"
    | "align"
    | "sideOffset"
    | "alignOffset"
    | "collisionPadding"
    | "collisionBoundary"
    | "collisionAvoidance"
    | "alignItemWithTrigger"
  > & {
    keepMounted?: boolean;
  })) => {
  const scale = React.useContext(ScaleContext);
  const anchorId = React.useContext(AnchorContext);
  const [element, forwarded] = useElement(ref);

  const [viewport, setViewport] = React.useState<HTMLDivElement | null>(null);
  React.useLayoutEffect(() => {
    if (!element || !viewport) {
      return;
    }

    let frame = 0,
      placed = "",
      placedHeight = "",
      placedTop = "";

    const measure = () => {
      const width = Math.floor(viewport.clientWidth / scale);
      const height = viewport.clientHeight / scale;
      const content = viewport.scrollHeight / scale;

      const rowWidth = width >= 270 ? 270 : Math.max(0, width - 30);
      const maximum = Math.max(0, content - height);

      const thumb = Math.min(
        height - 8,
        Math.max(
          32,
          Math.trunc(
            Math.fround(Math.fround(height * height) / Math.fround(content))
          )
        )
      );

      element.style.setProperty(
        "--mc-select-row-left",
        `${(Math.floor(width / 2) - Math.floor(rowWidth / 2)) * scale}px`
      );
      element.style.setProperty(
        "--mc-select-row-width",
        `${rowWidth * scale}px`
      );
      element.style.setProperty(
        "--mc-select-label-center",
        `${Math.floor(rowWidth / 2) * scale}px`
      );
      element.style.setProperty(
        "--mc-select-bar-x",
        `${(width >= 270 ? Math.floor(width / 2) + 143 : width - 7) * scale}px`
      );
      element.style.setProperty(
        "--mc-select-thumb-height",
        `${thumb * scale}px`
      );
      element.style.setProperty(
        "--mc-select-thumb-y",
        `${maximum > 0 ? Math.floor((Math.floor(viewport.scrollTop / scale) * (height - thumb)) / maximum) * scale : 0}px`
      );
      element.dataset.mcSelectScrollable = String(maximum > 0);
      element.dataset.mcSelectReady = "true";
      frame = requestAnimationFrame(measure);
    };

    measure();

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [element, viewport, scale, alignItemWithTrigger, anchorId]);

  const contents = (
    <>
      <SelectPrimitive.List
        data-slot="select-viewport"
        ref={setViewport}
        className="mc-select-viewport"
        onScroll={(event) => {
          // Fixed-height Minecraft lists retain their viewport; item alignment uses Base UI expansion.
          if (!alignItemWithTrigger) {
            event.preventDefault();
          }

          const node = event.currentTarget;
          const integer = Math.floor(node.scrollTop / scale) * scale;

          if (node.scrollTop !== integer) {
            node.scrollTop = integer;
          }
        }}
      >
        {children}
      </SelectPrimitive.List>
      <SelectScrollbar />
    </>
  );

  return (
    <SelectPrimitive.Portal>
      <ListContext.Provider value={{ scale, viewport }}>
        <SelectPrimitive.Positioner
          data-mc-positioner=""
          style={{ zIndex: 50 }}
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          collisionPadding={collisionPadding}
          collisionBoundary={collisionBoundary}
          collisionAvoidance={collisionAvoidance}
          alignItemWithTrigger={alignItemWithTrigger}
        >
          <SelectPrimitive.Popup
            render={render}
            data-slot="select-content"
            data-align-trigger={alignItemWithTrigger}
            ref={forwarded}
            className={cn(`mc-select-content`, className)}
            style={minecraftStyle(
              style,
              (__style) =>
                ({
                  "--mc-scale": scale,
                  "--mc-select-background": assets.menu_list_background,
                  "--mc-select-footer": assets.footer_separator,
                  "--mc-select-header": assets.header_separator,
                  "--mc-select-thumb": `url("${scrollbar.scroller}")`,
                  "--mc-select-track": `url("${scrollbar.scroller_background}")`,
                  ...__style,
                }) as React.CSSProperties
            )}
            {...props}
          >
            {contents}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </ListContext.Provider>
    </SelectPrimitive.Portal>
  );
};

const SelectScrollbar = () => {
  const { viewport, scale } = React.useContext(ListContext);

  const drag = React.useRef<{
    y: number;
    top: number;
  } | null>(null);

  return (
    <div
      className="mc-select-scrollbar"
      aria-hidden="true"
      onPointerDown={(event) => {
        if (!viewport) {
          return;
        }

        event.preventDefault();

        const rect = event.currentTarget.getBoundingClientRect();
        const content = viewport.scrollHeight / scale;
        const height = viewport.clientHeight / scale;

        const thumb = Math.min(
          height - 8,
          Math.max(
            32,
            Math.trunc(
              Math.fround(Math.fround(height * height) / Math.fround(content))
            )
          )
        );

        const offset = Math.floor(
          (Math.floor(viewport.scrollTop / scale) * (height - thumb)) /
            (content - height)
        );

        const y = (event.clientY - rect.top) / scale;
        drag.current = { top: viewport.scrollTop, y: event.clientY };

        if (y < offset || y > offset + thumb) {
          viewport.scrollTop =
            Math.floor(
              (Math.max(0, y - thumb / 2) * (content - height)) /
                (height - thumb)
            ) * scale;
          drag.current.top = viewport.scrollTop;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!viewport || !drag.current) {
          return;
        }

        const content = viewport.scrollHeight / scale;
        const height = viewport.clientHeight / scale;

        const thumb = Math.min(
          height - 8,
          Math.max(
            32,
            Math.trunc(
              Math.fround(Math.fround(height * height) / Math.fround(content))
            )
          )
        );

        viewport.scrollTop =
          Math.floor(
            (drag.current.top +
              ((event.clientY - drag.current.y) * (content - height)) /
                (height - thumb)) /
              scale
          ) * scale;
      }}
      onPointerUp={(event) => {
        drag.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
    >
      <span />
    </div>
  );
};

const SelectItem = ({
  children,
  className,
  render,
  ...props
}: MinecraftProps<typeof SelectPrimitive.Item>) => {
  const contents = (
    <span className="mc-select-item-label">
      <SelectPrimitive.ItemText>{textSkin(children)}</SelectPrimitive.ItemText>
    </span>
  );

  return (
    <SelectPrimitive.Item
      render={render}
      data-slot="select-item"
      className={cn(`mc-select-item`, className)}
      {...props}
    >
      {contents}
    </SelectPrimitive.Item>
  );
};

const SelectLabel = ({
  children,
  className,
  ...props
}: MinecraftProps<typeof SelectPrimitive.GroupLabel>) => (
  <SelectPrimitive.GroupLabel
    data-slot="select-label"
    className={cn(`mc-select-label`, className)}
    {...props}
  >
    {textSkin(children)}
  </SelectPrimitive.GroupLabel>
);

const SelectSeparator = ({
  className,
  style,
  ...props
}: MinecraftProps<typeof SelectPrimitive.Separator>) => (
  <SelectPrimitive.Separator
    data-slot="select-separator"
    className={cn(`mc-select-separator`, className)}
    style={minecraftStyle(style, (__style) => ({
      backgroundImage: assets.footer_separator,
      ...__style,
    }))}
    {...props}
  />
);

function scrollButtonContents(children: React.ReactNode) {
  return (
    <>
      <span className="mc-button-surface" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} />
        ))}
      </span>
      <span className="mc-button-label">{textSkin(children)}</span>
    </>
  );
}

const SelectScrollUpButton = ({
  children = "^",
  className,
  ...props
}: MinecraftProps<typeof SelectPrimitive.ScrollUpArrow>) => (
  <SelectPrimitive.ScrollUpArrow
    data-slot="select-scroll-up-button"
    className={cn(`mc-button mc-select-scroll-button`, className)}
    {...props}
  >
    {scrollButtonContents(children)}
  </SelectPrimitive.ScrollUpArrow>
);

const SelectScrollDownButton = ({
  children = "v",
  className,
  ...props
}: MinecraftProps<typeof SelectPrimitive.ScrollDownArrow>) => (
  <SelectPrimitive.ScrollDownArrow
    data-slot="select-scroll-down-button"
    className={cn(`mc-button mc-select-scroll-button`, className)}
    {...props}
  >
    {scrollButtonContents(children)}
  </SelectPrimitive.ScrollDownArrow>
);

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};

export type { SelectTriggerProps };
