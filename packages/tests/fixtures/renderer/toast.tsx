import * as React from "react";
import { setMinecraftSoundVolume } from "../../../../apps/web/registry/ui/minecraft-sound";
import { Toaster, toast as notify } from "../../../../apps/web/registry/ui/sonner";
const p = new URLSearchParams(location.search), scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3, count = Number(p.get("count") ?? 1);
function SonnerFixture() {
    const [actions, setActions] = React.useState(0), [created, setCreated] = React.useState(0), ids = React.useRef<Array<string | number>>([]);
    const show = () => {
        for (let i = 0; i < count; i++)
            ids.current.push(notify(p.has("rich") ? <strong>{p.get("label") ?? "World saved"}</strong> : p.get("label") ?? "World saved", { ...(p.has("text") ? { description: p.get("text")! } : {}), ...(p.has("actions") ? { action: { label: "Undo", onClick: event => {
                            setActions(v => v + 1);
                            if (p.has("cancelAction"))
                                event.preventDefault();
                        } }, closeButton: true } : {}), dismissible: !p.has("disabled"), duration: Number(p.get("duration") ?? 5000) }));
        setCreated(v => v + count);
    };
    React.useEffect(() => {
        if (!p.has("closed"))
            show();
    }, []);
    const x = Number(p.get("x") ?? 16) * scale, y = Number(p.get("y") ?? 16) * scale, width = Number(p.get("width") ?? 190) * scale, height = Number(p.get("height") ?? 32) * scale;
    return <><Toaster scale={scale} position="top-right" offset={p.has("native") ? { top: y, right: innerWidth - x - width } : 0}/><div id="subject" style={{ position: "fixed", left: x, top: y, width, height, pointerEvents: "none" }} data-subject="true"/>
 <button id="open" onClick={show}>Open toast</button><button id="close" onClick={() => notify.dismiss()}>Close toast</button><button id="update" onClick={() => notify("Updated 世界", { id: ids.current[0], description: "こんにちは" })}>Update toast</button><button id="promise" onClick={() => notify.promise(Promise.resolve("Saved"), { loading: "Saving world", success: "World saved", error: "Save failed" })}>Save promise</button><output id="actions">{actions}</output><output id="created">{created}</output></>;
}
function StrictFixture() {
    const [tag, setTag] = React.useState(""), ref = React.useRef<HTMLElement>(null);
    return <><Toaster ref={ref}/><button id="show" onClick={() => notify("World saved")}>Show</button><button id="read-ref" onClick={() => setTag(ref.current?.tagName ?? "")}>Read ref</button><output id="ref-tag">{tag}</output></>;
}
export function ToastFixture() {
    document.documentElement.style.background = p.get("background") ?? "#202020";
    document.body.style.background = p.get("background") ?? "#202020";
    if (p.has("native")) setMinecraftSoundVolume(0);
    else if (p.has("volume")) setMinecraftSoundVolume(Number(p.get("volume")));
    return p.get("component") === "sonner-strict" ? <React.StrictMode><StrictFixture /></React.StrictMode> : <SonnerFixture />;
}
