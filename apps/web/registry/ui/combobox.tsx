"use client";

import { Combobox as Primitive } from "@base-ui/react";
import * as React from "react";

import { Button } from "./button";
import { Input } from "./input";
import { minecraftCardSprite } from "./minecraft-card-sprite";
import { MenuScaleContext, menuTextNodes } from "./minecraft-menu-text";
import { isMinecraftClassResolver, minecraftStyle } from "./minecraft-render";
import { MinecraftSurface } from "./minecraft-surface";
import { Separator } from "./separator";

import "./minecraft-menu.css";
import "./minecraft-combobox.css";

interface OwnedComboboxStyle extends React.CSSProperties {
  "--mc-z-combobox-paint-1-width"?: string;
}

interface ComboboxLayoutStyle1 extends React.CSSProperties {
  "--mc-dynamic-combobox-1-width": number;
}

interface ComboboxLayoutStyle2 extends React.CSSProperties {
  "--mc-dynamic-combobox-2-width": number;
}

interface ComboboxLayoutStyle3 extends React.CSSProperties {
  "--mc-dynamic-combobox-3-width": number;
}

type Scale = 1 | 2 | 3;

interface ComboboxScaleStyle extends React.CSSProperties {
  "--mc-scale": Scale;
}

const classes = function classes<S>(
  base: string,
  value?: string | ((state: S) => string | undefined)
) {
  return isMinecraftClassResolver(value)
    ? (state: S) => `${base} ${value(state) ?? ""}`
    : `${base} ${value ?? ""}`;
};

const Combobox = <
  Value,
  Multiple extends boolean | undefined = false,
  Item = Value,
>({
  scale = 2,
  ...props
}: Primitive.Root.Props<Value, Multiple, Item> & { scale?: Scale }) => (
  <MenuScaleContext.Provider value={scale}>
    <Primitive.Root {...props} />
  </MenuScaleContext.Provider>
);

const ComboboxValue = ({
  children,
  placeholder,
  ...props
}: Primitive.Value.Props) => {
  const renderedPlaceholder = menuTextNodes(placeholder);
  let content: Primitive.Value.Props["children"];

  if (typeof children === "function") {
    content = (value) => menuTextNodes(children(value));
  } else if (children !== undefined && children !== null) {
    content = menuTextNodes(children);
  }

  return (
    <Primitive.Value {...props} placeholder={renderedPlaceholder}>
      {content}
    </Primitive.Value>
  );
};

