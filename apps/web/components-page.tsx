import * as React from "react";
import index from "./search.generated.json";
import { descriptions } from "./component-content";
import { componentHref, searchComponents } from "./site-shell";
import { Button } from "./registry/ui/button";
import { Card } from "./registry/ui/card";
import { Input } from "./registry/ui/input";
import { SyntaxCode } from "./syntax-code";
import { componentSources } from "./component-sources.generated";
import type { DemoProps } from "./types";
const modules = import.meta.glob<React.ComponentType<DemoProps>>("./demos/*.tsx", { eager: true, import: "default" });
export function CopyCode({ text, label, loading = false, language = "tsx" }: {
    text: string;
    label: string;
    loading?: boolean;
    language?: string;
}) {
    const [copied, setCopied] = React.useState(false), [failed, setFailed] = React.useState(false);
    React.useEffect(() => { setCopied(false); setFailed(false); }, [text]);
    return <div className="docs-code"><pre tabIndex={0} aria-label={label}><SyntaxCode text={text} language={loading ? "text" : language}/></pre><Button scale={1} aria-label={`Copy ${label}`} disabled={loading} onClick={async () => {
            try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setFailed(false);
            }
            catch {
                setFailed(true);
            }
        }}>{copied ? 'Copied' : 'Copy'}</Button>{copied && <span className="sr-only" role="status">Copied {label}.</span>}{failed && <p role="status">Select the code to copy it.</p>}</div>;
}
export function DocsRail({ title, children }: {
    title: string;
    children: React.ReactNode;
}) {
    return <aside className="docs-sidebar" aria-label={`${title} navigation`}><div className="docs-rail-content"><span className="docs-nav-heading">{title}</span>{children}</div></aside>;
}
export function DocsSidebar({ selected }: {
    selected: string;
}) {
    const [query, setQuery] = React.useState("");
    const names = new Set(searchComponents(query).map(r => r.name));
    return <DocsRail title="Components"><a className="docs-index-link" href="/components">All components</a><Input type="search" scale={2} aria-label="Find a component" placeholder="Filter..." value={query} onChange={e => setQuery(e.target.value)}/><nav aria-label="Components">{index.filter(i => names.has(i.name)).sort((a, b) => a.title.localeCompare(b.title)).map(item => <Button render={<a href={componentHref(item.name)} aria-current={selected === item.name ? "page" : undefined}/>} key={item.name} scale={2} className="docs-nav-button">{item.title}</Button>)}</nav>{!names.size && <p>No matching components.</p>}</DocsRail>;
}
export default function ComponentsPage({ name, part = "" }: {
    name: string;
    part?: string;
}) {
    const scale = 2 as const, item = index.find(i => i.name === name), [view, setView] = React.useState('preview'), [source, setSource] = React.useState('');
    React.useEffect(() => { setView('preview'); setSource(''); }, [name]);
    const sourceName = item && part ? (item.exportSources as Record<string, string | undefined>)[part] ?? item.name : item?.name;
    React.useEffect(() => {
        let current = true;
        setSource('');
        if (view === 'source' && sourceName)
            componentSources[sourceName]?.().then(value => {
                if (current)
                    setSource(value);
            });
        return () => { current = false; };
    }, [view, sourceName]);
    const Demo = item ? modules[`./demos/${item.demo}.tsx`] : null;
    const title = item?.title ?? 'Components';
    const group = item?.exports ?? [];
    return <div className="docs-layout"><DocsSidebar selected={name}/><main id="content" className="docs-main"><nav className="docs-breadcrumb" aria-label="Breadcrumb"><a href="/components">Components</a>{item && <><span aria-hidden="true">/</span><span>{title}</span></>}</nav><div className="docs-intro"><h1>{title}</h1><p>{item ? descriptions[item.name] : 'Familiar components for building dashboards, forms, conversations and everything in between.'}</p></div>
 {!item ? <div className="docs-component-index">{[...index].sort((a, b) => a.title.localeCompare(b.title)).map(component => <a className="docs-component-link" key={component.name} href={componentHref(component.name)}><h2>{component.title}</h2><p>{descriptions[component.name]}</p></a>)}</div> : <>
 <section id="component-preview" aria-labelledby="preview-heading"><div className="docs-section-heading"><h2 id="preview-heading">Preview</h2><div className="docs-preview-tabs" role="group" aria-label="Example view"><Button scale={2} aria-pressed={view === 'preview'} onClick={() => setView('preview')}>Preview</Button><Button scale={2} aria-pressed={view === 'source'} onClick={() => setView('source')}>Source</Button></div></div>
 {view === 'preview' ? <><Card scale={2} role="region" className="component-card docs-demo" id={`component-${item.demo}`} aria-label={title}>{Demo && <Demo scale={scale}/>}</Card></> : <CopyCode text={source || 'Loading component source...'} label="component source" loading={!source}/>}</section>
 <section id="component-installation"><h2>Installation</h2><p>Add the component to a project initialized with shadcn.</p><CopyCode text={`npx shadcn@latest add http://127.0.0.1:5173/r/${item.name}.json`} label="installation command" language="bash"/></section>
 <section id="component-import"><h2>Import</h2><CopyCode text={`import { ${part && group.includes(part) ? part : group.slice(0, Math.min(4, group.length)).join(', ')} } from "${item.importPaths[sourceName as keyof typeof item.importPaths] ?? `@/components/ui/${sourceName ?? item.name}`}"`} label="component import"/></section>
 {group.length > 0 && <section id="component-composition"><h2>Composition</h2><p>Use these exports to compose the component in your application.</p><div className="docs-exports">{group.map(value => <code key={value} className={value === part ? 'export-selected' : undefined}>{value}</code>)}</div></section>}

 </>}
 </main>{item && <aside className="docs-toc" aria-label="On this page"><strong>On this page</strong>{[['Preview', 'component-preview'], ['Installation', 'component-installation'], ['Import', 'component-import'], ['Composition', 'component-composition']].map(([label, id]) => <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}>{label}</button>)}</aside>}</div>;
}
