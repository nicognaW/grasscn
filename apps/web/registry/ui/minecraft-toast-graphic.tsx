import * as React from "react";
import { toastLayout } from "./minecraft-toast-layout";
import { paintToast } from "./minecraft-toast-gpu";
export type ToastMotion = {
    phase: "entering" | "exiting" | "shown" | "hidden";
    start: number;
};
export function MinecraftToastGraphic({ title, message, scale, motion, onLayout }: {
    title: string;
    message: string | null;
    scale: 1 | 2 | 3;
    motion: React.RefObject<ToastMotion>;
    onLayout?: (width: number, height: number) => void;
}) {
    const ref = React.useRef<HTMLCanvasElement>(null), [ready, setReady] = React.useState(false);
    React.useLayoutEffect(() => {
        let disposed = false, frame = 0, signature = "";
        setReady(false);
        const canvas = ref.current!;
        toastLayout(title, message).then(layout => {
            if (disposed)
                return;
            onLayout?.(layout.width, layout.height);
            const paint = () => {
                if (disposed)
                    return;
                const bounds = canvas.getBoundingClientRect(), state = motion.current, elapsed = Math.max(0, Math.min(600, Date.now() - state.start)), t = Math.fround(elapsed / 600), square = Math.fround(t * t);
                const portion = state.phase === "hidden" ? 0 : state.phase === "shown" ? 1 : state.phase === "exiting" ? Math.fround(1 - square) : square;
                const offset = Math.fround(layout.width - Math.fround(layout.width * portion)), next = JSON.stringify([bounds.x, bounds.y, innerWidth, innerHeight, offset]);
                if (signature !== next) {
                    signature = next;
                    const painted = layout.supported && paintToast(canvas, bounds, layout.width, layout.height, scale, offset, layout.title, layout.message);
                    setReady(painted);
                }
            };
            const tick = () => { paint(); frame = requestAnimationFrame(tick); };
            tick();
            window.addEventListener("resize", paint);
            window.addEventListener("scroll", paint, true);
            cleanup = () => { window.removeEventListener("resize", paint); window.removeEventListener("scroll", paint, true); };
        });
        let cleanup = () => { };
        return () => { disposed = true; cancelAnimationFrame(frame); cleanup(); };
    }, [title, message, scale, motion, onLayout]);
    return <canvas ref={ref} data-mc-toast-ready={ready} aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none", visibility: ready ? "visible" : "hidden" }}/>;
}
