import * as React from "react";
import { MenuScaleContext } from "./minecraft-menu-text";
import { menuCheckboxPixels, retainMenuCheckboxPainter, releaseMenuCheckboxPainter } from "./minecraft-menu-checkbox-gpu";
export function MinecraftMenuCheckboxSprite() {
    const ref = React.useRef<HTMLCanvasElement>(null), scale = React.useContext(MenuScaleContext);
    React.useLayoutEffect(() => {
        const canvas = ref.current!, parent = canvas.parentElement!, item = parent.closest(".mc-menu-checkbox-item") ?? parent.parentElement!;
        const context = canvas.getContext("2d")!;
        let frame = 0, signature = "";
        retainMenuCheckboxPainter();
        const tick = () => {
            const bounds = parent.getBoundingClientRect(), checked = item.hasAttribute("data-checked"), highlighted = item.hasAttribute("data-highlighted");
            const name = checked ? highlighted ? "checkbox_selected_highlighted" : "checkbox_selected" : highlighted ? "checkbox_highlighted" : "checkbox";
            const next = JSON.stringify([name, bounds.x, bounds.y, innerWidth, innerHeight]);
            if (next !== signature) {
                signature = next;
                const pixels = menuCheckboxPixels(name, scale, bounds.x, bounds.y);
                canvas.width = canvas.height = 17 * scale;
                if (pixels)
                    context.putImageData(new ImageData(pixels, canvas.width, canvas.height), 0, 0);
                canvas.dataset.mcMenuSpriteReady = String(Boolean(pixels));
            }
            frame = requestAnimationFrame(tick);
        };
        tick();
        return () => { cancelAnimationFrame(frame); releaseMenuCheckboxPainter(); };
    }, [scale]);
    return <canvas ref={ref} aria-hidden="true" data-mc-menu-sprite-ready="false" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}/>;
}
