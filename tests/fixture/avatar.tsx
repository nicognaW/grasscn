import * as React from "react";
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, AvatarGroupCount, type MinecraftAvatarSkin } from "../../registry/ui/avatar";
export function AvatarFixture() {
    const q = new URLSearchParams(location.search), scale = Number(q.get('scale') ?? 2) as 1 | 2 | 3, [status, setStatus] = React.useState(''), ref = React.useRef<HTMLImageElement>(null);
    React.useLayoutEffect(() => { document.documentElement.style.background = document.body.style.background = q.get('background') ?? '#202020'; }, []);
    React.useEffect(() => { (window as any).avatarImageRef = ref.current; });
    if (q.get('native') === '1') {
        const part = q.get('part');
        return <Avatar id="subject" scale={scale} size={Number(q.get('width')) === 12 ? 'sm' : Number(q.get('width')) === 20 ? 'lg' : 'default'} style={{ position: 'absolute', left: Number(q.get('x') ?? 8) * scale, top: Number(q.get('y') ?? 8) * scale, width: Number(q.get('width') ?? 16) * scale, height: Number(q.get('height') ?? 16) * scale }} data-subject="true">{part === 'label' ? <AvatarFallback style={{ display: "block", background: "transparent" }} maxWidth={q.has('wrapWidth') ? Number(q.get('wrapWidth')) : undefined} align={(q.get('align') ?? 'left') as any}>{q.get('text') ?? q.get('label') ?? ''}</AvatarFallback> : <AvatarImage skin={(q.get('label') ?? 'wide/steve') as MinecraftAvatarSkin} alt="Native player" hat={q.get('checked') !== 'false'} upsideDown={q.get('selected') === 'true'}/>}</Avatar>;
    }
    return <><Avatar id="loaded"><AvatarImage ref={ref} skin="wide/steve" alt="Steve" onLoadingStatusChange={setStatus}/><AvatarFallback>玩家</AvatarFallback><AvatarBadge aria-label="online">!</AvatarBadge></Avatar><output id="status">{status}</output><Avatar id="failed"><AvatarImage src="/not-an-image.png" alt="Unavailable"/><AvatarFallback>玩家中文</AvatarFallback></Avatar><Avatar id="delayed"><AvatarFallback delay={300}>Later</AvatarFallback></Avatar><Avatar id="default"><AvatarFallback /></Avatar><AvatarGroup aria-label="Players"><Avatar size="sm"><AvatarImage skin="slim/alex" alt="Alex"/></Avatar><AvatarGroupCount>+2</AvatarGroupCount></AvatarGroup><Avatar render={<a href="#player" id="linked"/>}>{<AvatarFallback><strong>Player</strong></AvatarFallback>}</Avatar></>;
}
