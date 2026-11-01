"use client";
import * as React from "react";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Root,
  type Weekday,
  type CaptionLabel,
  type WeekNumber,
  type Dropdown,
} from "react-day-picker";

import { Button } from "./button";
import { Card } from "./card";
import { Label, type LabelProps } from "./label";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { playMinecraftClick } from "./minecraft-sound";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./select";

import "./minecraft-calendar.css";
import "./minecraft-pagination.css";
import "./minecraft-pagination-assets.css";
const CalendarScaleContext = React.createContext<1 | 2 | 3>(2);
type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  scale?: 1 | 2 | 3;
  buttonVariant?: "default";
  captionTextProps?: Omit<LabelProps, "children" | "scale">;
};
function Calendar({
  scale = 2,
  buttonVariant = "default",
  showOutsideDays = true,
  captionLayout = "label",
  className,
  classNames,
  components,
  captionTextProps,
  ...props
}: CalendarProps) {
  if (buttonVariant !== "default")
    throw Error(
      "Minecraft Calendar supports the native default button appearance only"
    );
  const defaults = getDefaultClassNames(),
    merged = Object.fromEntries(
      Object.entries(defaults).map(([key, value]) => [
        key,
        `${value} ${(classNames as Record<string, string> | undefined)?.[key] ?? ""}`,
      ])
    );
  return (
    <CalendarScaleContext.Provider value={scale}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        captionLayout={captionLayout}
        className={cn(`mc-calendar ${""}`, className)}
        classNames={merged}
        components={{
          Root: ({
            rootRef,
            ...rootProps
          }: React.ComponentProps<typeof Root>) => (
            <Card
              ref={rootRef}
              data-slot="calendar"
              scale={scale}
              {...rootProps}
            />
          ),
          PreviousMonthButton: ({ className, onClick, ...p }) => (
            <button
              type="button"
              className={cn(
                `mc-pagination-arrow mc-calendar-arrow ${""}`,
                className
              )}
              data-direction="backward"
              aria-disabled={p.disabled || undefined}
              {...p}
              onClick={(e) => {
                if (!e.defaultPrevented) playMinecraftClick();
                onClick?.(e);
              }}
            />
          ),
          NextMonthButton: ({ className, onClick, ...p }) => (
            <button
              type="button"
              className={cn(
                `mc-pagination-arrow mc-calendar-arrow ${""}`,
                className
              )}
              data-direction="forward"
              aria-disabled={p.disabled || undefined}
              {...p}
              onClick={(e) => {
                if (!e.defaultPrevented) playMinecraftClick();
                onClick?.(e);
              }}
            />
          ),
          Chevron: () => <></>,
          DayButton: CalendarDayButton,
          Dropdown: CalendarDropdown,
          CaptionLabel: ({
            children,
            ...p
          }: React.ComponentProps<typeof CaptionLabel>) => (
            <span {...p}>
              <Label scale={scale} {...captionTextProps}>
                {children}
              </Label>
            </span>
          ),
          Weekday: ({
            children,
            ...p
          }: React.ComponentProps<typeof Weekday>) => (
            <th {...p}>
              <Label scale={scale}>{children}</Label>
            </th>
          ),
          WeekNumber: ({
            children,
            ...p
          }: React.ComponentProps<typeof WeekNumber>) => (
            <td {...p}>
              <Label scale={scale}>{children}</Label>
            </td>
          ),
          ...components,
        }}
        {...props}
      />
    </CalendarScaleContext.Provider>
  );
}
function CalendarDropdown({
  options,
  className,
  style,
  value,
  defaultValue,
  disabled,
  id,
  onChange,
  ...props
}: React.ComponentProps<typeof Dropdown>) {
  const scale = React.useContext(CalendarScaleContext),
    native = React.useRef<HTMLSelectElement>(null);
  return (
    <span className={cn(`mc-calendar-dropdown ${""}`, className)} style={style}>
      <select
        ref={native}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={onChange}
        {...props}
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        {options?.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <Select
        items={options?.map((option) => ({
          value: String(option.value),
          label: option.label,
        }))}
        scale={scale}
        value={value == null ? undefined : String(value)}
        defaultValue={defaultValue == null ? undefined : String(defaultValue)}
        disabled={disabled}
        onValueChange={(next) => {
          if (native.current) {
            native.current.value = String(next ?? "");
            native.current.dispatchEvent(
              new Event("change", { bubbles: true })
            );
          }
        }}
      >
        <SelectTrigger
          id={id}
          aria-label={props["aria-label"]}
          aria-labelledby={props["aria-labelledby"]}
          style={{ width: "auto", minWidth: 40 * scale }}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options?.map((option) => (
            <SelectItem
              key={option.value}
              value={String(option.value)}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
}
function CalendarDayButton({
  day,
  modifiers,
  className,
  children,
  style,
  onClick,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const scale = React.useContext(CalendarScaleContext),
    ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  return (
    <Button
      render={
        <button
          {...props}
          type={props.type ?? "button"}
          onClick={(event) => {
            if (!event.defaultPrevented && !props.disabled)
              playMinecraftClick();
            onClick?.(event);
            event.preventDefault();
          }}
        />
      }
      ref={ref}
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        (modifiers.selected &&
          !modifiers.range_start &&
          !modifiers.range_end &&
          !modifiers.range_middle) ||
        undefined
      }
      data-range-start={modifiers.range_start || undefined}
      data-range-middle={modifiers.range_middle || undefined}
      data-range-end={modifiers.range_end || undefined}
      data-today={modifiers.today || undefined}
      data-outside={modifiers.outside || undefined}
      className={cn(`mc-calendar-day ${""}`, className)}
      scale={scale}
      style={minecraftStyle(style, (__style) => ({
        width: 20 * scale,
        height: 20 * scale,
        ...__style,
      }))}
    >
      {children}
    </Button>
  );
}
export { Calendar, CalendarDayButton };
export type { CalendarProps };
