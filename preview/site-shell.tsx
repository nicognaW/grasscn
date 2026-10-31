import * as React from "react"
import {navigate} from "./router"
import {Input} from "../registry/ui/input"
import {Button} from "../registry/ui/button"
import {Card} from "../registry/ui/card"
import index from "./search.generated.json"
import logo from "./assets/grasscn-logo.svg"

const normalize=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}]/gu,"")
export const componentHref=(name:string)=>name==='chart'?'/charts':`/components/${name}`
export function searchComponents(query:string){
 const key=normalize(query)
 return index.flatMap(item=>{
  const own=!key||normalize(item.title).includes(key)||normalize(item.name).includes(key)||item.aliases.some(name=>normalize(name).includes(key))
  const parts=item.exports.filter(name=>normalize(name).includes(key)&&normalize(name)!==normalize(item.name))
  return [...(own?[{label:item.title,name:item.name,part:"",category:item.category}]:[]),...(key?parts.map(part=>({label:part,name:item.name,part,category:item.title})):[])]
 }).sort((a,b)=>Number(normalize(b.label)===key)-Number(normalize(a.label)===key)||a.label.localeCompare(b.label))
}
export function SiteHeader({section}:{section:string}){
 const [query,setQuery]=React.useState(""),[open,setOpen]=React.useState(false),[active,setActive]=React.useState(0),ref=React.useRef<HTMLInputElement>(null)
 React.useEffect(()=>{const reset=()=>{setQuery("");setOpen(false);setActive(0)};window.addEventListener('hashchange',reset);window.addEventListener('popstate',reset);return()=>{window.removeEventListener('hashchange',reset);window.removeEventListener('popstate',reset)}},[])
 const results=searchComponents(query)
 React.useEffect(()=>{if(open)document.getElementById(`search-result-${active}`)?.scrollIntoView({block:"nearest"})},[active,open,query])
 const choose=(i:number)=>{const item=results[i];if(!item)return;navigate((item.name==='chart'&&item.part.includes('Fps')?'/charts/fps':item.name==='chart'&&item.part.includes('Metric')?'/charts/metric':item.name==='chart'&&item.part.includes('Profiler')?'/charts/profiler':componentHref(item.name))+(item.part?`?part=${item.part}`:""));setOpen(false);setQuery("");ref.current?.blur()}
 React.useEffect(()=>{const listener=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();ref.current?.focus();setOpen(true)}};window.addEventListener("keydown",listener);return()=>window.removeEventListener("keydown",listener)},[])
 return <header className="grass-header"><div className="grass-header-inner"><a href="/" className="grass-brand" aria-label="grasscn home"><img src={logo} width="132" height="48" alt="grasscn"/></a><nav aria-label="Main navigation">{[["Home","/","home"],["Components","/components","components"],["Examples","/#examples","examples"],["Charts","/charts","charts"]].map(([label,href,key])=><a key={key} href={href} aria-current={section===key?'page':undefined}>{label}</a>)}</nav><div className="grass-header-end"><form role="search" className="grass-search" onSubmit={e=>{e.preventDefault();choose(active)}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}}>
 <Input ref={ref} scale={2} role="combobox" aria-autocomplete="list" aria-activedescendant={open&&results.length?`search-result-${active}`:undefined} aria-label="Search components" aria-expanded={open} aria-controls="site-search-results" placeholder="Find a component..." value={query} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setActive(0);setOpen(true)}} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(i=>Math.max(0,Math.min(results.length-1,i+(e.key==='ArrowDown'?1:-1))))}}}/><span className="grass-search-key" aria-hidden="true">Ctrl K</span>
 {open&&<Card className="grass-search-results" scale={1}><div className="grass-search-heading">Components <span>{results.length} results</span></div><div id="site-search-results" role="listbox" aria-label="Search results">{results.map((item,i)=><Button key={`${item.name}-${item.part}`} id={`search-result-${i}`} scale={2} role="option" aria-selected={i===active} className={i===active?'search-active':undefined} type="button" onClick={()=>choose(i)}>{item.label}</Button>)}</div>{!results.length&&<p role="status">No results. Try a component name, such as Card or Input.</p>}</Card>}
 </form><a href="/#install" className="grass-header-start">Get started</a></div></div></header>
}
export function SiteFooter(){return <footer className="grass-footer"><a href="/" aria-label="grasscn home"><img src={logo} width="110" height="40" alt="grasscn"/></a><p>Unofficial. Not affiliated with Mojang or Microsoft.</p></footer>}
