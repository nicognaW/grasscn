"use client";
import * as React from "react";
import { Combobox as Primitive } from "@base-ui/react";
import { Input } from "./input";
import { Button } from "./button";
import { Separator } from "./separator";
import {
  MenuScaleContext,
  MinecraftMenuText,
  menuTextNodes,
} from "./minecraft-menu-text";
import { MinecraftSurface } from "./minecraft-surface";
import { minecraftCardSprite } from "./minecraft-card-sprite";
import "./minecraft-menu.css";
import "./minecraft-combobox.css";
type Scale = 1 | 2 | 3;
function classes<S>(
  base: string,
  value?: string | ((state: S) => string | undefined),
) {
  return typeof value === "function"
    ? (state: S) => `${base} ${value(state) ?? ""}`
    : `${base} ${value ?? ""}`;
}
function scaled<S>(
  scale: Scale,
  style?: React.CSSProperties | ((state: S) => React.CSSProperties | undefined),
) {
  const merge = (value?: React.CSSProperties) =>
    ({ "--mc-scale": scale, ...value }) as React.CSSProperties;
  return typeof style === "function"
    ? (state: S) => merge(style(state))
    : merge(style);
}
function Combobox<
  Value,
  Multiple extends boolean | undefined = false,
  Item = Value,
>({
  scale = 2,
  ...props
}: Primitive.Root.Props<Value, Multiple, Item> & { scale?: Scale }) {
  return (
    <MenuScaleContext.Provider value={scale}>
      <Primitive.Root {...props} />
    </MenuScaleContext.Provider>
  );
}
function ComboboxValue({
  children,
  placeholder,
  ...props
}: Primitive.Value.Props) {
  return (
    <Primitive.Value {...props} placeholder={menuTextNodes(placeholder)}>
      {typeof children === "function"
        ? (value) => menuTextNodes(children(value))
        : children == null
          ? undefined
          : menuTextNodes(children)}
    </Primitive.Value>
  );
}
function ComboboxTrigger({
  className,
  render,
  children,
  ...props
}: Primitive.Trigger.Props) {
  const scale = React.useContext(MenuScaleContext);
  return (
    <Primitive.Trigger
      data-slot="combobox-trigger"
      className={classes("mc-combobox-trigger", className)}
      render={render ?? <Button scale={scale} style={{ width: 20 * scale }} />}
      {...props}
    >
      {children ?? "..."}
    </Primitive.Trigger>
  );
}
function ComboboxClear({
  className,
  render,
  children,
  ...props
}: Primitive.Clear.Props) {
  const scale = React.useContext(MenuScaleContext);
  return (
    <Primitive.Clear
      data-slot="combobox-clear"
      aria-label="Clear selection"
      className={classes("mc-combobox-clear", className)}
      render={render ?? <Button scale={scale} style={{ width: 20 * scale }} />}
      {...props}
    >
      {children ?? "X"}
    </Primitive.Clear>
  );
}
function ComboboxInput({
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
}) {
  const inherited = React.useContext(MenuScaleContext),
    scale = explicit ?? inherited;
  return (
    <MenuScaleContext.Provider value={scale}>
      <div
        data-slot="combobox-input-group"
        className="mc-combobox-input-group"
        style={{ "--mc-scale": scale } as React.CSSProperties}
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
}
function ComboboxContent({
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
  > & { scale?: Scale }) {
  const inherited = React.useContext(MenuScaleContext),
    scale = explicit ?? inherited;
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
            style={scaled(scale, style)}
            {...props}
          >
            {children}
          </Primitive.Popup>
        </Primitive.Positioner>
      </Primitive.Portal>
    </MenuScaleContext.Provider>
  );
}
function ComboboxList({
  className,
  children,
  style,
  ref,
  surface = "suggestions",
  ...props
}: Primitive.List.Props & { surface?: "suggestions" | "popup" }) {
  const scale = React.useContext(MenuScaleContext),
    node = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => node.current!, []);
  React.useLayoutEffect(() => {
    const element = node.current!,
      items = element.querySelector<HTMLElement>(".mc-menu-items")!;
    let frame = 0;
    const measure = () => {
      if (!element.clientWidth || !element.clientHeight) return;
      const max = Math.max(0, element.scrollHeight - element.clientHeight);
      element.dataset.mcMenuScrollable = String(max > 0.5);
      element.dataset.mcMenuAbove = String(element.scrollTop > 0.5);
      element.dataset.mcMenuBelow = String(element.scrollTop < max - 0.5);
      const padding =
        parseFloat(getComputedStyle(element).paddingTop) +
        parseFloat(getComputedStyle(element).paddingBottom);
      for (const [key, value] of Object.entries({
        "--mc-menu-scroll-px": `${element.scrollTop}px`,
        "--mc-menu-frame-height": `${element.clientHeight}px`,
        "--mc-menu-clip-top": `${element.scrollTop}px`,
        "--mc-menu-clip-bottom": `${Math.max(0, items.offsetHeight - element.scrollTop - (element.clientHeight - padding))}px`,
      }))
        if (element.style.getPropertyValue(key) !== value)
          element.style.setProperty(key, value);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.dataset.mcMenuReady = "true";
      });
    };
    const resize = new ResizeObserver(measure),
      mutation = new MutationObserver(measure);
    resize.observe(element);
    resize.observe(items);
    mutation.observe(items, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["hidden"],
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
      style={scaled(scale, style)}
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
}
function ComboboxItem({ className, children, ...props }: Primitive.Item.Props) {
  return (
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
}
function ComboboxGroup({ className, ...props }: Primitive.Group.Props) {
  return (
    <Primitive.Group
      data-slot="combobox-group"
      className={classes("mc-combobox-group", className)}
      {...props}
    />
  );
}
function ComboboxLabel({
  className,
  children,
  ...props
}: Primitive.GroupLabel.Props) {
  return (
    <Primitive.GroupLabel
      data-slot="combobox-label"
      className={classes("mc-menu-label mc-combobox-label", className)}
      {...props}
    >
      {menuTextNodes(children)}
    </Primitive.GroupLabel>
  );
}
function ComboboxCollection(props: Primitive.Collection.Props) {
  return <Primitive.Collection {...props} />;
}
function ComboboxEmpty({
  className,
  children,
  ...props
}: Primitive.Empty.Props) {
  return (
    <Primitive.Empty
      data-slot="combobox-empty"
      className={classes("mc-combobox-empty", className)}
      {...props}
    >
      {menuTextNodes(children)}
    </Primitive.Empty>
  );
}
function ComboboxSeparator({ className, ...props }: Primitive.Separator.Props) {
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
}
function ComboboxChips({ className, style, ...props }: Primitive.Chips.Props) {
  const scale = React.useContext(MenuScaleContext);
  return (
    <Primitive.Chips
      data-slot="combobox-chips"
      className={classes("mc-combobox-chips", className)}
      style={scaled(scale, style)}
      {...props}
    />
  );
}
function ComboboxChipRemove({
  className,
  render,
  children,
  ...props
}: Primitive.ChipRemove.Props) {
  const scale = React.useContext(MenuScaleContext);
  return (
    <Primitive.ChipRemove
      data-slot="combobox-chip-remove"
      aria-label="Remove selection"
      className={classes("mc-combobox-chip-remove", className)}
      render={render ?? <Button scale={scale} style={{ width: 20 * scale }} />}
      {...props}
    >
      {children ?? "X"}
    </Primitive.ChipRemove>
  );
}
function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: Primitive.Chip.Props & { showRemove?: boolean }) {
  return (
    <Primitive.Chip
      data-slot="combobox-chip"
      className={classes("mc-combobox-chip", className)}
      {...props}
    >
      {menuTextNodes(children)}
      {showRemove && <ComboboxChipRemove />}
    </Primitive.Chip>
  );
}
function ComboboxChipsInput({
  className,
  render,
  spellCheck = false,
  autoCorrect = "off",
  ...props
}: Primitive.Input.Props) {
  const scale = React.useContext(MenuScaleContext);
  return (
    <Primitive.Input
      data-slot="combobox-chip-input"
      render={
        render ?? (
          <Input
            scale={scale}
            style={{ border: 0, background: "transparent", width: 80 * scale }}
          />
        )
      }
      spellCheck={spellCheck}
      autoCorrect={autoCorrect}
      className={classes("mc-combobox-chip-input", className)}
      {...props}
    />
  );
}
function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}
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
