"use client";

import { useState } from "react";

import { Calendar } from "@/components/ui/calendar";

const Example = () => {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 9, 30));

  return (
    <div>
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        defaultMonth={new Date(2026, 9)}
      />
      <output aria-label="Selected date">
        {date ? date.toLocaleDateString("en-US") : "No day selected"}
      </output>
    </div>
  );
};

export default Example;
