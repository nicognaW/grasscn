import * as React from "react";
import { Badge } from "../../registry/ui/badge";
import { Typography, TypographyH1, TypographyH2, TypographyH3, TypographyH4, TypographyP, TypographySmall, TypographyBlockquote, TypographyInlineCode, TypographyLead, TypographyLarge, TypographyMuted } from "../../registry/ui/typography";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from "../../registry/ui/breadcrumb";
import { Kbd, KbdGroup } from "../../registry/ui/kbd";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "../../registry/ui/empty";
const q = new URLSearchParams(location.search), scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3, component = q.get("component") ?? "badge", state = q.get("state") ?? "normal", text = q.get("text") ?? q.get("label") ?? "Minecraft", native = q.has("native"), part = q.get("part") ?? "default";
const nativeStyle = { left: Number(q.get("x") ?? 16) * scale, top: Number(q.get("y") ?? 16) * scale, width: q.has("width") ? Number(q.get("width")) * scale : undefined, height: q.has("height") ? Number(q.get("height")) * scale : undefined, position: "fixed" } as React.CSSProperties;
function TextComponentsFixture() {
    React.useLayoutEffect(() => { document.documentElement.style.background = q.get("background") ?? "#202020"; document.body.style.background = q.get("background") ?? "#202020"; }, []);
    const [events, setEvents] = React.useState(0), [tag, setTag] = React.useState(""), ref = React.useRef<any>(null), width = q.has("wrapWidth") ? Number(q.get("wrapWidth")) : undefined, align = q.get("align") === "center" ? "center" : "left", rich = q.has("rich") ? <strong data-testid="rich">{text}</strong> : text;
    const common = { id: "subject", ref, style: nativeStyle, onClick: () => setEvents(n => n + 1), "data-subject": "true" };
    let subject: React.ReactNode;
    if (component === "empty")
        subject = native ? (part === "title" ? <EmptyTitle {...common} scale={scale} maxWidth={width} align={align}>{text}</EmptyTitle> : part === "description" ? <EmptyDescription {...common} scale={scale} maxWidth={width} align={align}>{text}</EmptyDescription> : <Empty {...common} scale={scale}>{text}</Empty>) : <Empty scale={scale} ref={ref}><EmptyHeader><EmptyMedia><span data-testid="media">*</span></EmptyMedia><EmptyTitle>No worlds found</EmptyTitle><EmptyDescription maxWidth={160}>Create a world to begin your adventure.</EmptyDescription></EmptyHeader><EmptyContent><button onClick={() => setEvents(n => n + 1)}>Create world</button></EmptyContent></Empty>;
    else if (component === "badge")
        subject = <Badge render={q.has("asChild") ? <a href="#destination"/> : undefined} scale={scale} maxWidth={width} {...common} style={native ? { ...nativeStyle, left: (Number(q.get("x") ?? 16) + 8) * scale, top: (Number(q.get("y") ?? 16) + 8) * scale, width: q.has("width") ? (Number(q.get("width")) - 16) * scale : undefined, height: q.has("height") ? (Number(q.get("height")) - 16) * scale : undefined } : nativeStyle}>{rich}</Badge>;
    else if (component === "kbd")
        subject = <Kbd scale={scale} {...common} tabIndex={q.has("tabIndex") || state === "focus" ? 0 : undefined} aria-disabled={state.startsWith("disabled") ? true : undefined}>{rich}</Kbd>;
    else if (component === "typography") {
        const parts: any = { default: Typography, h1: TypographyH1, h2: TypographyH2, h3: TypographyH3, h4: TypographyH4, p: TypographyP, small: TypographySmall, blockquote: TypographyBlockquote, code: TypographyInlineCode, lead: TypographyLead, large: TypographyLarge, muted: TypographyMuted }, Component = parts[part] ?? Typography;
        subject = <Component render={q.has("asChild") ? <a href="#destination"/> : undefined} {...common} scale={scale} maxWidth={width} align={align}>{rich}</Component>;
    }
    else if (component === "breadcrumb" && native)
        subject = part === "page" ? <BreadcrumbPage {...common} scale={scale} maxWidth={width} align={align}>{text}</BreadcrumbPage> : <BreadcrumbLink render={q.has("asChild") ? <a /> : undefined} {...common} scale={scale} maxWidth={width} align={align} href="#destination">{text}</BreadcrumbLink>;
    else
        subject = <Breadcrumb scale={scale}><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="#home">Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbLink render={<a href="#world"/>}>{"World"}</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage ref={ref}>Current page</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>;
    return <>{subject}<button id="read-ref" style={{ position: "absolute", top: 1500 }} onClick={() => setTag(ref.current?.tagName ?? "")}>Read ref</button><output id="tag" style={{ position: "absolute", top: 1540 }}>{tag}</output><output id="events" style={{ position: "absolute", top: 1580 }}>{events}</output><KbdGroup style={{ display: "none" }}><Kbd>Ctrl</Kbd><Kbd>C</Kbd></KbdGroup></>;
}
export { TextComponentsFixture };
