"use client"
import * as React from "react"
import {useRender} from "@base-ui/react/use-render"
import {mergeProps} from "@base-ui/react/merge-props"
import {cn as mergeClasses} from "@/lib/utils"
type ClassValue = Parameters<typeof mergeClasses>[number]
export type MinecraftRenderProp=useRender.RenderProp<{}>
export type MinecraftProps<T extends React.ElementType>=React.ComponentPropsWithRef<T>
export type MinecraftPolymorphicProps<T extends React.ElementType> = useRender.ComponentProps<T>
/** Base UI composition for Minecraft's non-primitive artwork components. */
export function MinecraftRender<T extends keyof React.JSX.IntrinsicElements="div">({as,render,ref,...props}:Omit<React.ComponentPropsWithRef<T>,"render">&{as?:T;render?:MinecraftRenderProp}){
 return useRender({defaultTagName:as??"div",render,ref:ref as React.Ref<HTMLElement>,props:mergeProps({},props)})
}

type StateClass<State> = ClassValue | ((state:State)=>ClassValue)
export function minecraftClasses(...values:ClassValue[]):string
export function minecraftClasses<State>(...values:StateClass<State>[]):string|((state:State)=>string)
export function minecraftClasses<State>(...values:StateClass<State>[]){
  const resolve=(state:State)=>mergeClasses(...values.map(value=>typeof value === "function"?value(state):value))
  return values.some(value=>typeof value === "function")?resolve:mergeClasses(...values as ClassValue[])
}
export function minecraftStyle(style:React.CSSProperties|undefined,paint:(style:React.CSSProperties|undefined)=>React.CSSProperties):React.CSSProperties
export function minecraftStyle<State>(style:React.CSSProperties|((state:State)=>React.CSSProperties|undefined)|undefined,paint:(style:React.CSSProperties|undefined)=>React.CSSProperties):React.CSSProperties|((state:State)=>React.CSSProperties)
export function minecraftStyle<State>(style:React.CSSProperties|((state:State)=>React.CSSProperties|undefined)|undefined,paint:(style:React.CSSProperties|undefined)=>React.CSSProperties){
  return typeof style === "function"?(state:State)=>paint(style(state)):paint(style)
}
