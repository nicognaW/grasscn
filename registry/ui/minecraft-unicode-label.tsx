"use client";
import * as React from "react";
import { minecraftGlyphs } from "./minecraft-font";
import { minecraftInputAssets } from "./minecraft-input-assets";
import { getUnihexGlyph, loadUnihex, paintUnihex } from "./minecraft-unifont";
import { positionUnihex, disposeUnihex, setUnihexAtlas, type UnihexAtlas } from "./minecraft-unifont-gpu";
let alpha: Promise<Uint8ClampedArray> | undefined;
function loadAlpha() {
    return alpha ??= new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 128;
            const context = canvas.getContext("2d")!;
            context.drawImage(image, 0, 0);
            resolve(context.getImageData(0, 0, 128, 128).data);
        };
        image.onerror = reject;
        image.src = minecraftInputAssets.atlas;
    });
}
const advance = (char: string) => minecraftGlyphs[char.codePointAt(0)! - 32]?.[2] ?? getUnihexGlyph(char)?.advance ?? 0;
export function MinecraftUnicodeLabel({ text, atlas }: {
    text: string;
    atlas?: UnihexAtlas;
}) {
    const root = React.useRef<HTMLSpanElement>(null), canvas = React.useRef<HTMLCanvasElement>(null);
    const [width, setWidth] = React.useState<number>(), [bitmap, setBitmap] = React.useState(false);
    React.useLayoutEffect(() => {
        let disposed = false, frame = 0, signature = "";
        const context = canvas.current!.getContext("2d")!;
        setUnihexAtlas(context, atlas);
        setBitmap(false);
        Promise.all([loadUnihex(), loadAlpha()]).then(([, pixels]) => {
            if (disposed)
                return;
            if (!Array.from(text).every(char => /^[\x20-\x7e]$/.test(char) || getUnihexGlyph(char))) {
                setWidth(undefined);
                return;
            }
            const logicalWidth = Math.ceil(Array.from(text).reduce((sum, char) => sum + advance(char), 0));
            setWidth(logicalWidth);
            const tick = () => {
                if (disposed)
                    return;
                const node = root.current!, style = getComputedStyle(node), scale = Number(style.getPropertyValue("--mc-scale")) || 2;
                const bounds = node.getBoundingClientRect(), ink = Number(style.color.match(/[\d.]+/g)?.[0] ?? 255);
                const next = JSON.stringify([scale, bounds.x, bounds.y, bounds.width, ink, innerWidth, innerHeight]);
                if (Math.abs(bounds.width - logicalWidth * scale) < .1 && next !== signature) {
                    signature = next;
                    context.canvas.width = Math.max(1, logicalWidth * scale);
                    context.canvas.height = 9 * scale;
                    context.imageSmoothingEnabled = false;
                    positionUnihex(context, bounds);
                    for (const shadow of [true, false]) {
                        let x = 0;
                        const color = shadow ? Math.floor(ink / 4) : ink;
                        context.fillStyle = `rgb(${color},${color},${color})`;
                        for (const char of text) {
                            const glyph = minecraftGlyphs[char.codePointAt(0)! - 32];
                            if (glyph) {
                                if (char !== " ")
                                    for (let y = 0; y < 8; y++)
                                        for (let px = 0; px < 8; px++)
                                            if (pixels[((glyph[1] + y) * 128 + glyph[0] + px) * 4 + 3])
                                                context.fillRect((x + px + Number(shadow)) * scale, (y + Number(shadow)) * scale, scale, scale);
                            }
                            else {
                                const glyph = getUnihexGlyph(char)!;
                                paintUnihex(context, glyph, x + (shadow ? .5 : 0), shadow ? .5 : 0, scale);
                            }
                            x += advance(char);
                        }
                    }
                    setBitmap(true);
                }
                frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
        }).catch(() => {
            if (!disposed)
                setBitmap(false);
        });
        return () => { disposed = true; cancelAnimationFrame(frame); disposeUnihex(context); };
    }, [text, atlas]);
    return <span ref={root} data-mc-label-ready={bitmap} style={{ display: "inline-block", position: "relative", width: width == null ? undefined : `calc(${width} * var(--mc-pixel))`, height: "calc(8 * var(--mc-pixel))", textShadow: "none" }}>
    <canvas ref={canvas} aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "calc(9 * var(--mc-pixel))", visibility: bitmap ? "visible" : "hidden", pointerEvents: "none" }}/>
    <span className={bitmap ? "mc-text-accessible" : undefined}>{text}</span>
  </span>;
}
