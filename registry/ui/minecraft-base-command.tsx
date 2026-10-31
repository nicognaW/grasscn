"use client"
import * as React from "react"
import {Autocomplete} from "@base-ui/react/autocomplete"
import {MinecraftRender} from "./minecraft-render"
import type {useRender} from "@base-ui/react/use-render"

type Entry={value:string;keywords:string[];disabled:boolean;groupId:string|null;forceMount:boolean;invoke:(value:string)=>void}
type Context={entries:Entry[];search:string;setSearch:(value:string)=>void;selected:string;select:(value:string)=>void;register:(id:string,entry:Entry)=>()=>void;matches:(value:string,keywords:string[])=>boolean;visible:number;indexOf:(value:string)=>number}
const Context=React.createContext<Context|null>(null)
const GroupContext=React.createContext<{id:string;forceMount:boolean}|null>(null)
const useCommand=()=>{const c=React.useContext(Context);if(!c)throw Error("Command parts require Command");return c}
type RootProps=React.ComponentProps<"div">&{render?:useRender.RenderProp;value?:string;defaultValue?:string;onValueChange?:(value:string)=>void;shouldFilter?:boolean;filter?:(value:string,search:string,keywords?:string[])=>number;loop?:boolean;label?:string;disablePointerSelection?:boolean}
function Root({value,defaultValue="",onValueChange,shouldFilter=true,filter,loop=true,label,render,children,disablePointerSelection,...props}:RootProps){
 const [search,setSearch]=React.useState(""),[selected,setSelected]=React.useState(defaultValue),[entries,setEntries]=React.useState<Record<string,Entry>>({})
 const register=React.useCallback((id:string,entry:Entry)=>{setEntries(previous=>({...previous,[id]:entry}));return()=>setEntries(previous=>{const next={...previous};delete next[id];return next})},[])
 const matches=React.useCallback((v:string,keys:string[])=>!shouldFilter||!search||!!(filter?filter(v,search,keys):[v,...keys].join(" ").toLocaleLowerCase().includes(search.toLocaleLowerCase())),[search,shouldFilter,filter])
 const items=Object.values(entries).filter(entry=>entry.forceMount||matches(entry.value,entry.keywords)),current=value??selected
 const select=React.useCallback((next:string)=>{if(value===undefined)setSelected(next);onValueChange?.(next)},[value,onValueChange])
 const context={entries:Object.values(entries),search,setSearch,selected:current,select,register,matches,visible:items.length,indexOf:(value:string)=>items.findIndex(item=>item.value===value)}
 const RenderRoot=MinecraftRender
 return <Context.Provider value={context}><Autocomplete.Root inline items={items.map(entry=>entry.value)} value={search} onValueChange={(next,details)=>{if(details.reason==="escape-key")details.allowPropagation();else if(details.reason!=="item-press")setSearch(next)}} mode="none" onOpenChange={(_,details)=>{details.allowPropagation();if(details.reason==="item-press"){const element=details.event.target;const next=element instanceof Element?element.closest("[data-value]")?.getAttribute("data-value")??current:current;select(next);items.find(item=>item.value===next&&!item.disabled)?.invoke(next)}}} open autoHighlight="always" loopFocus={loop} highlightItemOnHover={!disablePointerSelection} onItemHighlighted={next=>{if(next!==undefined)select(String(next))}}><RenderRoot render={render} {...props} aria-label={label??props["aria-label"]}>{children}</RenderRoot></Autocomplete.Root></Context.Provider>
}
const InputRoot=Autocomplete.Input,ListRoot=Autocomplete.List,ItemRoot=Autocomplete.Item,GroupRoot=Autocomplete.Group,GroupLabel=Autocomplete.GroupLabel,Separator=Autocomplete.Separator
function Input({onValueChange,onChange,value,...props}:React.ComponentProps<typeof InputRoot>&{onValueChange?:(value:string)=>void}){const c=useCommand();return <InputRoot {...props} value={value??c.search} onChange={event=>{onChange?.(event);if(!event.defaultPrevented){c.setSearch(event.target.value);onValueChange?.(event.target.value)}}}/>}
function List({children,label,...props}:Omit<React.ComponentProps<typeof ListRoot>,"children">&{label?:string;children?:React.ReactNode}){return <ListRoot {...props} aria-label={label}><div data-command-list-sizer="">{children}</div></ListRoot>}
function Item({value,keywords=[],disabled=false,onSelect,onClick,forceMount,...props}:Omit<React.ComponentProps<typeof ItemRoot>,"onSelect">&{value?:string;keywords?:string[];forceMount?:boolean;onSelect?:(value:string)=>void}){
 const c=useCommand(),group=React.useContext(GroupContext),groupId=group?.id??null,effectiveForceMount=forceMount??group?.forceMount??false,id=React.useId(),actual=value??"",signature=keywords.join("\0"),onSelectRef=React.useRef(onSelect)
 onSelectRef.current=onSelect
 const invoke=React.useCallback((value:string)=>onSelectRef.current?.(value),[])
 React.useLayoutEffect(()=>c.register(id,{value:actual,keywords,disabled,groupId,forceMount:effectiveForceMount,invoke}),[c.register,id,actual,signature,disabled,groupId,effectiveForceMount])
 if(!effectiveForceMount&&!c.matches(actual,keywords))return null
 return <ItemRoot {...props} index={c.indexOf(actual)} value={actual} disabled={disabled} data-value={actual} data-selected={c.selected===actual?"true":"false"} data-disabled={disabled?"true":undefined} onClick={onClick}/>
}
function Group({heading,children,forceMount=false,hidden,...props}:React.ComponentProps<typeof GroupRoot>&{heading?:React.ReactNode;forceMount?:boolean}){const id=React.useId(),c=useCommand(),visible=c.entries.some(entry=>entry.groupId===id&&(entry.forceMount||c.matches(entry.value,entry.keywords)));return <GroupContext.Provider value={{id,forceMount}}><GroupRoot {...props} hidden={hidden||!forceMount&&!visible}>{heading!=null&&<GroupLabel data-command-group-heading="">{heading}</GroupLabel>}{children}</GroupRoot></GroupContext.Provider>}
function Empty({forceMount,...props}:React.ComponentProps<"div">&{forceMount?:boolean}){const c=useCommand();return forceMount||c.visible===0?<div role="status" {...props}/>:null}
export const CommandPrimitive=Object.assign(Root,{Input,List,Item,Group,Empty,Separator})
