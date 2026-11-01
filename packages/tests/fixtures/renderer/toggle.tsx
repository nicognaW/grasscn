import * as React from "react";
import { Toggle, toggleVariants } from "../../../../apps/web/registry/ui/toggle";
const p = new URLSearchParams(location.search), scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3, state = p.get("state") ?? "normal";
export function ToggleFixture() {
    React.useLayoutEffect(() => { document.documentElement.style.background = p.get("background") ?? "#202020"; document.body.style.margin = "0"; }, []);
    const [pressed, setPressed] = React.useState(p.get("checked") === "true"), [events, setEvents] = React.useState(0), [tag, setTag] = React.useState("");
    const ref = React.useRef<HTMLButtonElement>(null), asChild = p.has("asChild"), anchor = p.has("anchor"), label = p.get("label") ?? "Recipe filter";
    return <><Toggle render={asChild ? anchor ? <a href="#target"/> : <button /> : undefined} id="subject" ref={ref} scale={scale} style={{ position: "absolute", left: Number(p.get("x") ?? 16) * scale, top: Number(p.get("y") ?? 16) * scale }} aria-label={label} disabled={state.startsWith("disabled")} {...(p.has("controlled") ? { pressed, onPressedChange: (next: boolean) => {
            setEvents(v => v + 1);
            if (!p.has("reject"))
                setPressed(next);
        } } : { defaultPressed: pressed, onPressedChange: () => setEvents(v => v + 1) })} onClick={event => {
            if (p.has("cancel")) {event.preventDefault();event.preventBaseUIHandler();}
        }} data-subject="true">{p.get("text")}</Toggle><button id="external" onClick={() => setPressed(v => !v)} style={{ position: "absolute", top: 400 }}>External</button><button id="read-ref" onClick={() => setTag(ref.current?.tagName ?? "")} style={{ position: "absolute", top: 440 }}>Read ref</button>
 <output id="events" style={{ position: "absolute", top: 480 }}>{events}</output><output id="tag" style={{ position: "absolute", top: 520 }}>{tag}</output><span id="helper" className={toggleVariants()} style={{ display: "none" }}/></>;
}
