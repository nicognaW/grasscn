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

// Navigation owns this immutable fixture query; state updates keep the same document.
const q = new URLSearchParams(location.search);

export const FormsFixture = () => {
  const component = q.get("component") ?? "form";
  const native = q.has("native");
  const part = q.get("part") ?? "label";

  // SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
  const scale =
    // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
    Number(q.get("scale") ?? 2) as 1 | 2 | 3;

  const text = q.get("label") ?? "Player name";
  const [saved, setSaved] = React.useState("");
  const [disabled, setDisabled] = React.useState(false);
  const ref = React.useRef<HTMLLabelElement>(null);
  const [tag, setTag] = React.useState("");

  const form = useForm({ defaultValues: { name: "" }, mode: "onSubmit" });

  const common = {
    align:
      q.get("align") === "center" ? ("center" as const) : ("left" as const),
    className:
      "fixture-geometry-height fixture-geometry-x fixture-placement-fixed fixture-geometry-y fixture-geometry-width",
    "data-subject": "true",
    id: "subject",
    maxWidth: q.has("wrapWidth") ? Number(q.get("wrapWidth")) : undefined,
    scale,
    style: {
      "--fixture-height": `${Number(q.get("height") ?? 9) * scale}px`,
      "--fixture-x": `${Number(q.get("x") ?? 16) * scale}px`,

      "--fixture-y": `${Number(q.get("y") ?? 16) * scale}px`,
      "--fixture-width": `${Number(q.get("width") ?? 200) * scale}px`,
    },
  };

  React.useLayoutEffect(() => {
    const chainedBackgroundOuter = document.documentElement.style;
    const chainedBackgroundInner = document.body.style;
    const chainedBackgroundValue = q.get("background") ?? "#202020";
    chainedBackgroundInner.background = chainedBackgroundValue;
    chainedBackgroundOuter.background = chainedBackgroundValue;
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
            minLength: { message: "Use at least two characters", value: 2 },
            required: "Enter a player name",
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
            // SAFETY: owned fixture callers serialize the orientation option from the actual component protocol (| "vertical" | "horizontal" | "responsive"); preserve this URL read, original default and component handling.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
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
