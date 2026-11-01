import * as React from "react";
import { CodeBlock, CodeBlockContent } from "../../../../apps/web/registry/ui/code-block";
import { Trace, TraceLine, TraceTitle } from "../../../../apps/web/registry/ui/trace";
import { MessageScrollerProvider, MessageScroller, MessageScrollerViewport, MessageScrollerContent, MessageScrollerItem } from "../../../../apps/web/registry/ui/message-scroller";
import { Skeleton } from "./legacy-skeleton";
import { Spinner } from "../../../../apps/web/registry/ui/spinner";
export function NativeTextCompositionsFixture() {
    const q = new URLSearchParams(location.search), component = q.get("component") ?? q.get("part") ?? "code-block", scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3, label = q.get("label") ?? "Hello Minecraft!", width = Number(q.get("width") ?? 172), height = Number(q.get("height") ?? 9), style = { position: "fixed", left: Number(q.get("x") ?? 16) * scale, top: Number(q.get("y") ?? 16) * scale, width: width * scale, height: height * scale, color: q.get("color") ?? "#fff", "--mc-scale": scale, "--mc-pixel": scale + "px" } as React.CSSProperties, nativeTextStyle = { ...style, padding: `${scale}px ${8 * scale}px 0 ${4 * scale}px`, background: "rgba(0,0,0,.4980392156862745)", overflow: "hidden" };
    React.useLayoutEffect(() => { document.documentElement.style.background = q.get("background") ?? "#202020"; document.body.style.background = q.get("background") ?? "#202020"; }, []);
    if (component === "skeleton")
        return <Skeleton id="subject" scale={scale} style={style} data-subject="true"/>;
    if (component === "spinner")
        return <Spinner id="subject" scale={scale} logicalWidth={width} timeMs={Number(q.get("timeMs") ?? 0)} style={style} data-subject="true"/>;
    if (component === "trace")
        return <Trace scale={scale}><TraceLine id="subject" style={{ ...nativeTextStyle, display: "block" }} data-subject="true"><TraceTitle style={{ display: "block", width: "100%" }}>{label}</TraceTitle></TraceLine></Trace>;
    if (component === "message-scroller")
        return <MessageScrollerProvider autoScroll={false} defaultScrollPosition="start"><MessageScroller scale={scale} style={{ position: "fixed", inset: 0 }}><MessageScrollerViewport><MessageScrollerContent><MessageScrollerItem id="subject" style={style} data-subject="true">{label}</MessageScrollerItem></MessageScrollerContent></MessageScrollerViewport></MessageScroller></MessageScrollerProvider>;
    return <CodeBlock scale={scale} style={{ border: 0, background: "transparent" }}><CodeBlockContent id="subject" style={nativeTextStyle} data-subject="true">{label}</CodeBlockContent></CodeBlock>;
}
