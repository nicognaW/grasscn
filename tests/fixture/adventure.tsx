import * as React from "react";
import { createRoot } from "react-dom/client";
import { AdvancementTree } from "../../registry/ui/advancement-tree";
const DraftDemos = React.lazy(() => import('./draft-demos'));
const params = new URLSearchParams(location.search), scale = Number(params.get('scale') ?? 2) as 1 | 2 | 3, mask = Number(params.get('mask') ?? 1), x = Number(params.get('x') ?? 40), y = Number(params.get('y') ?? 16);
const positions = [[0, 1], [2, 0], [2, 2], [4, 1]], nodes = positions.map(([x, y], i) => ({ id: String(i), parentId: i ? String(i === 3 ? 1 : 0) : undefined, x, y, title: `Milestone ${i}`, kind: (i === 0 ? 'task' : i === 1 ? 'goal' : 'challenge') as 'task' | 'goal' | 'challenge', completed: !!(mask & (1 << i)) }));
const sample = params.has('case') ? JSON.parse(params.get('case')!) : { element: params.get('kind') ?? 'advancement-tree', state: params.get('state') ?? undefined, value: params.has('value') ? Number(params.get('value')) : undefined };
if (sample.background)
    document.body.style.backgroundColor = sample.background;
if (sample.element === 'sign' || sample.element === 'hanging-sign' || sample.element === 'map') {
    Object.assign(document.getElementById('root')!.style, { position: 'absolute', left: (sample.x ?? 0) * scale + 'px', top: (sample.y ?? 0) * scale + 'px' });
}
createRoot(document.getElementById('root')!).render(sample.element === 'advancement-tree' ? <AdvancementTree id="subject" nodes={nodes} scale={scale} defaultPan={{ x, y }} onSelectedIdChange={id => document.documentElement.dataset.selected = id} data-subject="true"/> : <React.Suspense fallback={<span>Loading preview...</span>}><DraftDemos sample={sample} scale={scale}/></React.Suspense>);
