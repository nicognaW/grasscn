"use client";

import { format } from "date-fns";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const DatePickerDemo = ({ scale = 2 }: { scale?: 1 | 2 | 3 }) => {
  const [date, setDate] = React.useState<Date>();

  return (
    <Popover scale={scale}>
      <PopoverTrigger
        render={
          <Button
            scale={scale}
            data-slot="date-picker-trigger"
            data-empty={!date}
          />
        }
      >
        {date ? format(date, "PPP") : "Pick a day"}
      </PopoverTrigger>
      <PopoverContent
        data-slot="date-picker-content"
        align="start"
        style={{ padding: 0, width: "auto" }}
      >
        <Calendar
          scale={scale}
          mode="single"
          selected={date}
          onSelect={setDate}
          defaultMonth={new Date(2026, 9)}
        />
      </PopoverContent>
    </Popover>
  );
};

export const DatePickerRangeDemo = ({ scale = 2 }: { scale?: 1 | 2 | 3 }) => {
  const [range, setRange] = React.useState<DateRange>();

  return (
    <Popover scale={scale}>
      <PopoverTrigger
        render={
          <Button
            scale={scale}
            data-slot="date-picker-trigger"
            data-empty={!range?.from}
          />
        }
      >
        {range?.from
          ? `${format(range.from, "PP")}${range.to ? ` - ${format(range.to, "PP")}` : ""}`
          : "Pick a range"}
      </PopoverTrigger>
      <PopoverContent
        data-slot="date-picker-content"
        align="start"
        style={{ padding: 0, width: "auto" }}
      >
        <Calendar
          scale={scale}
          mode="range"
          selected={range}
          onSelect={setRange}
          numberOfMonths={2}
          defaultMonth={new Date(2026, 9)}
          captionLayout="dropdown"
          startMonth={new Date(2020, 0)}
          endMonth={new Date(2030, 11)}
        />
      </PopoverContent>
    </Popover>
  );
};
