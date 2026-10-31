"use client"

import * as React from "react"
import {Toast,ToastProvider,ToastViewport,ToastTitle,ToastDescription,ToastClose} from "./toast"
import {useToast} from "@/hooks/use-toast"
function Toaster({scale=2,...props}:Omit<React.ComponentProps<typeof ToastProvider>,"children">&{scale?:1|2|3}){
 const {toasts}=useToast()
 return <ToastProvider scale={scale} {...props}>{toasts.map(({id,title,description,action,...toast})=><Toast key={id} {...toast}><div>{title!=null&&<ToastTitle>{title}</ToastTitle>}{description!=null&&<ToastDescription>{description}</ToastDescription>}</div>{action}<ToastClose/></Toast>)}<ToastViewport/></ToastProvider>
}
export {Toaster}
