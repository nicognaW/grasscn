"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftRender, type MinecraftProps } from "./minecraft-render";
import { DirectionProvider as BaseDirectionProvider, useDirection as baseDirection } from "@base-ui/react/direction-provider";
import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { MinecraftSurface } from "./minecraft-surface";
import { MinecraftText } from "./minecraft-text";
import { minecraftSliderSprites as sprites } from "./minecraft-slider-sprites";
import "./minecraft-slider.css";
import { playMinecraftClick } from "./minecraft-sound";
function Slider({ className, defaultValue, value, ref, min = 0, max = 100, scale = 2, label, style, disabled, orientation = "horizontal", dir: direction, onValueChange, onFocusCapture, onBlurCapture, onKeyDown, onMouseEnter, onMouseLeave, onPointerDownCapture, onPointerUpCapture, onPointerCancelCapture, ...props }: MinecraftProps<typeof SliderPrimitive.Root> & {
    scale?: 1 | 2 | 3;
    label?: string;
}) {
    const initialValue = React.useRef(defaultValue ?? [min, max]);
    const [uncontrolled, setUncontrolled] = React.useState(initialValue.current);
    const root = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => root.current!);
    React.useEffect(() => {
        if (value !== undefined)
            return;
        const input = root.current?.querySelector("input");
        const form = input?.form ?? root.current?.closest("form");
        if (!form)
            return;
        // The bitmap value and the primitive must reset together in ordinary HTML forms.
        const reset = (event: Event) => queueMicrotask(() => { if (!event.defaultPrevented)
            setUncontrolled(initialValue.current); });
        form.addEventListener("reset", reset);
        return () => form.removeEventListener("reset", reset);
    }, [value, props.form]);
    const inheritedDirection = baseDirection();
    const dir = direction === "rtl" || direction === "ltr" ? direction : inheritedDirection;
    const currentValue = value ?? uncontrolled;
    const values = Array.isArray(currentValue) ? currentValue : [currentValue as number];
    const [editing, setEditing] = React.useState(false);
    const [focused, setFocused] = React.useState(false);
    const [hovered, setHovered] = React.useState(false);
    const pressed = React.useRef(false);
    const highlightTrack = !disabled && focused && !editing;
    const highlightHandle = !disabled && (hovered || (focused && editing));
    return <BaseDirectionProvider direction={dir}><SliderPrimitive.Root ref={root} data-slot="slider" className={cn("mc-slider", className)} min={min} max={max} value={value ?? uncontrolled} defaultValue={defaultValue ?? [min, max]} disabled={disabled} orientation={orientation} thumbAlignment="edge" style={minecraftStyle(style, __style => ({ "--mc-scale": scale, ...__style } as React.CSSProperties))} onValueChange={(next, details) => { onValueChange?.(next, details); if (!details.isCanceled)
        setUncontrolled(next); }} onFocusCapture={event => {
            onFocusCapture?.(event);
            if (!event.defaultPrevented) {
                setFocused(true);
                setEditing(true);
            }
        }} onBlurCapture={event => {
            onBlurCapture?.(event);
            if (!event.currentTarget.contains(event.relatedTarget)) {
                setFocused(false);
                setEditing(false);
            }
        }} onKeyDown={event => {
            onKeyDown?.(event);
            if (!event.defaultPrevented && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                setEditing(current => !current);
            }
        }} onMouseEnter={event => {
            onMouseEnter?.(event);
            if (!event.defaultPrevented)
                setHovered(true);
        }} onMouseLeave={event => {
            onMouseLeave?.(event);
            if (!event.defaultPrevented)
                setHovered(false);
        }} {...props} onPointerDownCapture={event => { onPointerDownCapture?.(event); pressed.current = !disabled && !event.defaultPrevented && event.button === 0; }} onPointerUpCapture={event => {
            onPointerUpCapture?.(event);
            if (pressed.current && !disabled && !event.defaultPrevented)
                playMinecraftClick();
            pressed.current = false;
        }} onPointerCancelCapture={event => { pressed.current = false; onPointerCancelCapture?.(event); }}>
    <SliderPrimitive.Control style={{ position: "absolute", inset: 0 }}>
    <SliderPrimitive.Track style={{ position: "absolute", inset: 0 }} data-slot="slider-track" className="mc-slider-track">
      <MinecraftSurface sprite={highlightTrack ? sprites.slider_highlighted : sprites.slider}/>
      <SliderPrimitive.Indicator data-slot="slider-range" className="mc-slider-range"/>
    </SliderPrimitive.Track>
    {values.map((current, index) => {
            const fraction = max === min ? 0 : Math.min(1, Math.max(0, (current - min) / (max - min)));
            const reverse = orientation === "horizontal" ? dir === "rtl" : true;
            return <span key={index} className="mc-slider-position" style={{ "--mc-thumb-fraction": reverse ? 1 - fraction : fraction } as React.CSSProperties}>
        <SliderPrimitive.Thumb data-slot="slider-thumb" className="mc-slider-thumb" aria-label={values.length === 1 ? props["aria-label"] : undefined} aria-labelledby={values.length === 1 ? props["aria-labelledby"] : undefined}>
          <span className="mc-slider-handle"><MinecraftSurface sprite={highlightHandle ? sprites.slider_handle_highlighted : sprites.slider_handle}/></span>
        </SliderPrimitive.Thumb>
      </span>;
        })}
    {label != null && <MinecraftText className="mc-slider-label">{label}</MinecraftText>}
  </SliderPrimitive.Control></SliderPrimitive.Root></BaseDirectionProvider>;
}
export { Slider };
