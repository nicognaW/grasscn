import { DatePickerDemo } from "@grasscn/web/blocks/date-picker";
import { Button } from "@grasscn/web/ui/button";
import { Calendar, CalendarDayButton } from "@grasscn/web/ui/calendar";
import type { CalendarProps } from "@grasscn/web/ui/calendar";
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@grasscn/web/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@grasscn/web/ui/popover";
import { format } from "date-fns";
import * as React from "react";

import "./native-reference.css";

export const CalendarFixture = () => {
  const q = new URLSearchParams(location.search);
  const component = q.get("component") ?? "calendar";
  const part = q.get("part") ?? "cell";
  // SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
  const scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3;
  const width = Number(q.get("width") ?? 20);
  const height = Number(q.get("height") ?? 20);
  const x = Number(q.get("x") ?? 8) * scale;
  const y = Number(q.get("y") ?? 8) * scale;
  const state = q.get("state") ?? "normal";
  const label = q.get("label") ?? "1";

  const [selected, setSelected] = React.useState<Date>();
  const [dateOpen, setDateOpen] = React.useState(false);
  const [multiple, setMultiple] = React.useState<Date[] | undefined>();
  React.useLayoutEffect(() => {
    document.documentElement.style.background = document.body.style.background =
      q.get("background") ?? "#202020";
  }, []);
  React.useLayoutEffect(() => {
    if (q.get("native") !== "1") {
      return;
    }

    document.documentElement.classList.add("native-reference-calendar");
    let frame = 0;

    const place = () => {
      if (part === "arrow") {
        const button = document.querySelector<HTMLButtonElement>(
          q.get("checked") === "true"
            ? ".rdp-button_next"
            : ".rdp-button_previous"
        );

        if (button) {
          button.id = "subject";
          button.dataset.subject = "true";
          button.classList.add(
            "native-reference-geometry",
            "native-reference-size",
            "native-reference-arrow"
          );
          button.style.setProperty("--reference-x", `${x}px`);
          button.style.setProperty("--reference-y", `${y}px`);
          button.style.setProperty("--reference-width", `${width * scale}px`);
          button.style.setProperty("--reference-height", `${height * scale}px`);
        } else {
          frame = requestAnimationFrame(place);
        }
      }
    };

    place();

    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.classList.remove("native-reference-calendar");
    };
  }, [component, part, scale, width, height, x, y, state, label]);

  if (q.get("native") === "1" && part.startsWith("trigger")) {
    return (
      <Popover scale={scale} open={false}>
        <PopoverTrigger
          render={
            <Button
              id="subject"
              data-subject="true"
              scale={scale}
              disabled={state.startsWith("disabled")}
              className="native-reference-geometry native-reference-size"
              style={
                {
                  "--reference-x": `${x}px`,
                  "--reference-y": `${y}px`,
                  "--reference-width": `${width * scale}px`,
                  "--reference-height": `${height * scale}px`,
                } as React.CSSProperties
              }
            />
          }
        >
          {label}
        </PopoverTrigger>
      </Popover>
    );
  }

  if (q.get("native") === "1") {
    const props: CalendarProps = {
      scale,
      mode: "single",
      defaultMonth: new Date(2026, 9),
      showOutsideDays: false,
      disableNavigation: state.startsWith("disabled"),
      className:
        part === "surface"
          ? "native-reference-geometry native-reference-size native-reference-calendar-surface"
          : undefined,
      id: part === "surface" ? "subject" : undefined,
      ...(part === "surface" ? { "data-subject": "true" } : {}),
      classNames:
        part === "surface"
          ? { months: "mc-native-hidden", nav: "mc-native-hidden" }
          : undefined,
      ...(part === "label"
        ? {
            captionTextProps: {
              align: (q.get("align") ?? "left") as "left" | "center",
              className: "native-reference-geometry native-reference-size",
              id: "subject",
              maxWidth: q.has("wrapWidth")
                ? Number(q.get("wrapWidth"))
                : undefined,
              style: {
                "--reference-x": `${x}px`,
                "--reference-y": `${y}px`,
                "--reference-width": `${width * scale}px`,
                "--reference-height": `${height * scale}px`,
              } as React.CSSProperties,
              ...{ "data-subject": "true" },
            },
            formatters: { formatCaption: () => label },
          }
        : {}),
      ...(part === "surface" && q.has("text")
        ? {
            components: {
              Months: () => (
                <>
                  <CardHeader>
                    <CardTitle>{label}</CardTitle>
                    <CardDescription>{q.get("text")}</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button scale={scale}>Done</Button>
                  </CardFooter>
                </>
              ),
              Nav: () => <></>,
            },
          }
        : {}),
      ...(part === "cell"
        ? {
            components: {
              DayButton: ({ day, modifiers, ...p }) => (
                <CalendarDayButton
                  {...p}
                  day={day}
                  modifiers={{
                    ...modifiers,
                    focused:
                      state === "focus" &&
                      day.date.getDate() === Number(label) &&
                      day.date.getDate() === Number(label),
                    range_end: q.get("range") === "end",
                    range_middle: q.get("range") === "middle",
                    range_start: q.get("range") === "start",
                    selected: q.get("selected") === "true",
                    today: q.get("today") === "true",
                  }}
                  id={
                    day.date.getDate() === Number(label) ? "subject" : undefined
                  }
                  disabled={state.startsWith("disabled")}
                  className={`${p.className ?? ""} native-reference-geometry native-reference-size`}
                  style={
                    {
                      "--reference-height": `${height * scale}px`,
                      "--reference-width": `${width * scale}px`,
                      "--reference-x": `${x}px`,
                      "--reference-y": `${y}px`,
                    } as React.CSSProperties
                  }
                  data-subject={
                    (day.date.getDate() === Number(label)
                      ? "subject"
                      : undefined) === "subject"
                      ? "true"
                      : undefined
                  }
                >
                  {label}
                </CalendarDayButton>
              ),
            },
          }
        : {}),
      style:
        part === "surface"
          ? ({
              "--reference-height": `${height * scale}px`,
              "--reference-padding": `${q.has("text") ? 18 * scale : 0}px`,
              "--reference-width": `${width * scale}px`,
              "--reference-x": `${x}px`,
              "--reference-y": `${y}px`,
            } as React.CSSProperties)
          : undefined,
    };

    return (
      <>
        {component === "date-picker" ? (
          <Popover scale={scale} open>
            <PopoverTrigger render={<Button scale={scale} />}>
              Pick a date
            </PopoverTrigger>
            <PopoverContent
              data-slot="date-picker-content"
              initialFocus={false}
              className="native-reference-popover native-reference-popover-native"
            >
              <Calendar {...props} />
            </PopoverContent>
          </Popover>
        ) : (
          <Calendar {...props} />
        )}
      </>
    );
  }

  if (q.get("scenario") === "disabled") {
    return (
      <Popover>
        <PopoverTrigger render={<Button disabled aria-label="Disabled date" />}>
          Pick a date
        </PopoverTrigger>
      </Popover>
    );
  }

  if (q.get("scenario") === "uncontrolled") {
    return <DatePickerDemo scale={scale} />;
  }

  return (
    <>
      <Calendar
        mode="single"
        defaultMonth={new Date(2026, 9)}
        selected={selected}
        onSelect={setSelected}
        disabled={{ before: new Date(2026, 9, 3) }}
      />
      <Popover scale={scale} open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger
          render={<Button scale={scale} data-slot="date-picker-trigger" />}
        >
          {selected ? format(selected, "PPP") : "Pick a date"}
        </PopoverTrigger>
        <PopoverContent
          data-slot="date-picker-content"
          align="start"
          className="native-reference-popover"
        >
          <Calendar
            scale={scale}
            mode="single"
            defaultMonth={new Date(2026, 9)}
            selected={selected}
            onSelect={(date) => {
              setSelected(date);
              setDateOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      <input
        type="hidden"
        name="date"
        value={selected ? format(selected, "yyyy-MM-dd") : ""}
      />
      <output id="selected">{selected?.toLocaleDateString()}</output>
      <Calendar
        mode="range"
        numberOfMonths={2}
        defaultMonth={new Date(2026, 9)}
      />
      <Calendar
        aria-label="Multiple dates"
        mode="multiple"
        selected={multiple}
        onSelect={setMultiple}
        defaultMonth={new Date(2026, 9)}
      />
      <output id="multiple">{multiple?.length ?? 0}</output>
      <Calendar
        aria-label="Dropdown calendar"
        captionLayout="dropdown"
        defaultMonth={new Date(2026, 9)}
        startMonth={new Date(2020, 0)}
        endMonth={new Date(2030, 11)}
      />
    </>
  );
};
