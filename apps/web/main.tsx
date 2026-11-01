import * as React from "react"
import {createRoot} from "react-dom/client"
import Home from "./home"
import ComponentsPage from "./components-page"
import ChartsPage from "./charts-page"
import {SiteHeader,SiteFooter} from "./site-shell"
import index from "./search.generated.json"
import "./style.css"
import "./release.css"
const componentAliases:Record<string,string>={field:'form',bubble:'message','message-scroller':'message'}
function readRoute(){
 const hash=location.hash.slice(1)
 if(['home','examples','install'].includes(hash))return hash
 if(hash==='all')return '/components'
 if(hash.startsWith('/')){const name=hash.split('/')[2];return componentAliases[name]?hash.replace(`/components/${name}`,`/components/${componentAliases[name]}`):hash}
 const legacyName=componentAliases[hash]??hash
 if(index.some(i=>i.name===legacyName))return legacyName==='chart'?'/charts':`/components/${legacyName}`
 const component=location.pathname.split('/')[2]
 return (location.pathname.startsWith('/components/')&&componentAliases[component]?`/components/${componentAliases[component]}`:location.pathname)+location.search
}
function App(){
 const [route,setRoute]=React.useState(readRoute)
 React.useEffect(()=>{
  const changed=()=>setRoute(readRoute())
  const clicked=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return
   const link=(event.target as Element).closest?.('a[href]') as HTMLAnchorElement|null
   if(!link||link.target||link.hasAttribute('download'))return
   const href=link.getAttribute('href')!
   if(href==='/'||href.startsWith('/#')||/^\/(?:components|charts)(?:[/?]|$)/.test(href)){event.preventDefault();history.pushState(null,'',href);changed();window.dispatchEvent(new PopStateEvent('popstate'))}
  }
  window.addEventListener('hashchange',changed);window.addEventListener('popstate',changed);document.addEventListener('click',clicked)
  return()=>{window.removeEventListener('hashchange',changed);window.removeEventListener('popstate',changed);document.removeEventListener('click',clicked)}
 },[])
 const path=route.split('?')[0],query=new URLSearchParams(route.split('?')[1]??'')
 const home=['/','home','examples','install'].includes(path)
 const charts=path==='/charts'||path.startsWith('/charts/')
 const name=path.startsWith('/components/')?path.slice(12):''
 const section=home?(path==='examples'?'examples':'home'):charts?'charts':'components'
 React.useEffect(()=>{
  const title=home?'grasscn · Pixel-perfect Minecraft UI.':charts?'Charts · grasscn':`${index.find(i=>i.name===name)?.title??'Components'} · grasscn`
  document.title=title
  const description=document.querySelector('meta[name="description"]')
  description?.setAttribute('content',home?'Pixel-perfect Minecraft UI. shadcn components. Yours to build.':charts?'Explore Minecraft-style charts with everyday web data.':`${index.find(i=>i.name===name)?.title??'Components'}: previews, installation and source for grasscn.`)
  if(home&&['examples','install'].includes(path))requestAnimationFrame(()=>document.getElementById(path)?.scrollIntoView())
  else if(query.get('part'))requestAnimationFrame(()=>document.getElementById('component-import')?.scrollIntoView())
  else window.scrollTo(0,0)
 },[route])
 return <div className="grass-site"><SiteHeader section={section}/>{home?<Home/>:charts?<ChartsPage type={path.split('/')[2]??'overview'}/>:<ComponentsPage name={name} part={query.get('part')??''}/>}<SiteFooter/></div>
}
createRoot(document.getElementById('root')!).render(<App/> )
