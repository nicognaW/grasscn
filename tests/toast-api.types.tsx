import * as React from "react"
import {Toast,ToastProvider,ToastViewport,ToastTitle,ToastDescription,ToastAction,ToastClose,type ToastProps,type ToastActionElement} from "../registry/ui/toast"
import {Toaster as LegacyToaster} from "../registry/ui/toaster"
import {useToast,toast} from "../registry/hooks/use-toast"
import {Toaster,toast as sonner} from "../registry/ui/sonner"
const li=React.createRef<HTMLLIElement>(),viewport=React.createRef<HTMLOListElement>(),host=React.createRef<HTMLElement>()
const action:ToastActionElement=<ToastAction altText="Undo operation">Undo</ToastAction>
const props:ToastProps={open:true,onOpenChange:value=>void value,scale:3,variant:"default",onSwipeEnd:event=>void event.detail.delta.x}
const primitive=<ToastProvider scale={2} duration={5000} swipeDirection="right"><Toast ref={li} {...props}><ToastTitle>世界已保存</ToastTitle><ToastDescription>你好，世界</ToastDescription>{action}<ToastClose/></Toast><ToastViewport ref={viewport} label="Notifications ({hotkey})"/></ToastProvider>
const composition=<Toast asChild><section><ToastTitle asChild><h3>World saved</h3></ToastTitle><ToastDescription asChild><p>Message</p></ToastDescription></section></Toast>
function Hook(){const {toast,dismiss,toasts}=useToast();const item=toast({title:<strong>Saved</strong>,description:"世界",action});item.update({description:<em>Updated</em>});item.dismiss();dismiss(item.id);return <LegacyToaster scale={3} duration={4000}/>}
const notified=toast({title:"Saved",description:"Message"});notified.update({title:"Updated"});notified.dismiss()
sonner("Saved",{description:"Hello",action:{label:"Undo",onClick:()=>{}}});sonner.success("Success");sonner.promise(Promise.resolve(1),{loading:"Loading",success:value=>String(value),error:"Failed"})
const toaster=<Toaster ref={host} scale={1} position="bottom-left" gap={4} duration={5000} richColors={false} expand={true}/>
// @ts-expect-error Minecraft has no destructive SystemToast color variant.
const destructive=<Toast variant="destructive"/>
// @ts-expect-error Minecraft notifications use their native palette.
const richColors=<Toaster richColors/>
// @ts-expect-error Minecraft notifications have no collapsed stack appearance.
const collapsed=<Toaster expand={false}/>
void [primitive,composition,Hook,toaster,destructive,richColors,collapsed]
