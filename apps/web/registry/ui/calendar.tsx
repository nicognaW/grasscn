"use client";

import * as React from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import type {
  DayButton,
  Root,
  Weekday,
  CaptionLabel,
  WeekNumber,
  Dropdown,
} from "react-day-picker";

import { Button } from "./button";
import { Card } from "./card";
import { Label } from "./label";
import type { LabelProps } from "./label";
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

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  scale?: 1 | 2 | 3;
  buttonVariant?: "default";
  captionTextProps?: Omit<LabelProps, "children" | "scale">;
};

interface CalendarDayStyle extends React.CSSProperties {
  "--mc-calendar-day-height": string;
  "--mc-calendar-day-width": string;
}

interface CalendarDropdownStyle extends React.CSSProperties {
  "--mc-calendar-dropdown-min-width": string;
}

interface CalendarAppearance {
  scale: 1 | 2 | 3;
  captionTextProps?: CalendarProps["captionTextProps"];
}

const CalendarContext = React.createContext<CalendarAppearance>({ scale: 2 });

const CalendarCaptionLabel = ({
  children,
  ...props
}: React.ComponentProps<typeof CaptionLabel>) => {
  const { scale, captionTextProps } = React.useContext(CalendarContext);

  return (
    <span {...props}>
      <Label scale={scale} {...captionTextProps}>
        {children}
      </Label>
    </span>
  );
};

const CalendarChevron = () => <></>;

const CalendarMonthButton = ({
  direction,
  className,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { direction: "forward" | "backward" }) => (
  <button
    type="button"
    className={cn(`mc-pagination-arrow mc-calendar-arrow`, className)}
    data-direction={direction}
    aria-disabled={props.disabled ?? undefined}
    {...props}
    onClick={(event) => {
      if (!event.defaultPrevented) {
        playMinecraftClick();
      }

      onClick?.(event);
    }}
  />
);

const CalendarNextMonthButton = (props: React.ComponentProps<"button">) => (
  <CalendarMonthButton direction="forward" {...props} />
);

const CalendarPreviousMonthButton = (props: React.ComponentProps<"button">) => (
  <CalendarMonthButton direction="backward" {...props} />
);

const CalendarRoot = ({
  rootRef,
  ...props
}: React.ComponentProps<typeof Root>) => {
  const { scale } = React.useContext(CalendarContext);

  return <Card ref={rootRef} data-slot="calendar" scale={scale} {...props} />;
};

const CalendarWeekNumber = ({
  children,
  ...props
}: React.ComponentProps<typeof WeekNumber>) => {
  const { scale } = React.useContext(CalendarContext);

  return (
    <td {...props}>
      <Label scale={scale}>{children}</Label>
    </td>
  );
};

const CalendarWeekday = ({
  children,
  ...props
}: React.ComponentProps<typeof Weekday>) => {
  const { scale } = React.useContext(CalendarContext);

  return (
    <th {...props}>
      <Label scale={scale}>{children}</Label>
    </th>
  );
};

const CalendarDropdown = ({
  options,
  className,
  style,
  value,
  defaultValue,
  disabled,
  id,
  onChange,
  ...props
}: React.ComponentProps<typeof Dropdown>) => {
  const { scale } = React.useContext(CalendarContext);
  const native = React.useRef<HTMLSelectElement>(null);

  const dropdownStyle: CalendarDropdownStyle = {
    "--mc-calendar-dropdown-min-width": `${40 * scale}px`,
  };

  return (
    <span className={cn(className)} style={style}>
      <select
        ref={native}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={onChange}
        {...props}
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none absolute h-px w-px opacity-0"
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
          label: option.label,
          value: String(option.value),
        }))}
        scale={scale}
        value={
          value === undefined || value === null ? undefined : String(value)
        }
        defaultValue={
          defaultValue === undefined || defaultValue === null
            ? undefined
            : String(defaultValue)
        }
        disabled={disabled}
        onValueChange={(next) => {
          if (native.current) {
            native.current.value = next ?? "";
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
          className="mc-calendar-dropdown-trigger w-auto"
          style={dropdownStyle}
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
};

const CalendarDayButton = ({
  day,
  modifiers,
  className,
  children,
  style,
  onClick,
  ...props
}: React.ComponentProps<typeof DayButton>) => {
  const { scale } = React.useContext(CalendarContext);
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) {
      ref.current?.focus();
    }
  }, [modifiers.focused]);

  return (
    <Button
      render={
        <button
          {...props}
          type={props.type ?? "button"}
          onClick={(event) => {
            if (!event.defaultPrevented && !(props.disabled ?? false)) {
              playMinecraftClick();
            }

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
      className={cn(`mc-calendar-day`, className)}
      scale={scale}
      style={minecraftStyle(style, (__style): CalendarDayStyle => ({
        "--mc-calendar-day-height": `${20 * scale}px`,
        "--mc-calendar-day-width": `${20 * scale}px`,
        ...__style,
      }))}
    >
      {children}
    </Button>
  );
};

const Calendar = ({
  scale = 2,
  buttonVariant = "default",
  showOutsideDays = true,
  captionLayout = "label",
  className,
  classNames,
  components,
  captionTextProps,
  ...props
}: CalendarProps) => {
  const appearance = React.useMemo(
    () => ({ captionTextProps, scale }),
    [scale, captionTextProps]
  );

  if (buttonVariant !== "default") {
    throw new Error(
      "Minecraft Calendar supports the native default button appearance only"
    );
  }

  const defaults = getDefaultClassNames();

  const merged = Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [
      key,
      `${value} ${(classNames as Record<string, string> | undefined)?.[key] ?? ""}`,
    ])
  );

  return (
    <CalendarContext.Provider value={appearance}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        captionLayout={captionLayout}
        className={cn(`mc-calendar`, className)}
        classNames={merged}
        components={{
          CaptionLabel: CalendarCaptionLabel,
          Chevron: CalendarChevron,
          DayButton: CalendarDayButton,
          Dropdown: CalendarDropdown,
          NextMonthButton: CalendarNextMonthButton,
          PreviousMonthButton: CalendarPreviousMonthButton,
          Root: CalendarRoot,
          WeekNumber: CalendarWeekNumber,
          Weekday: CalendarWeekday,
          ...components,
        }}
        {...props}
      />
    </CalendarContext.Provider>
  );
};

export { Calendar, CalendarDayButton };

export type { CalendarProps };
