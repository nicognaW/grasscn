"use client"

import * as React from "react"
import type {ToastActionElement,ToastProps} from "@/components/ui/toast"
type ToasterToast=Omit<ToastProps,"title">&{id:string;title?:React.ReactNode;description?:React.ReactNode;action?:ToastActionElement}
type State={toasts:ToasterToast[]}
const empty:State={toasts:[]},listeners=new Set<()=>void>(),timers=new Map<string,ReturnType<typeof setTimeout>>()
let state:State=empty,sequence=0
function publish(toasts:ToasterToast[]){state={toasts};for(const listener of listeners)listener()}
function remove(id:string){const timer=timers.get(id);if(timer)clearTimeout(timer);timers.delete(id);publish(state.toasts.filter(toast=>toast.id!==id))}
function dismiss(id?:string){
 const targets=id==null?state.toasts.map(toast=>toast.id):[id]
 for(const key of targets)if(!timers.has(key))timers.set(key,setTimeout(()=>remove(key),600))
 publish(state.toasts.map(toast=>targets.includes(toast.id)?{...toast,open:false}:toast))
}
function toast(props:Omit<ToasterToast,"id">){
 const id=String(sequence=(sequence+1)%Number.MAX_SAFE_INTEGER)
 const update=(patch:Partial<ToasterToast>)=>publish(state.toasts.map(toast=>toast.id===id?{...toast,...patch,id}:toast))
 publish([{...props,id,open:true,onOpenChange:(open:boolean)=>{props.onOpenChange?.(open);if(!open)dismiss(id)}},...state.toasts].slice(0,5))
 return {id,update,dismiss:()=>dismiss(id)}
}
function useToast(){const snapshot=React.useSyncExternalStore(React.useCallback(listener=>{listeners.add(listener);return()=>listeners.delete(listener)},[]),()=>state,()=>empty);return {...snapshot,toast,dismiss}}
export {useToast,toast}
export type {ToasterToast}
