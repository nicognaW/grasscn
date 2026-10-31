"use client";
import { minecraftStyle } from "./minecraft-render";
import * as React from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar, type CalendarProps } from "./calendar";
import { Button } from "./button";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";
type DateSelection = Date | Date[] | DateRange | undefined;
type DatePickerProps = CalendarProps & {
    placeholder?: string;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    triggerProps?: Omit<React.ComponentProps<typeof Button>, "children">;
    contentProps?: React.ComponentProps<typeof PopoverContent>;
    formatValue?: (value: DateSelection) => React.ReactNode;
    name?: string;
    form?: string;
    disabled?: CalendarProps['disabled'];
    triggerDisabled?: boolean;
};
function defaultFormat(value: DateSelection): string {
    if (value instanceof Date)
        return format(value, 'PPP');
    if (Array.isArray(value))
        return value.map(v => format(v, 'PP')).join(', ');
    if (value?.from)
        return `${format(value.from, 'PP')}${value.to ? ' - ' + format(value.to, 'PP') : ''}`;
    return '';
}
function DatePicker({ placeholder = 'Pick a date', open, defaultOpen = false, onOpenChange, triggerProps, contentProps, formatValue = defaultFormat, name, form, triggerDisabled = false, scale = 2, ...calendar }: DatePickerProps) {
    const [internalOpen, setOpen] = React.useState(defaultOpen), [internalSelected, setSelected] = React.useState<DateSelection>((calendar as {
        selected?: DateSelection;
    }).selected), controlled = typeof (calendar as {
        onSelect?: unknown;
    }).onSelect === 'function', selected = controlled ? (calendar as {
        selected?: DateSelection;
    }).selected : internalSelected, isOpen = open ?? internalOpen;
    const changeOpen = (value: boolean) => {
        if (open === undefined)
            setOpen(value);
        onOpenChange?.(value);
    };
    const onSelect = (...args: unknown[]) => {
        const value = args[0] as DateSelection;
        if (!controlled)
            setSelected(value);
        const callback = (calendar as {
            onSelect?: (...args: unknown[]) => void;
        }).onSelect;
        callback?.(...args);
        if (calendar.mode === 'single' || !calendar.mode)
            changeOpen(false);
    };
    const value = formatValue(selected), label = value || placeholder, serialized = selected instanceof Date ? format(selected, 'yyyy-MM-dd') : Array.isArray(selected) ? selected.map(v => format(v, 'yyyy-MM-dd')).join(',') : selected?.from ? [format(selected.from, 'yyyy-MM-dd'), selected.to ? format(selected.to, 'yyyy-MM-dd') : ''].join('/') : '';
    return <><Popover scale={scale} open={isOpen} onOpenChange={changeOpen}><PopoverTrigger render={<Button data-slot="date-picker-trigger" scale={scale} {...triggerProps} disabled={triggerDisabled || calendar.disabled === true || triggerProps?.disabled}/>}>{label}</PopoverTrigger><PopoverContent data-slot="date-picker-content" align="start" {...contentProps} style={minecraftStyle(contentProps?.style, __style => ({ width: 'fit-content', padding: 0, ...__style }))}><Calendar {...({ ...calendar, mode: calendar.mode ?? 'single', selected, onSelect, autoFocus: calendar.autoFocus ?? true } as CalendarProps)} scale={scale}/></PopoverContent></Popover>{name && <input type="hidden" name={name} form={form} value={serialized} disabled={triggerDisabled || calendar.disabled === true || triggerProps?.disabled}/>}</>;
}
export { DatePicker };
export type { DatePickerProps, DateSelection };
