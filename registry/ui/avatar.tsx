"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftRender, type MinecraftProps } from "./minecraft-render";
import * as React from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { Label } from "./label";
import { minecraftAvatarSkins, type MinecraftAvatarSkin } from "./minecraft-avatar-assets";
import { paintMinecraftAvatar } from "./minecraft-avatar-paint";
import "./minecraft-avatar.css";
const AvatarContext = React.createContext<1 | 2 | 3>(2);
type AvatarProps = MinecraftProps<typeof AvatarPrimitive.Root> & {
    size?: "default" | "sm" | "lg";
    scale?: 1 | 2 | 3;
};
function Avatar({ size = "default", scale: providedScale, className, style, ...props }: AvatarProps) {
    const inherited = React.useContext(AvatarContext), scale = providedScale ?? inherited;
    if (!['default', 'sm', 'lg'].includes(size))
        throw Error('Unsupported native avatar size');
    return <AvatarContext.Provider value={scale}><AvatarPrimitive.Root data-slot="avatar" data-size={size} className={cn(`mc-avatar ${""}`, className)} style={minecraftStyle(style, __style => ({ '--mc-scale': scale, '--mc-avatar-size': { sm: 12, default: 16, lg: 20 }[size], ...__style } as React.CSSProperties))} {...props}/></AvatarContext.Provider>;
}
function MinecraftAvatarFace({ skin, hat, upsideDown }: {
    skin: MinecraftAvatarSkin;
    hat: boolean;
    upsideDown: boolean;
}) {
    const scale = React.useContext(AvatarContext), ref = React.useRef<HTMLCanvasElement>(null);
    React.useLayoutEffect(() => {
        const canvas = ref.current!;
        let frame = 0, signature = '';
        const paint = () => {
            const b = canvas.getBoundingClientRect(), key = [b.x, b.y, b.width, b.height, innerWidth, innerHeight].join();
            if (signature !== key) {
                signature = key;
                canvas.dataset.ready = String(paintMinecraftAvatar(canvas, skin, hat, upsideDown, scale));
            }
        };
        const tick = () => { paint(); frame = requestAnimationFrame(tick); };
        tick();
        return () => cancelAnimationFrame(frame);
    }, [skin, hat, upsideDown, scale]);
    return <canvas ref={ref} data-mc-avatar-face="" aria-hidden="true"/>;
}
type AvatarImageProps = MinecraftProps<typeof AvatarPrimitive.Image> & {
    skin?: MinecraftAvatarSkin;
    hat?: boolean;
    upsideDown?: boolean;
};
function AvatarImage({ skin, hat = true, upsideDown = false, className, style, onLoadingStatusChange, src, ...props }: AvatarImageProps) { const [loaded, setLoaded] = React.useState(false); return <><AvatarPrimitive.Image data-slot="avatar-image" className={cn(`mc-avatar-image ${skin ? 'mc-avatar-skin' : ''} ${""}`, className)} style={style} {...props} src={skin ? minecraftAvatarSkins[skin].png : src} onLoadingStatusChange={status => { setLoaded(status === 'loaded'); onLoadingStatusChange?.(status); }}/>{skin && loaded && <MinecraftAvatarFace skin={skin} hat={hat} upsideDown={upsideDown}/>}</>; }
function AvatarFallback({ children, className, maxWidth, align = "left", ...props }: MinecraftProps<typeof AvatarPrimitive.Fallback> & {
    maxWidth?: number;
    align?: "left" | "center";
}) { const scale = React.useContext(AvatarContext); return <AvatarPrimitive.Fallback data-slot="avatar-fallback" className={cn(`mc-avatar-fallback ${""}`, className)} {...props}>{children == null ? <MinecraftAvatarFace skin="wide/steve" hat upsideDown={false}/> : typeof children === 'string' || typeof children === 'number' ? <Label scale={scale} maxWidth={maxWidth} align={align}>{children}</Label> : children}</AvatarPrimitive.Fallback>; }
function AvatarBadge({ className, ...props }: MinecraftProps<'span'>) { return <span data-slot="avatar-badge" className={cn(`mc-avatar-badge ${""}`, className)} {...props}/>; }
function groupScale(children: React.ReactNode): 1 | 2 | 3 | undefined {
    for (const child of React.Children.toArray(children)) {
        if (!React.isValidElement<{
            scale?: 1 | 2 | 3;
            children?: React.ReactNode;
        }>(child))
            continue;
        if (child.type === Avatar && child.props.scale != null)
            return child.props.scale;
        if (child.type === React.Fragment) {
            const scale = groupScale(child.props.children);
            if (scale != null)
                return scale;
        }
    }
}
function AvatarGroup({ className, scale: providedScale, style, children, ...props }: MinecraftProps<'div'> & {
    scale?: 1 | 2 | 3;
}) { const inherited = React.useContext(AvatarContext), scale = providedScale ?? groupScale(children) ?? inherited; return <AvatarContext.Provider value={scale}><div data-slot="avatar-group" className={cn(`mc-avatar-group ${""}`, className)} style={minecraftStyle(style, __style => ({ '--mc-scale': scale, ...__style } as React.CSSProperties))} {...props}>{children}</div></AvatarContext.Provider>; }
function AvatarGroupCount({ children, className, ...props }: MinecraftProps<'div'>) { const scale = React.useContext(AvatarContext); return <div data-slot="avatar-group-count" className={cn(`mc-avatar-group-count ${""}`, className)} {...props}>{typeof children === 'string' || typeof children === 'number' ? <Label scale={scale}>{children}</Label> : children}</div>; }
export { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, AvatarGroupCount };
export type { AvatarProps, AvatarImageProps, MinecraftAvatarSkin };
