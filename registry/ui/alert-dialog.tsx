"use client"

import * as React from "react"
import { AlertDialog as Primitive } from "radix-ui"
import { Button } from "./button"
import { ConfirmationTextContext, MinecraftConfirmationText, confirmationButtonText } from "./minecraft-confirmation-text"
import { MinecraftConfirmationBlur } from "./minecraft-confirmation-blur"
import { confirmationMenuBackground } from "./minecraft-confirmation-assets"
import "./minecraft-card.css"
import "./minecraft-dialog.css"
import "./minecraft-alert-dialog.css"

const ScaleContext=React.createContext<1|2|3>(2)
const IdentityContext=React.createContext("")
function AlertDialog({scale=2,...props}:React.ComponentProps<typeof Primitive.Root>&{scale?:1|2|3}) {const identity=React.useId();return <IdentityContext.Provider value={identity}><ScaleContext.Provider value={scale}><Primitive.Root {...props}/></ScaleContext.Provider></IdentityContext.Provider>}
function AlertDialogTrigger({asChild,children,...props}:React.ComponentProps<typeof Primitive.Trigger>) {
  const scale=React.useContext(ScaleContext)
  return asChild ? <Primitive.Trigger asChild data-slot="alert-dialog-trigger" {...props}>{children}</Primitive.Trigger> : <Primitive.Trigger asChild data-slot="alert-dialog-trigger"><Button scale={scale} {...props}>{children}</Button></Primitive.Trigger>
}
function AlertDialogPortal(props:React.ComponentProps<typeof Primitive.Portal>) {return <Primitive.Portal {...props}/>}
function AlertDialogOverlay({className,children,asChild,blur=5,style,...props}:React.ComponentProps<typeof Primitive.Overlay>&{blur?:number}) {
  const identity=React.useContext(IdentityContext)
  const child=asChild ? React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}> : null
  const content=<><MinecraftConfirmationBlur radius={blur} identity={identity}/>{child ? child.props.children : children}</>
  return <Primitive.Overlay data-slot="alert-dialog-overlay" data-mc-confirmation-id={identity} asChild={asChild} className={`mc-alert-dialog-overlay ${className??""}`} style={{backgroundImage:`url("${confirmationMenuBackground}")`,...style}} {...props}>{child ? React.cloneElement(child,undefined,content) : content}</Primitive.Overlay>
}
type AlertDialogContentProps=React.ComponentProps<typeof Primitive.Content>&{scale?:1|2|3;blur?:number}
function AlertDialogContent({scale:explicitScale,blur=5,children,className,ref,style,asChild,...props}:AlertDialogContentProps) {
  const inherited=React.useContext(ScaleContext),scale=explicitScale??inherited
  const identity=React.useContext(IdentityContext)
  const [node,setNode]=React.useState<HTMLDivElement|null>(null),[viewport,setViewport]=React.useState(()=>typeof window==="undefined" ? 1024 : innerWidth)
  const [compact,setCompact]=React.useState(false),[measuredWidth,setMeasuredWidth]=React.useState(462)
  const forwarded=React.useCallback((element:HTMLDivElement|null)=>{setNode(element);if(typeof ref==="function"){const cleanup=ref(element);if(typeof cleanup==="function")return()=>{setNode(null);cleanup()}}else if(ref)ref.current=element},[ref])
  React.useLayoutEffect(()=>{
    if(!node)return
    let frame=0
    const measure=()=>{
      setViewport(innerWidth)
      if(!node.offsetWidth)return
      const gutter=8*scale,availableHeight=Math.max(scale,innerHeight-2*gutter)
      node.style.setProperty("--mc-confirmation-max-width",`${Math.max(scale,innerWidth-2*gutter)}px`)
      node.style.setProperty("--mc-confirmation-max-height",`${availableHeight}px`)
      const naturalTitle=Number(node.querySelector<HTMLElement>('[data-mc-confirmation-natural-width]')?.dataset.mcConfirmationNaturalWidth??0)
      const header=node.querySelector<HTMLElement>('[data-slot="alert-dialog-header"]')
      let naturalHeight=node.scrollHeight+(header?Math.max(0,header.scrollHeight-header.clientHeight):0)
      for(const text of node.querySelectorAll<HTMLElement>('[data-mc-confirmation-native-height]'))naturalHeight+=Number(text.dataset.mcConfirmationNativeHeight)-text.getBoundingClientRect().height
      const nextCompact=innerWidth<320*scale||naturalTitle>innerWidth||naturalHeight>availableHeight
      node.dataset.mcConfirmationCompact=String(nextCompact);setCompact(nextCompact)
      const availableWidth=Math.max(scale,Math.floor(node.clientWidth/scale)*scale)
      node.dataset.mcConfirmationStacked=String(nextCompact&&availableWidth<304*scale)
      node.style.setProperty("--mc-confirmation-action-width",`${Math.min(150*scale,availableWidth)}px`)
      setMeasuredWidth(Math.max(1,Math.floor((nextCompact&&header?header.clientWidth:node.clientWidth)/scale)))
      const boxWidth=node.offsetWidth/scale,width=(nextCompact?node.clientWidth:node.offsetWidth)/scale,height=node.offsetHeight/scale
      node.style.left=`${Math.floor((Math.ceil(innerWidth/scale)-boxWidth)/2)*scale}px`
      node.style.top=`${Math.floor((Math.ceil(innerHeight/scale)-height)/2)*scale}px`
      const bounds=node.getBoundingClientRect()
      for(const item of node.querySelectorAll<HTMLElement>('[data-mc-confirmation-item="true"]')){
        if(item.closest('.mc-alert-dialog-content')!==node)continue
        const rect=item.getBoundingClientRect(),inHeader=nextCompact&&header&&item.closest('[data-slot="alert-dialog-header"]')===header,areaWidth=inHeader?header.clientWidth/scale:width,areaLeft=inHeader?header.getBoundingClientRect().left:bounds.left,previous=Number(item.dataset.mcConfirmationShift??0),next=previous+areaLeft+Math.floor((areaWidth-rect.width/scale)/2)*scale-rect.left
        item.dataset.mcConfirmationShift=String(next);item.style.setProperty("--mc-confirmation-x",`${next}px`)
      }
      node.dataset.mcConfirmationReady="true"
    }
    const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure)},resize=new ResizeObserver(update),mutation=new MutationObserver(update)
    resize.observe(node);mutation.observe(node,{subtree:true,childList:true,characterData:true});window.addEventListener("resize",update);measure()
    return()=>{resize.disconnect();mutation.disconnect();cancelAnimationFrame(frame);window.removeEventListener("resize",update)}
  },[node,scale])
  return <AlertDialogPortal forceMount={props.forceMount}><AlertDialogOverlay forceMount={props.forceMount} blur={blur}/><ScaleContext.Provider value={scale}><ConfirmationTextContext.Provider value={{scale,compact,nativeContentWidth:Math.max(1,Math.ceil(viewport/scale)-50),contentWidth:compact?measuredWidth:Math.max(1,Math.ceil(viewport/scale)-50)}}><Primitive.Content data-slot="alert-dialog-content" data-mc-confirmation-id={identity} ref={forwarded} asChild={asChild} className={`mc-alert-dialog-content ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}>{children}</Primitive.Content></ConfirmationTextContext.Provider></ScaleContext.Provider></AlertDialogPortal>
}
function AlertDialogHeader({className,tabIndex,...props}:React.ComponentProps<"div">) {const {compact}=React.useContext(ConfirmationTextContext);return <div data-slot="alert-dialog-header" tabIndex={tabIndex??(compact?0:undefined)} className={`mc-alert-dialog-header ${className??""}`} {...props}/>}
function AlertDialogMedia({className,...props}:React.ComponentProps<"div">) {return <div data-slot="alert-dialog-media" data-mc-confirmation-item="true" className={`mc-alert-dialog-media ${className??""}`} {...props}/>}
function AlertDialogFooter({className,...props}:React.ComponentProps<"div">) {return <div data-slot="alert-dialog-footer" data-mc-confirmation-item="true" className={`mc-alert-dialog-footer ${className??""}`} {...props}/>}
function AlertDialogTitle({children,className,asChild,...props}:React.ComponentProps<typeof Primitive.Title>) {
  const child=asChild ? React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}> : null
  const content=<MinecraftConfirmationText title>{child ? child.props.children : children}</MinecraftConfirmationText>
  return <Primitive.Title data-slot="alert-dialog-title" data-mc-confirmation-item="true" asChild={asChild} className={`mc-alert-dialog-title ${className??""}`} {...props}>{child ? React.cloneElement(child,undefined,content) : content}</Primitive.Title>
}
function AlertDialogDescription({children,className,asChild,...props}:React.ComponentProps<typeof Primitive.Description>) {
  const child=asChild ? React.Children.only(children) as React.ReactElement<{children?:React.ReactNode}> : null
  const content=<MinecraftConfirmationText>{child ? child.props.children : children}</MinecraftConfirmationText>
  return <Primitive.Description data-slot="alert-dialog-description" data-mc-confirmation-item="true" asChild={asChild} className={`mc-alert-dialog-description ${className??""}`} {...props}>{child ? React.cloneElement(child,undefined,content) : content}</Primitive.Description>
}
function actionSkin(children:React.ReactNode,asChild:boolean|undefined,scale:1|2|3) {
  if(!asChild)return <Button scale={scale}>{confirmationButtonText(children)}</Button>
  const child=React.Children.only(children) as React.ReactElement<{children?:React.ReactNode;scale?:1|2|3}>
  const content=confirmationButtonText(child.props.children)
  if(child.type===Button)return React.cloneElement(child,{scale:child.props.scale??scale},content)
  return <Button asChild scale={scale}>{React.cloneElement(child,undefined,content)}</Button>
}
function AlertDialogAction({asChild,children="Yes",...props}:React.ComponentProps<typeof Primitive.Action>) {
  const scale=React.useContext(ScaleContext)
  return <Primitive.Action asChild data-slot="alert-dialog-action" {...props}>{actionSkin(children,asChild,scale)}</Primitive.Action>
}
function AlertDialogCancel({asChild,children="No",...props}:React.ComponentProps<typeof Primitive.Cancel>) {
  const scale=React.useContext(ScaleContext)
  return <Primitive.Cancel asChild data-slot="alert-dialog-cancel" {...props}>{actionSkin(children,asChild,scale)}</Primitive.Cancel>
}
export {AlertDialog,AlertDialogTrigger,AlertDialogPortal,AlertDialogOverlay,AlertDialogContent,AlertDialogHeader,AlertDialogMedia,AlertDialogFooter,AlertDialogTitle,AlertDialogDescription,AlertDialogAction,AlertDialogCancel}
export type {AlertDialogContentProps}
