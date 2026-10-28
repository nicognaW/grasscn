import * as React from "react"
import { createRoot } from "react-dom/client"
import catalog from "./catalog.generated.json"
import type { DemoProps } from "./types"
import "./style.css"

const modules = import.meta.glob<React.ComponentType<DemoProps>>("./demos/*.tsx", { eager: true, import: "default" })
const all = "all"
function validSelection(hash: string) { const value = hash.replace(/^#/, ""); return catalog.components.some(c => c.name === value) ? value : all }

function App() {
  const [selected, setSelected] = React.useState(() => validSelection(location.hash))
  const [search, setSearch] = React.useState("")
  const [scale, setScale] = React.useState<1 | 2 | 3>(2)
  React.useEffect(() => {
    const changed = () => setSelected(validSelection(location.hash))
    window.addEventListener("hashchange", changed)
    return () => window.removeEventListener("hashchange", changed)
  }, [])
  const choose = (name: string) => { setSelected(name); location.hash = name }
  const filtered = catalog.components.filter(component => component.title.toLowerCase().includes(search.trim().toLowerCase()))
  const visible = filtered.filter(component => selected === all || component.name === selected)
  const totalCases = catalog.components.reduce((sum, c) => sum + c.referenceCases, 0)
  return <div className="site-shell">
    <header className="site-header">
      <a className="brand" href="#all" aria-label="Minecraft UI home"><svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#a7c783" d="M4 8 16 2 28 8 16 14Z" /><path fill="#72885a" d="m4 8 12 6v16L4 24Z" /><path fill="#4b6342" d="m16 14 12-6v16l-12 6Z" /></svg><span>Minecraft <span className="brand-ui">UI</span><small>COMPONENT REGISTRY</small></span></a>
      <span className="private-badge"><span className="status-dot" />PRIVATE PREVIEW</span>
    </header>
    <div className="site-layout">
      <aside className="sidebar" aria-label="Preview navigation">
        <div className="sidebar-label">COMPONENTS <span>{catalog.components.length}</span></div>
        <label className="search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Find a component" placeholder="Find a component…" value={search} onChange={event => { setSearch(event.target.value); choose(all) }} /></label>
        <nav aria-label="Components">
          <button type="button" className={selected === all ? "nav-item selected" : "nav-item"} aria-pressed={selected === all} onClick={() => choose(all)}><span className="nav-icon" aria-hidden="true">▦</span>All components<span className="nav-count">{catalog.components.length}</span></button>
          {filtered.map(component => <button type="button" key={component.name} className={selected === component.name ? "nav-item selected" : "nav-item"} aria-pressed={selected === component.name} onClick={() => choose(component.name)}><span className="nav-icon" aria-hidden="true">{component.name === "button" ? "▱" : component.name === "checkbox" ? "⊡" : "≡"}</span>{component.title}<span className="ready-dot" aria-label="Ready" /></button>)}
        </nav>
        <div className="sidebar-progress"><div><span>Registry progress</span><strong>{catalog.components.length} / {catalog.total}</strong></div><progress aria-label="Registry completion" value={catalog.components.length} max={catalog.total} /><p>New components appear here as they’re finished.</p></div>
        <div className="sidebar-footer">JAVA EDITION <span>26.2</span><br /><span className="subtle">Original textures · shadcn APIs</span></div>
      </aside>
      <main>
        <div className="breadcrumb">Registry <span aria-hidden="true">/</span> Preview</div>
        <div className="page-intro"><div><div className="eyebrow"><span className="status-dot" /> A WORK IN PROGRESS</div><h1>Familiar controls.<br /><span>Vanilla pixels.</span></h1><p>Explore the finished components. Click, check, drag, and try them with your keyboard.</p></div><div className="version-mark"><span>Java</span><strong>26.2</strong><span>VANILLA REFERENCE</span></div></div>
        <div className="gallery-toolbar"><div className="gallery-summary"><strong>{catalog.components.length} ready</strong><span>·</span><span>{totalCases} native reference cases</span></div><fieldset className="scale-picker"><legend>GUI scale</legend>{([1, 2, 3] as const).map(value => <button key={value} type="button" aria-pressed={scale === value} onClick={() => setScale(value)}>{value}×</button>)}</fieldset></div>
        <div className="component-grid">
          {visible.map(component => {
            const Demo = modules[`./demos/${component.name}.tsx`]
            return <section key={component.name} className={`component-card ${component.name === "button" ? "wide-card" : ""}`} id={`component-${component.name}`} aria-labelledby={`title-${component.name}`}>
              <div className="component-heading"><div><span className="component-category">{component.category}</span><h2 id={`title-${component.name}`}>{component.title}</h2></div><a className="case-badge" href={`#${component.name}`} onClick={() => choose(component.name)}><span className="pixel-check" aria-hidden="true">✓</span>{component.referenceCases} native cases</a></div>
              <Demo scale={scale} />
            </section>
          })}
          {visible.length === 0 && <div className="empty-state"><h2>No finished component matches.</h2><button onClick={() => { setSearch(""); choose(all) }}>Show all components</button></div>}
        </div>
        <footer className="page-footer"><p>Exact comparisons cover declared reference cases at integer scales in Edge. Additional variants and environments are still being verified.</p><span>Updated {new Date(catalog.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</span></footer>
      </main>
    </div>
  </div>
}

createRoot(document.getElementById("root")!).render(<App />)