const ComboboxTrigger = ({
  className,
  render,
  children,
  ...props
}: Primitive.Trigger.Props) => {
  const scale = React.useContext(MenuScaleContext);

  return (
    <Primitive.Trigger
      data-slot="combobox-trigger"
      className={classes("mc-combobox-trigger", className)}
      render={
        render ?? (
          <Button
            scale={scale}
            className="mc-dynamic-layout-combobox-1"
            style={
              /* SAFETY: The owned mc-dynamic-layout-combobox-1 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
              {
                "--mc-dynamic-combobox-1-width": 20 * scale,
              } satisfies ComboboxLayoutStyle1 as ComboboxLayoutStyle1
            }
          />
        )
      }
      {...props}
    >
      {children ?? "..."}
    </Primitive.Trigger>
  );
};

const ComboboxClear = ({
  className,
  render,
  children,
  ...props
}: Primitive.Clear.Props) => {
  const scale = React.useContext(MenuScaleContext);

  return (
    <Primitive.Clear
      data-slot="combobox-clear"
      aria-label="Clear selection"
      className={classes("mc-combobox-clear", className)}
      render={
        render ?? (
          <Button
            scale={scale}
            className="mc-dynamic-layout-combobox-2"
            style={
              /* SAFETY: The owned mc-dynamic-layout-combobox-2 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
              {
                "--mc-dynamic-combobox-2-width": 20 * scale,
              } satisfies ComboboxLayoutStyle2 as ComboboxLayoutStyle2
            }
          />
        )
      }
      {...props}
    >
      {children ?? "X"}
    </Primitive.Clear>
  );
};

const ComboboxInput = ({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  scale: explicit,
  render,
  spellCheck = false,
  autoCorrect = "off",
  ...props
}: Primitive.Input.Props & {
  showTrigger?: boolean;
  showClear?: boolean;
  scale?: Scale;
}) => {
  const inherited = React.useContext(MenuScaleContext);
  const scale = explicit ?? inherited;

  return (
    <MenuScaleContext.Provider value={scale}>
      <div
        data-slot="combobox-input-group"
        className="mc-combobox-input-group"
        style={
          // SAFETY: --mc-scale is this owner's CSS custom-property channel; this CSSProperties view passes the exact owned variable map to React without changing its values.
          {
            "--mc-scale": scale,
          } as React.CSSProperties
        }
      >
        <Primitive.Input
          data-slot="combobox-input"
          disabled={disabled}
          spellCheck={spellCheck}
          autoCorrect={autoCorrect}
          render={render ?? <Input scale={scale} />}
          className={classes("mc-combobox-input", className)}
          {...props}
        />
        {showTrigger && (
          <ComboboxTrigger aria-label="Show options" disabled={disabled} />
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
        {children}
      </div>
    </MenuScaleContext.Provider>
  );
};

const ComboboxContent = ({
  className,
  side = "bottom",
  sideOffset = 0,
  align = "start",
  alignOffset = 0,
  anchor,
  scale: explicit,
  style,
  children,
  ...props
}: Primitive.Popup.Props &
  Pick<
    Primitive.Positioner.Props,
    "side" | "sideOffset" | "align" | "alignOffset" | "anchor"
  > & { scale?: Scale }) => {
  const inherited = React.useContext(MenuScaleContext);
  const scale = explicit ?? inherited;

  return (
    <MenuScaleContext.Provider value={scale}>
      <Primitive.Portal>
        <Primitive.Positioner
          side={side}
          sideOffset={sideOffset}
          align={align}
          alignOffset={alignOffset}
          anchor={anchor}
          className="mc-combobox-positioner"
        >
          <Primitive.Popup
            data-slot="combobox-content"
            className={classes("mc-combobox-content", className)}
            style={minecraftStyle(style, (__style): ComboboxScaleStyle => ({
              "--mc-scale": scale,
              ...__style,
            }))}
            {...props}
          >
            {children}
          </Primitive.Popup>
        </Primitive.Positioner>
      </Primitive.Portal>
    </MenuScaleContext.Provider>
  );
};

const ComboboxList = ({
  className,
  children,
  style,
  ref,
  surface = "suggestions",
  ...props
}: Primitive.List.Props & { surface?: "suggestions" | "popup" }) => {
  const scale = React.useContext(MenuScaleContext);
  const node = React.useRef<HTMLDivElement>(null);

  React.useImperativeHandle<typeof node.current, typeof node.current>(
    ref,
    () => node.current,
    []
  );
  React.useLayoutEffect(() => {
    const element = node.current!;
    const items = element.querySelector<HTMLElement>(".mc-menu-items")!;

    let frame = 0;

    const measure = () => {
      if (!element.clientWidth || !element.clientHeight) {
        return;
      }

      const max = Math.max(0, element.scrollHeight - element.clientHeight);
      element.dataset.mcMenuScrollable = String(max > 0.5);
      element.dataset.mcMenuAbove = String(element.scrollTop > 0.5);
      element.dataset.mcMenuBelow = String(element.scrollTop < max - 0.5);

      const padding =
        // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
        Number.parseFloat(getComputedStyle(element).paddingTop) +
        // oxlint-disable-next-line unicorn/prefer-number-coercion -- CSS lengths intentionally retain unit suffixes; parseFloat extracts the numeric prefix while Number would reject px values.
        Number.parseFloat(getComputedStyle(element).paddingBottom);

      for (const [key, value] of Object.entries({
        "--mc-menu-clip-bottom": `${Math.max(0, items.offsetHeight - element.scrollTop - (element.clientHeight - padding))}px`,
        "--mc-menu-clip-top": `${element.scrollTop}px`,
        "--mc-menu-frame-height": `${element.clientHeight}px`,
        "--mc-menu-scroll-px": `${element.scrollTop}px`,
      })) {
        if (element.style.getPropertyValue(key) !== value) {
          element.style.setProperty(key, value);
        }
      }

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.dataset.mcMenuReady = "true";
      });
    };

    const resize = new ResizeObserver(measure);
    const mutation = new MutationObserver(measure);

    resize.observe(element);
    resize.observe(items);
    mutation.observe(items, {
      attributeFilter: ["hidden"],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    element.addEventListener("scroll", measure, { passive: true });
    measure();

    return () => {
      resize.disconnect();
      mutation.disconnect();
      element.removeEventListener("scroll", measure);
      cancelAnimationFrame(frame);
    };
  }, [scale, surface]);

  return (
    <Primitive.List
      data-slot="combobox-list"
      data-surface={surface}
      ref={node}
      className={classes("mc-menu-content mc-combobox-list", className)}
      style={minecraftStyle(style, (__style): ComboboxScaleStyle => ({
        "--mc-scale": scale,
        ...__style,
      }))}
      {...props}
    >
      {surface === "popup" && (
        <span className="mc-menu-background" aria-hidden="true">
          <MinecraftSurface sprite={minecraftCardSprite} />
        </span>
      )}
      <div className="mc-menu-items">
        {typeof children === "function" ? (
          <Primitive.Collection>{children}</Primitive.Collection>
        ) : (
          children
        )}
      </div>
      <span
        className="mc-menu-scroll-hint"
        data-edge="top"
        aria-hidden="true"
      />
      <span
        className="mc-menu-scroll-hint"
        data-edge="bottom"
        aria-hidden="true"
      />
    </Primitive.List>
  );
};

const ComboboxItem = ({
  className,
  children,
  ...props
}: Primitive.Item.Props) => (
  <Primitive.Item
    data-slot="combobox-item"
    className={classes("mc-menu-item mc-combobox-item", className)}
    {...props}
  >
    {menuTextNodes(children)}
    <Primitive.ItemIndicator
      data-slot="combobox-item-indicator"
      className="mc-combobox-item-indicator"
    />
  </Primitive.Item>
);

const ComboboxGroup = ({ className, ...props }: Primitive.Group.Props) => (
  <Primitive.Group
    data-slot="combobox-group"
    className={classes("mc-combobox-group", className)}
    {...props}
  />
);

const ComboboxLabel = ({
  className,
  children,
  ...props
}: Primitive.GroupLabel.Props) => (
  <Primitive.GroupLabel
    data-slot="combobox-label"
    className={classes("mc-menu-label mc-combobox-label", className)}
    {...props}
  >
    {menuTextNodes(children)}
  </Primitive.GroupLabel>
);

const ComboboxCollection = (props: Primitive.Collection.Props) => (
  <Primitive.Collection {...props} />
);

const ComboboxEmpty = ({
  className,
  children,
  ...props
}: Primitive.Empty.Props) => (
  <Primitive.Empty
    data-slot="combobox-empty"
    className={classes("mc-combobox-empty", className)}
    {...props}
  >
    {menuTextNodes(children)}
  </Primitive.Empty>
);

const ComboboxSeparator = ({
  className,
  ...props
}: Primitive.Separator.Props) => {
  const scale = React.useContext(MenuScaleContext);

  return (
    <Primitive.Separator
      data-slot="combobox-separator"
      className={classes("mc-combobox-separator", className)}
      {...props}
    >
      <Separator scale={scale} />
    </Primitive.Separator>
  );
};

const ComboboxChips = ({
  className,
  style,
  ...props
}: Primitive.Chips.Props) => {
  const scale = React.useContext(MenuScaleContext);

  return (
    <Primitive.Chips
      data-slot="combobox-chips"
      className={classes("mc-combobox-chips", className)}
      style={minecraftStyle(style, (__style): ComboboxScaleStyle => ({
        "--mc-scale": scale,
        ...__style,
      }))}
      {...props}
    />
  );
};

const ComboboxChipRemove = ({
  className,
  render,
  children,
  ...props
}: Primitive.ChipRemove.Props) => {
  const scale = React.useContext(MenuScaleContext);

  return (
    <Primitive.ChipRemove
      data-slot="combobox-chip-remove"
      aria-label="Remove selection"
      className={classes("mc-combobox-chip-remove", className)}
      render={
        render ?? (
          <Button
            scale={scale}
            className="mc-dynamic-layout-combobox-3"
            style={
              /* SAFETY: The owned mc-dynamic-layout-combobox-3 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
              {
                "--mc-dynamic-combobox-3-width": 20 * scale,
              } satisfies ComboboxLayoutStyle3 as ComboboxLayoutStyle3
            }
          />
        )
      }
      {...props}
    >
      {children ?? "X"}
    </Primitive.ChipRemove>
  );
};

const ComboboxChip = ({
  className,
  children,
  showRemove = true,
  ...props
}: Primitive.Chip.Props & { showRemove?: boolean }) => (
  <Primitive.Chip
    data-slot="combobox-chip"
    className={classes("mc-combobox-chip", className)}
    {...props}
  >
    {menuTextNodes(children)}
    {showRemove && <ComboboxChipRemove />}
  </Primitive.Chip>
);

const ComboboxChipsInput = ({
  className,
  render,
  spellCheck = false,
  autoCorrect = "off",
  ...props
}: Primitive.Input.Props) => {
  const scale = React.useContext(MenuScaleContext);

  const ownedStyle1: OwnedComboboxStyle = {
    "--mc-z-combobox-paint-1-width": `${80 * scale}px`,
  };

  return (
    <Primitive.Input
      data-slot="combobox-chip-input"
      render={
        render ?? (
          <Input
            scale={scale}
            className="mc-owned-paint-combobox-1 [border:0]"
            style={ownedStyle1}
          />
        )
      }
      spellCheck={spellCheck}
      autoCorrect={autoCorrect}
      className={classes("mc-combobox-chip-input", className)}
      {...props}
    />
  );
};

const useComboboxAnchor = function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
};

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
  ComboboxClear,
  ComboboxChipRemove,
};
