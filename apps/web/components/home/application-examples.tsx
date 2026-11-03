"use client";

import * as React from "react";

import { Calendar, CalendarDayButton } from "../../registry/ui/calendar";
import { Progress } from "../../registry/ui/progress";
import { RadioGroup, RadioGroupItem } from "../../registry/ui/radio-group";
import { Textarea } from "../../registry/ui/textarea";
import { DocumentText } from "../document-text";
import { Panel, Action } from "./showcase-panel";

export const Savings = () => {
  const [value, setValue] = React.useState(3250);

  return (
    <Panel
      title="Make room for your next idea."
      tag="SAVINGS TARGET"
      description="Studio equipment · $5,000 goal"
    >
      <div className="grass-stat-line">
        <strong>
          <DocumentText>${value.toLocaleString("en-US")}</DocumentText>
        </strong>
      </div>
      <Progress
        scale={1}
        value={value / 50}
        color="green"
        aria-label="Savings progress"
      />
      <div className="grass-between">
        <output aria-label="Savings percentage">
          <DocumentText>{Math.round(value / 50)}% saved</DocumentText>
        </output>
        <span>
          <DocumentText>
            ${(5000 - value).toLocaleString("en-US")} to go
          </DocumentText>
        </span>
      </div>
      <Action
        disabled={value === 5000}
        onClick={() => {
          setValue((v) => Math.min(5000, v + 250));
        }}
      >
        {value === 5000 ? "Goal reached" : "Add $250"}
      </Action>
      <p className="grass-note">
        <DocumentText>An interactive savings example.</DocumentText>
      </p>
    </Panel>
  );
};

const ScheduleDay = (props: React.ComponentProps<typeof CalendarDayButton>) => (
  <CalendarDayButton
    {...props}
    /* eslint-disable shadcn/no-inline-styles -- Bridge the public DayButton width override to the website's integer container-query sizes. */
    style={{ ...props.style, width: "var(--schedule-day-width)" }}
    /* eslint-enable shadcn/no-inline-styles */
  />
);

export const Schedule = () => {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(2026, 10, 2)
  );

  return (
    <Panel
      title="Find a day that works."
      tag="TEAM CALENDAR"
      description="Choose a date for the design review."
      /* eslint-disable shadcn/no-unknown-classes -- Defined in the parent homepage.css composition stylesheet. */
      className="grass-schedule-panel"
      /* eslint-enable shadcn/no-unknown-classes */
    >
      <div
        /* eslint-disable shadcn/no-unknown-classes -- Defined in the parent homepage.css composition stylesheet. */
        className="grass-calendar-viewport"
        /* eslint-enable shadcn/no-unknown-classes */
      >
        <Calendar
          scale={2}
          components={{ DayButton: ScheduleDay }}
          mode="single"
          selected={date}
          onSelect={setDate}
          defaultMonth={new Date(2026, 10)}
        />
      </div>
      <output
        aria-live="polite"
        aria-label="Review date"
        className="grass-note"
      >
        <DocumentText>
          {date
            ? date.toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "Choose a day"}
        </DocumentText>
      </output>
    </Panel>
  );
};

export const Feedback = () => {
  const [text, setText] = React.useState("");
  const [sent, setSent] = React.useState(false);

  return (
    <Panel
      title="Help shape what comes next."
      tag="PRODUCT FEEDBACK"
      description="What would make your workflow better?"
    >
      <form
        className="grass-form"
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
          setText("");
        }}
      >
        <Textarea
          scale={2}
          aria-label="Product feedback"
          placeholder="Share an idea..."
          required
          maxLength={240}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSent(false);
          }}
          style={{ height: 100 }}
        />
        <span className="grass-note">
          <DocumentText>{text.length}/240 characters</DocumentText>
        </span>
        <Action type="submit" disabled={!text.trim()}>
          Save feedback
        </Action>
        <output
          aria-label="Feedback status"
          aria-live="polite"
          className="grass-note"
        >
          <DocumentText>
            {sent ? "Feedback saved in this demo." : "Your ideas belong here."}
          </DocumentText>
        </output>
      </form>
    </Panel>
  );
};

export const Plan = () => {
  const [plan, setPlan] = React.useState("monthly");
  const [saved, setSaved] = React.useState(false);

  return (
    <Panel
      title="A plan for your next chapter."
      tag="YOUR SUBSCRIPTION"
      description="Pick the billing cycle that suits you."
    >
      <RadioGroup
        scale={2}
        value={plan}
        onValueChange={(v) => {
          setPlan(v);
          setSaved(false);
        }}
        aria-label="Billing cycle"
      >
        <label className="grass-inline">
          <RadioGroupItem value="monthly" aria-label="Monthly · $12 / month" />
          <DocumentText>Monthly · $12 / month</DocumentText>
        </label>
        <label className="grass-inline">
          <RadioGroupItem value="annual" aria-label="Annual · $120 / year" />
          <DocumentText>Annual · $120 / year</DocumentText>
        </label>
      </RadioGroup>
      <p className="grass-positive">
        <DocumentText>
          {plan === "annual"
            ? "Save $24 each year"
            : "Flexible monthly billing"}
        </DocumentText>
      </p>
      <Action
        onClick={() => {
          setSaved(true);
        }}
      >
        Save plan
      </Action>
      <output
        aria-label="Plan status"
        aria-live="polite"
        className="grass-note"
      >
        <DocumentText>
          {saved
            ? `${plan === "annual" ? "Annual" : "Monthly"} plan selected for this demo.`
            : "Change your plan any time."}
        </DocumentText>
      </output>
    </Panel>
  );
};
