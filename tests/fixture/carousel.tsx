import * as React from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "../../registry/ui/carousel";
const p = new URLSearchParams(location.search), scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3, vertical = p.has("vertical"), cancel = p.has("cancel");
export function CarouselFixture() {
    React.useLayoutEffect(() => { const bg = p.get("background") ?? "#202020", html = document.documentElement.style.background, body = document.body.style.background; document.documentElement.style.background = bg; document.body.style.background = bg; return () => { document.documentElement.style.background = html; document.body.style.background = body; }; }, []);
    const [api, setApi] = React.useState<CarouselApi>(), [index, setIndex] = React.useState(0), [events, setEvents] = React.useState(0), [count, setCount] = React.useState(3);
    React.useEffect(() => {
        if (!api)
            return;
        const update = () => setIndex(api.selectedScrollSnap());
        update();
        api.on("select", update).on("reInit", update);
        return () => { api.off("select", update).off("reInit", update); };
    }, [api]);
    const backward = p.get("direction") === "backward", Arrow = backward ? CarouselPrevious : CarouselNext;
    if (p.has("native"))
        return <Carousel scale={scale} style={{ position: "fixed", left: Number(p.get("x") ?? 16) * scale, top: Number(p.get("y") ?? 16) * scale, width: 12 * scale, height: 17 * scale }}><Arrow id="subject" disabled={(p.get("state") ?? "").startsWith("disabled")} style={{ position: "static", transform: "none" }} data-subject="true"/></Carousel>;
    return <><Carousel aria-label="Saved worlds" setApi={setApi} scale={scale} orientation={vertical ? "vertical" : "horizontal"} opts={{ loop: p.has("loop"), direction: p.has("rtl") ? "rtl" : "ltr", duration: 0 }} dir={p.has("rtl") ? "rtl" : undefined} style={{ width: 300, height: vertical ? 180 : undefined }} onKeyDownCapture={event => {
            if (p.has("cancelKeys"))
                event.preventDefault();
        }}><CarouselContent>{Array.from({ length: count }, (_, i) => <CarouselItem key={i} style={{ height: 180, background: ["#505050", "#303030", "#707070"][i % 3], display: "grid", placeItems: "center" }}><span>World {i + 1}</span><input aria-label={`World ${i + 1} name`}/></CarouselItem>)}</CarouselContent><CarouselPrevious id="previous" onClick={event => {
            setEvents(v => v + 1);
            if (cancel)
                event.preventDefault();
        }}/><CarouselNext id="next" onClick={event => {
            setEvents(v => v + 1);
            if (cancel)
                event.preventDefault();
        }}/></Carousel><button id="api" onClick={() => api?.scrollTo(2, true)}>API scroll</button><button id="add" onClick={() => setCount(v => v + 1)}>Add slide</button><button id="reinit" onClick={() => api?.reInit()}>Reinit</button><output id="index">{index}</output><output id="events">{events}</output></>;
}
