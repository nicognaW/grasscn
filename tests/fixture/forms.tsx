import * as React from "react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "../../registry/ui/form";
import { Field, FieldSet, FieldLegend, FieldGroup, FieldLabel, FieldTitle, FieldContent, FieldDescription, FieldSeparator, FieldError } from "../../registry/ui/field";
import { Input } from "../../registry/ui/input";
import { Button } from "../../registry/ui/button";
export function FormsFixture() {
    const q = new URLSearchParams(location.search), component = q.get("component") ?? "form", native = q.has("native"), part = q.get("part") ?? "label", scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3, text = q.get("label") ?? "Player name", [saved, setSaved] = React.useState(""), [disabled, setDisabled] = React.useState(false), ref = React.useRef<HTMLLabelElement>(null), [tag, setTag] = React.useState("");
    const form = useForm({ defaultValues: { name: "" }, mode: "onSubmit" }), common = { id: "subject", scale, maxWidth: q.has("wrapWidth") ? Number(q.get("wrapWidth")) : undefined, align: q.get("align") === "center" ? "center" as const : "left" as const, style: { position: "fixed" as const, left: Number(q.get("x") ?? 16) * scale, top: Number(q.get("y") ?? 16) * scale, width: Number(q.get("width") ?? 200) * scale, height: Number(q.get("height") ?? 9) * scale }, "data-subject": "true" };
    React.useLayoutEffect(() => { document.documentElement.style.background = document.body.style.background = q.get("background") ?? "#202020"; }, []);
    if (native) {
        if (component === "field") {
            const C = { label: FieldLabel, legend: FieldLegend, title: FieldTitle, description: FieldDescription }[part] ?? FieldLabel;
            return <C {...common}>{text}</C>;
        }
        return <Form {...form}><FormField control={form.control} name="name" render={() => <FormItem>{part === "label" ? <FormLabel {...common}>{text}</FormLabel> : part === "description" ? <FormDescription {...common}>{text}</FormDescription> : <FormMessage {...common}>{text}</FormMessage>}</FormItem>}/></Form>;
    }
    if (component === "form")
        return <Form {...form}><form onSubmit={form.handleSubmit(v => setSaved(v.name))}><FormField name="name" control={form.control} rules={{ required: "Enter a player name", minLength: { value: 2, message: "Use at least two characters" } }} render={({ field }) => <FormItem><FormLabel scale={scale} ref={ref}>Player name</FormLabel><FormControl render={<Input {...field} scale={scale} disabled={disabled}/>}/><FormDescription scale={scale}>Your name in the world.</FormDescription><FormMessage scale={scale}/></FormItem>}/><Button scale={scale} type="submit">Save player</Button><button type="button" onClick={() => form.reset()}>Reset</button><button type="button" onClick={() => setDisabled(v => !v)}>Disable field</button><button type="button" onClick={() => setTag(ref.current?.tagName ?? "")}>Read ref</button><output aria-label="Saved player">{saved}</output><output aria-label="Label ref">{tag}</output></form></Form>;
    return <FieldSet disabled={disabled}><FieldLegend scale={scale}>World settings</FieldLegend><FieldGroup><Field orientation={(q.get("orientation") ?? "vertical") as "vertical" | "horizontal" | "responsive"}><FieldLabel htmlFor="world" scale={scale} ref={ref}>World name</FieldLabel><FieldContent><Input id="world" scale={scale}/><FieldDescription scale={scale}>Enter a name for your world.</FieldDescription><FieldError scale={scale} errors={q.has("errors") ? [{ message: "Required" }, { message: "Required" }, { message: "Try another name" }] : []}/></FieldContent></Field><FieldSeparator>Or</FieldSeparator><FieldTitle scale={scale}>More settings</FieldTitle></FieldGroup><button type="button" onClick={() => setDisabled(v => !v)}>Disable fields</button><button type="button" onClick={() => setTag(ref.current?.tagName ?? "")}>Read ref</button><output aria-label="Label ref">{tag}</output></FieldSet>;
}
