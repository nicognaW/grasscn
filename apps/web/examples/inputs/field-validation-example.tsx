"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const ValidatedFieldExample = () => {
  const id = useId();
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const invalid = submitted && name.length < 2;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}

      className="grid [gap:12px]"
    >
      <Field data-invalid={invalid}>
        <FieldLabel htmlFor={id}>Player name</FieldLabel>
        <Input
          id={id}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
        />
        {invalid && (
          <FieldError
            id={`${id}-error`}
            errors={[{ message: "Use at least two characters" }]}
          />
        )}
      </Field>
      <Button type="submit">Validate</Button>
    </form>
  );
};

export default ValidatedFieldExample;
