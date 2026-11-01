"use client"

import * as React from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MinecraftDisclosureText } from "@/components/ui/minecraft-disclosure-text"

const schema = z.object({
  name: z.string().min(1, "Enter your player name").min(2, "Use at least two characters"),
  world: z.string().min(1, "Enter a world name"),
  notes: z.string(),
})
type Settings = z.infer<typeof schema>

export function FormExample({ scale = 2 }: { scale?: 1 | 2 | 3 }) {
  const form = useForm<Settings>({ resolver: zodResolver(schema), defaultValues: { name: "", world: "My world", notes: "" } })
  const [saved, setSaved] = React.useState<Settings | null>(null)
  const [disabled, setDisabled] = React.useState(false)
  const [width, setWidth] = React.useState(240)
  const host = React.useRef<HTMLFormElement>(null)
  const id = React.useId()
  React.useLayoutEffect(() => {
    const element = host.current!
    const measure = () => setWidth(Math.floor(element.clientWidth / scale))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [scale])
  return <>
    <Button scale={scale} type="button" onClick={() => setDisabled(value => !value)}>{disabled ? "Enable fields" : "Disable fields"}</Button>
    <form ref={host} aria-label="Player and world settings" noValidate onSubmit={form.handleSubmit(setSaved)} style={{ display: "grid", gap: 12 * scale, minWidth: 0, maxWidth: 420 * scale }}>
      <FieldSet disabled={disabled}>
        <FieldLegend scale={scale} maxWidth={width}>Player and world settings</FieldLegend>
        <FieldGroup>
          <Controller name="name" control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel scale={scale} htmlFor={`${id}-name`}>Player name</FieldLabel>
              <FieldContent>
                <Input {...field} id={`${id}-name`} scale={scale} disabled={disabled} placeholder="Steve" aria-invalid={fieldState.invalid}
                  aria-describedby={`${id}-name-hint${fieldState.invalid ? ` ${id}-name-error` : ""}`} style={{ width: "100%" }} />
                <FieldDescription scale={scale} maxWidth={width} id={`${id}-name-hint`}>CJK names are welcome.</FieldDescription>
                {fieldState.invalid && <FieldError scale={scale} id={`${id}-name-error`} errors={[fieldState.error]} />}
              </FieldContent>
            </Field>
          )} />
          <Controller name="world" control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel scale={scale} htmlFor={`${id}-world`}>World name</FieldLabel>
              <FieldContent>
                <Input {...field} id={`${id}-world`} scale={scale} disabled={disabled} aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? `${id}-world-error` : undefined} style={{ width: "100%" }} />
                {fieldState.invalid && <FieldError scale={scale} id={`${id}-world-error`} errors={[fieldState.error]} />}
              </FieldContent>
            </Field>
          )} />
          <Controller name="notes" control={form.control} render={({ field }) => (
            <Field>
              <FieldLabel scale={scale} htmlFor={`${id}-notes`}>Journey notes</FieldLabel>
              <FieldContent>
                <Textarea {...field} id={`${id}-notes`} scale={scale} disabled={disabled} aria-describedby={`${id}-notes-hint`}
                  placeholder="What will you build?" style={{ width: "100%", height: 48 * scale }} />
                <FieldDescription scale={scale} maxWidth={width} id={`${id}-notes-hint`}>Keep a note for your next visit.</FieldDescription>
              </FieldContent>
            </Field>
          )} />
        </FieldGroup>
      </FieldSet>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 * scale }}>
        <Button scale={scale} type="submit" disabled={disabled}>Save player</Button>
        <Button scale={scale} type="button" onClick={() => { form.reset(); setSaved(null) }}>Reset</Button>
      </div>
    </form>
    <div aria-live="polite">{saved ? <><output aria-label="Saved player"><MinecraftDisclosureText scale={scale} maxWidth={width}>{saved.name}</MinecraftDisclosureText></output><output aria-label="Saved world"><MinecraftDisclosureText scale={scale} maxWidth={width}>{saved.world}</MinecraftDisclosureText></output></> : <MinecraftDisclosureText scale={scale} maxWidth={width}>Save an empty form to try validation.</MinecraftDisclosureText>}</div>
  </>
}
