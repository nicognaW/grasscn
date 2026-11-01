"use client";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftRender, type MinecraftProps, type MinecraftPolymorphicProps } from "./minecraft-render";
import * as React from 'react';
;
import { Button } from './button';
import { MinecraftItemText, type MinecraftItemTextProps } from './minecraft-item-text';
import { MinecraftItemMedia } from './minecraft-item-media';
import { playMinecraftClick } from './minecraft-sound';
import './minecraft-item.css';
import './minecraft-attachment.css';
const AttachmentContext = React.createContext<{
    scale: 1 | 2 | 3;
    disabled: boolean;
}>({ scale: 2, disabled: false }), AttachmentClip = React.createContext<number | undefined>(undefined);
type AttachmentProps = MinecraftProps<'div'> & {
    state?: 'idle' | 'uploading' | 'processing' | 'error' | 'done';
    size?: 'default';
    orientation?: 'horizontal' | 'vertical';
    scale?: 1 | 2 | 3;
    selected?: boolean;
    disabled?: boolean;
};
function Attachment({ state = 'done', size = 'default', orientation = 'horizontal', scale = 2, selected = false, disabled = false, className, style, ref, onClickCapture, ...props }: AttachmentProps) {
    if (size !== 'default')
        throw Error('Minecraft attachment rows support the original default size only');
    const inactive = disabled || props['aria-disabled'] === true || props['aria-disabled'] === 'true', node = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => node.current!, []);
    React.useLayoutEffect(() => { const root = node.current!, update = () => { root.dataset.mcItemInteractive = String(!inactive && !!root.querySelector('[data-slot=attachment-trigger]')); }; update(); const observer = new MutationObserver(update); observer.observe(root, { subtree: true, childList: true }); return () => observer.disconnect(); }, [inactive]);
    return <AttachmentContext value={{ scale, disabled: inactive }}><div ref={node} data-slot="attachment" data-state={state} data-size={size} data-orientation={orientation} data-selected={selected ? 'true' : undefined} aria-disabled={inactive || undefined} className={cn(`mc-item mc-attachment ${""}`, className)} style={minecraftStyle(style, __style => ({ '--mc-scale': scale, ...__style } as React.CSSProperties))} {...props} onClickCapture={event => {
            if (inactive) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            onClickCapture?.(event);
        }}/></AttachmentContext>;
}
function AttachmentMedia({ variant = 'icon', className, children, ...props }: MinecraftProps<'div'> & {
    variant?: 'icon' | 'image';
}) { const { scale } = React.useContext(AttachmentContext); return <div data-slot="attachment-media" data-variant={variant} className={cn(`mc-item-media mc-attachment-media ${""}`, className)} {...props}>{children ?? <MinecraftItemMedia scale={scale}/>}</div>; }
function AttachmentContent({ className, ref, ...props }: MinecraftProps<'div'>) { const { scale } = React.useContext(AttachmentContext), node = React.useRef<HTMLDivElement>(null), [width, setWidth] = React.useState<number>(); React.useImperativeHandle(ref, () => node.current!, []); React.useLayoutEffect(() => { const element = node.current!, measure = () => setWidth(Math.floor(element.clientWidth / scale)); measure(); const observer = new ResizeObserver(measure); observer.observe(element); return () => observer.disconnect(); }, [scale]); return <AttachmentClip value={width}><div ref={node} data-slot="attachment-content" data-mc-item-content-ready={width != null} className={cn(`mc-item-content mc-attachment-content ${""}`, className)} {...props}/></AttachmentClip>; }
type AttachmentTextProps = MinecraftProps<'span'> & Pick<MinecraftItemTextProps, 'maxWidth' | 'align' | 'clipWidth' | 'render'>;
function AttachmentTitle({ className, clipWidth, ...props }: AttachmentTextProps) { const { scale } = React.useContext(AttachmentContext), inherited = React.useContext(AttachmentClip); return <MinecraftItemText as="span" data-slot="attachment-title" scale={scale} clipWidth={clipWidth ?? inherited} className={cn(`mc-item-title mc-attachment-title ${""}`, className)} {...props}/>; }
function AttachmentDescription({ className, clipWidth, ...props }: AttachmentTextProps) { const { scale } = React.useContext(AttachmentContext), inherited = React.useContext(AttachmentClip); return <MinecraftItemText as="span" data-slot="attachment-description" scale={scale} clipWidth={clipWidth ?? inherited} className={cn(`mc-item-description mc-attachment-description ${""}`, className)} {...props}/>; }
function AttachmentActions({ className, ...props }: MinecraftProps<'div'>) { return <div data-slot="attachment-actions" className={cn(`mc-item-actions mc-attachment-actions ${""}`, className)} {...props}/>; }
function AttachmentAction({ className, disabled, onClickCapture, ...props }: MinecraftProps<typeof Button>) {
    const context = React.useContext(AttachmentContext), inactive = context.disabled || disabled;
    return <Button data-slot="attachment-action" type="button" scale={context.scale} className={cn(`mc-attachment-action ${""}`, className)} {...props} disabled={inactive} aria-disabled={inactive || props['aria-disabled']} onClickCapture={event => {
            if (inactive) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            onClickCapture?.(event);
        }}/>;
}
function AttachmentTrigger({ render, className, disabled, onClick, onClickCapture, type, ...props }: MinecraftPolymorphicProps<'button'> & {}) {
    const context = React.useContext(AttachmentContext), inactive = context.disabled || disabled, Root = MinecraftRender;
    return <Root render={render} as="button" data-slot="attachment-trigger" className={cn(`mc-attachment-trigger ${""}`, className)} type={render ? undefined : type ?? 'button'} disabled={inactive} aria-disabled={inactive || undefined} {...props} onClickCapture={event => {
            if (inactive) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            onClickCapture?.(event);
        }} onClick={event => {
            onClick?.(event);
            queueMicrotask(() => {
                if (!event.defaultPrevented && !inactive)
                    playMinecraftClick();
            });
        }}/>;
}
function AttachmentGroup({ className, ...props }: MinecraftProps<'div'>) { return <div data-slot="attachment-group" className={cn(`mc-attachment-group ${""}`, className)} {...props}/>; }
export { Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentDescription, AttachmentActions, AttachmentAction, AttachmentTrigger };
export type { AttachmentProps, AttachmentTextProps };
