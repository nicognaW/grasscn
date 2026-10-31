import * as React from "react";
import { paintToast } from "./minecraft-toast-gpu";
import type { ToastMotion } from "./minecraft-toast-graphic";
export function MinecraftToastBackdrop({ scale, motion }: {
    scale: 1 | 2 | 3;
    motion: React.RefObject<ToastMotion>;
}) {
    const ref = React.useRef<HTMLCanvasElement>(null);
    React.useLayoutEffect(() => {
        let frame = 0, signature = "", disposed = false;
        const canvas = ref.current!;
        const paint = () => {
            if (disposed)
                return;
            const b = canvas.getBoundingClientRect(), width = Math.max(1, Math.round(b.width / scale)), height = Math.max(1, Math.round(b.height / scale)), state = motion.current, t = Math.fround(Math.max(0, Math.min(600, Date.now() - state.start)) / 600), portion = state.phase === "hidden" ? 0 : state.phase === "shown" ? 1 : state.phase === "exiting" ? Math.fround(1 - Math.fround(t * t)) : Math.fround(t * t), offset = Math.fround(width - Math.fround(width * portion)), next = JSON.stringify([b.x, b.y, width, height, innerWidth, innerHeight, offset]);
            if (next !== signature) {
                signature = next;
                paintToast(canvas, b, width, height, scale, offset, [], []);
            }
        };
        const tick = () => { paint(); frame = requestAnimationFrame(tick); };
        tick();
        window.addEventListener("resize", paint);
        return () => { disposed = true; cancelAnimationFrame(frame); window.removeEventListener("resize", paint); };
    }, [scale, motion]);
    return <canvas ref={ref} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}/>;
}
