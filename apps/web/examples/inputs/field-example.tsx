"use client";

import { useId } from "react";

import {
  Field,
  FieldLabel,
  FieldContent,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const FieldExample = () => {
  const id = useId();

  return (
    <Field>
      <FieldLabel htmlFor={id}>World name</FieldLabel>
      <FieldContent>
        <Input
          id={id}
          defaultValue="My world"
          aria-describedby={`${id}-hint`}
        />
        <FieldDescription id={`${id}-hint`}>
          Choose a name for your world.
        </FieldDescription>
      </FieldContent>
    </Field>
  );
};

export default FieldExample;
