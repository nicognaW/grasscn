"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftRender, type MinecraftProps, type MinecraftPolymorphicProps } from "./minecraft-render";
import * as React from 'react';
;
import { cva, type VariantProps } from 'class-variance-authority';
import { Label, type LabelProps } from './label';
import { minecraftSeparatorAssets } from './minecraft-separator-assets';
import './minecraft-marker.css';
const MarkerScale = React.createContext<1 | 2 | 3>(2);
const markerVariants = cva('mc-marker', { variants: { variant: { default: '', separator: 'mc-marker-separated', border: 'mc-marker-border' } }, defaultVariants: { variant: 'default' } });
type MarkerProps = MinecraftPolymorphicProps<'div'> & VariantProps<typeof markerVariants> & {
    scale?: 1 | 2 | 3;
    separatorEdge?: 'header' | 'footer';
};
function Marker({ variant = 'default', render, scale = 2, separatorEdge = 'header', className, children, style, ...props }: MarkerProps) {
    if (!['default', 'separator', 'border'].includes(variant ?? 'default'))
        throw Error('Unsupported Minecraft marker layout');
    const Root = MinecraftRender, child = null, content = children;
    const contents = typeof content === 'string' || typeof content === 'number' ? <MarkerContent>{content}</MarkerContent> : content;
    return <MarkerScale value={scale}><Root render={render} as="div" data-slot="marker" data-variant={variant} className={cn(markerVariants({ variant }), className)} style={minecraftStyle(style, __style => ({ '--mc-scale': scale, '--mc-marker-separator': `url("${minecraftSeparatorAssets[separatorEdge]}")`, ...__style } as React.CSSProperties))} {...props}>{contents}</Root></MarkerScale>;
}
function MarkerIcon({ className, ...props }: MinecraftProps<'span'>) { return <span data-slot="marker-icon" aria-hidden="true" className={cn(`mc-marker-icon ${""}`, className)} {...props}/>; }
function MarkerContent({ className, children, maxWidth, align = 'left', ...props }: MinecraftProps<'span'> & Pick<LabelProps, 'maxWidth' | 'align'>) { const scale = React.useContext(MarkerScale); return <span data-slot="marker-content" className={cn(`mc-marker-content ${""}`, className)} {...props}>{typeof children === 'string' || typeof children === 'number' ? <Label scale={scale} maxWidth={maxWidth} align={align} style={{ width: "100%" }}>{children}</Label> : children}</span>; }
export { Marker, MarkerIcon, MarkerContent, markerVariants };
export type { MarkerProps };
