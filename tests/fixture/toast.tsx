import * as React from "react"
import {Toast,ToastProvider,ToastViewport,ToastTitle,ToastDescription,ToastAction,ToastClose} from "../../registry/ui/toast"
import {setMinecraftSoundVolume} from "../../registry/ui/minecraft-sound"
import {Toaster,toast as notify} from "../../registry/ui/sonner"
import {Toaster as LegacyToaster} from "../../registry/ui/toaster"
import {toast as legacyNotify,useToast} from "../../registry/hooks/use-toast"
const p=new URLSearchParams(location.search),scale=Number(p.get("scale")??2) as 1|2|3,count=Number(p.get("count")??1)
function App(){
 const [open,setOpen]=React.useState(!p.has("closed")),[events,setEvents]=React.useState(0),[action,setAction]=React.useState(0),[tag,setTag]=React.useState(""),[pauses,setPauses]=React.useState(0),[resumes,setResumes]=React.useState(0),[swipes,setSwipes]=React.useState(0)
 const ref=React.useRef<HTMLLIElement>(null)
 const content=<><ToastTitle>{p.has("rich")?<strong>{p.get("label")??"World saved"}</strong>:p.get("label")??"World saved"}</ToastTitle>{p.has("text")&&<ToastDescription>{p.get("text")}</ToastDescription>}{p.has("actions")&&<ToastAction altText="Undo save" onClick={event=>{setAction(v=>v+1);if(p.has("cancelAction"))event.preventDefault()}}>Undo</ToastAction>}{p.has("actions")&&<ToastClose>Done</ToastClose>}</>
 return <ToastProvider scale={scale} duration={Number(p.get("duration")??5000)}>
  {Array.from({length:count},(_,index)=><Toast key={index} ref={index===0?ref:undefined} {...(p.has("uncontrolled")?{defaultOpen:open}:{open})} asChild={p.has("asChild")} onPause={()=>setPauses(v=>v+1)} onResume={()=>setResumes(v=>v+1)} onSwipeEnd={()=>setSwipes(v=>v+1)} onEscapeKeyDown={event=>{if(p.has("cancelEscape"))event.preventDefault()}} onOpenChange={next=>{setEvents(v=>v+1);if(!p.has("reject"))setOpen(next)}}>{p.has("asChild")?<section>{content}</section>:content}</Toast>)}
  <ToastViewport id="subject" style={p.has("native")?{left:Number(p.get("x")??16)*scale,top:Number(p.get("y")??16)*scale,right:"auto",width:Number(p.get("width")??190)*scale,height:Number(p.get("height")??32)*scale}:undefined}/>
  <button id="open" onClick={()=>setOpen(true)}>Open toast</button><button id="close" onClick={()=>setOpen(false)}>Close toast</button><button id="read-ref" onClick={()=>setTag(ref.current?.tagName??"")}>Read ref</button><output id="ref-tag">{tag}</output><output id="events">{events}</output><output id="actions">{action}</output><output id="pauses">{pauses}</output><output id="resumes">{resumes}</output><output id="swipes">{swipes}</output>
 </ToastProvider>
}
function SonnerFixture(){
 const [actions,setActions]=React.useState(0),[created,setCreated]=React.useState(0),ids=React.useRef<Array<string|number>>([])
 const show=()=>{for(let i=0;i<count;i++)ids.current.push(notify(p.has("rich")?<strong>{p.get("label")??"World saved"}</strong>:p.get("label")??"World saved",{...(p.has("text")?{description:p.get("text")!}:{}),...(p.has("actions")?{action:{label:"Undo",onClick:event=>{setActions(v=>v+1);if(p.has("cancelAction"))event.preventDefault()}},closeButton:true}:{}),dismissible:!p.has("disabled"),duration:Number(p.get("duration")??5000)}));setCreated(v=>v+count)}
 React.useEffect(()=>{if(!p.has("closed"))show()},[])
 const x=Number(p.get("x")??16)*scale,y=Number(p.get("y")??16)*scale,width=Number(p.get("width")??190)*scale,height=Number(p.get("height")??32)*scale
 return <><Toaster scale={scale} position="top-right" offset={p.has("native")?{top:y,right:innerWidth-x-width}:0}/><div id="subject" style={{position:"fixed",left:x,top:y,width,height,pointerEvents:"none"}}/>
 <button id="open" onClick={show}>Open toast</button><button id="close" onClick={()=>notify.dismiss()}>Close toast</button><button id="update" onClick={()=>notify("Updated 世界",{id:ids.current[0],description:"こんにちは"})}>Update toast</button><button id="promise" onClick={()=>notify.promise(Promise.resolve("Saved"),{loading:"Saving world",success:"World saved",error:"Save failed"})}>Save promise</button><output id="actions">{actions}</output><output id="created">{created}</output></>
}
function HelperFixture(){
 const {toast,dismiss,toasts}=useToast(),latest=React.useRef<ReturnType<typeof legacyNotify>|null>(null),[created,setCreated]=React.useState(0)
 const show=()=>{latest.current=toast({title:p.get("label")??"World saved",description:p.get("text")??"Hello Minecraft"});setCreated(v=>v+1)}
 React.useEffect(()=>{if(!p.has("closed"))show()},[])
 return <><LegacyToaster scale={scale} duration={Number(p.get("duration")??5000)}/><button id="open" onClick={show}>Open toast</button><button id="close" onClick={()=>dismiss()}>Close toast</button><button id="update" onClick={()=>latest.current?.update({title:"Updated 世界",description:"こんにちは"})}>Update toast</button><output id="created">{created}</output><output id="stored">{toasts.length}</output></>
}
function StrictFixture(){
 const [open,setOpen]=React.useState(true),[tag,setTag]=React.useState(""),ref=React.useRef<HTMLElement>(null)
 return p.get("component")==="sonner-strict"?<><Toaster ref={ref}/><button id="show" onClick={()=>notify("World saved")}>Show</button><button id="read-ref" onClick={()=>setTag(ref.current?.tagName??"")}>Read ref</button><output id="ref-tag">{tag}</output></>:<ToastProvider><Toast open={open} onOpenChange={setOpen}><ToastTitle>World saved</ToastTitle></Toast><ToastViewport/><button id="close" onClick={()=>setOpen(false)}>Close</button></ToastProvider>
}
export function ToastFixture(){
 document.documentElement.style.background=p.get("background")??"#202020";document.body.style.background=p.get("background")??"#202020"
 if(p.has("native"))setMinecraftSoundVolume(0);else if(p.has("volume"))setMinecraftSoundVolume(Number(p.get("volume")))
 return p.get("component")?.endsWith("-strict")?<React.StrictMode><StrictFixture/></React.StrictMode>:p.get("component")==="sonner"?<SonnerFixture/>:p.get("component")==="toaster"?<HelperFixture/>:<App/>
}
