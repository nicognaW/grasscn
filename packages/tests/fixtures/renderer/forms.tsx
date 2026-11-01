import { Button } from "@grasscn/web/ui/button";
import {
  Field,
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldLabel,
  FieldTitle,
  FieldContent,
  FieldDescription,
  FieldSeparator,
  FieldError,
} from "@grasscn/web/ui/field";
import { Input } from "@grasscn/web/ui/input";
import { MinecraftProse } from "@grasscn/web/ui/minecraft-prose";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";

export const FormsFixture = () => {
  const q = new URLSearchParams(location.search);
  const component = q.get("component") ?? "form";
  const native = q.has("native");
  const part = q.get("part") ?? "label";
  const scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3;
  const text = q.get("label") ?? "Player name";
  const [saved, setSaved] = React.useState("");
  const [disabled, setDisabled] = React.useState(false);
  const ref = React.useRef<HTMLLabelElement>(null);
  const [tag, setTag] = React.useState("");

  const form = useForm({ defaultValues: { name: "" }, mode: "onSubmit" });

  const common = {
    align:
      q.get("align") === "center" ? ("center" as const) : ("left" as const),
    "data-subject": "true",
    id: "subject",
    maxWidth: q.has("wrapWidth") ? Number(q.get("wrapWidth")) : undefined,
    scale,
    style: {
      height: Number(q.get("height") ?? 9) * scale,
      left: Number(q.get("x") ?? 16) * scale,
      position: "fixed" as const,
      top: Number(q.get("y") ?? 16) * scale,
      width: Number(q.get("width") ?? 200) * scale,
    },
  };

  React.useLayoutEffect(() => {
    document.documentElement.style.background = document.body.style.background =
      q.get("background") ?? "#202020";
  }, []);

  if (native) {
    if (component === "field") {
      const C =
        {
          description: FieldDescription,
          label: FieldLabel,
          legend: FieldLegend,
          title: FieldTitle,
        }[part] ?? FieldLabel;

      return <C {...common}>{text}</C>;
    }

    if (part === "message") {
      return (
        <FieldError scale={scale}>
          <MinecraftProse {...common}>{text}</MinecraftProse>
        </FieldError>
      );
    }

    const C = part === "label" ? FieldLabel : FieldDescription;

    return <C {...common}>{text}</C>;
  }

  if (component === "form") {
    return (
      <form
        noValidate
        onSubmit={form.handleSubmit((v) => {
          setSaved(v.name);
        })}
      >
        <Controller
          name="name"
          control={form.control}
          rules={{
            required: "Enter a player name",
            minLength: { value: 2, message: "Use at least two characters" },
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel scale={scale} ref={ref} htmlFor="form-name">
                Player name
              </FieldLabel>
              <Input
                {...field}
                id="form-name"
                scale={scale}
                disabled={disabled}
                aria-invalid={fieldState.invalid}
                aria-describedby={`form-description${fieldState.invalid ? " form-error" : ""}`}
              />
              <FieldDescription id="form-description" scale={scale}>
                Your name in the world.
              </FieldDescription>
              {fieldState.invalid && (
                <FieldError
                  scale={scale}
                  id="form-error"
                  errors={[fieldState.error]}
                />
              )}
            </Field>
          )}
        />
        <Button scale={scale} type="submit">
          Save player
        </Button>
        <button
          type="button"
          onClick={() => {
            form.reset();
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            setDisabled((v) => !v);
          }}
        >
          Disable field
        </button>
        <button
          type="button"
          onClick={() => {
            setTag(ref.current?.tagName ?? "");
          }}
        >
          Read ref
        </button>
        <output aria-label="Saved player">{saved}</output>
        <output aria-label="Label ref">{tag}</output>
      </form>
    );
  }

  return (
    <FieldSet disabled={disabled}>
      <FieldLegend scale={scale}>World settings</FieldLegend>
      <FieldGroup>
        <Field
          orientation={
            (q.get("orientation") ?? "vertical") as
              | "vertical"
              | "horizontal"
              | "responsive"
          }
        >
          <FieldLabel htmlFor="world" scale={scale} ref={ref}>
            World name
          </FieldLabel>
          <FieldContent>
            <Input id="world" scale={scale} />
            <FieldDescription scale={scale}>
              Enter a name for your world.
            </FieldDescription>
            <FieldError
              scale={scale}
              errors={
                q.has("errors")
                  ? [
                      { message: "Required" },
                      { message: "Required" },
                      { message: "Try another name" },
                    ]
                  : []
              }
            />
          </FieldContent>
        </Field>
        <FieldSeparator>Or</FieldSeparator>
        <FieldTitle scale={scale}>More settings</FieldTitle>
      </FieldGroup>
      <button
        type="button"
        onClick={() => {
          setDisabled((v) => !v);
        }}
      >
        Disable fields
      </button>
      <button
        type="button"
        onClick={() => {
          setTag(ref.current?.tagName ?? "");
        }}
      >
        Read ref
      </button>
      <output aria-label="Label ref">{tag}</output>
    </FieldSet>
  );
};
