import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@grasscn/web/ui/toggle-group";
const p = new URLSearchParams(location.search), scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3, state = p.get("state") ?? "normal";
export function ToggleGroupFixture() {
    const initial = p.get("checked") === "true" ? ["one"] : [], [value, setValue] = React.useState(initial), [events, setEvents] = React.useState(0), [tag, setTag] = React.useState("");
    const root = React.useRef<HTMLDivElement>(null), item = React.useRef<HTMLButtonElement>(null), native = p.has("native"), multiple = p.get("type") === "multiple", controlled = p.has("controlled");
    React.useLayoutEffect(() => { document.documentElement.style.background = p.get("background") ?? "#202020"; document.body.style.margin = "0"; }, []);
    function changed(next: string[]) {
        setEvents(v => v + 1);
        if (!p.has("reject"))
            setValue(next);
    }
    const singleProps = controlled ? { value, onValueChange: changed } : { defaultValue: value, onValueChange: changed };
    const multipleProps = singleProps;
    const items = (native ? ["one"] : ["one", "two", "three"]).map((v, index) => <ToggleGroupItem render={p.has("asChild") ? <a href={`#${v}`}/> : undefined} key={v} value={v} id={index === 0 ? "subject" : `item-${v}`} ref={index === 0 ? item : undefined} aria-label={`Filter ${v}`} disabled={p.get("disabledItem") === v} onClick={event => {
            if (p.has("cancel")) {event.preventDefault();event.preventBaseUIHandler();}
        }} data-subject={(index === 0 ? "subject" : `item-${v}`) === "subject" ? "true" : undefined}>{p.has("asChild") ? <span>{p.get("text")}</span> : p.get("text")}</ToggleGroupItem>);
    const props = { ref: root, scale, orientation: p.get("orientation") === "vertical" ? "vertical" as const : "horizontal" as const, dir: p.get("dir") === "rtl" ? "rtl" as const : "ltr" as const, loopFocus: !p.has("noLoop"), disabled: state.startsWith("disabled"), "aria-label": "Recipe filters", style: { position: "absolute", left: Number(p.get("x") ?? 16) * scale, top: Number(p.get("y") ?? 16) * scale } as React.CSSProperties };
    return <>{multiple ? <ToggleGroup {...props} {...multipleProps} multiple={true}>{items}</ToggleGroup> : <ToggleGroup {...props} {...singleProps} multiple={false}>{items}</ToggleGroup>}
 <button id="external" onClick={() => setValue(v => v.length ? [] : ["two"])} style={{ position: "absolute", top: 400 }}>External</button><button id="read-ref" onClick={() => setTag(`${root.current?.tagName}/${item.current?.tagName}`)} style={{ position: "absolute", top: 440 }}>Read ref</button><output id="events" style={{ position: "absolute", top: 480 }}>{events}</output><output id="tag" style={{ position: "absolute", top: 520 }}>{tag}</output><output id="value" style={{ position: "absolute", top: 560 }}>{value.join(",")}</output></>;
}
