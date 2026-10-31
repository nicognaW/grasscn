"use client"

import * as React from "react"
import { Slot } from "radix-ui"
import { cva } from "class-variance-authority"
import { Button } from "./button"
import { Input } from "./input"
import { Separator } from "./separator"
import { Card } from "./card"
import { ScrollArea, ScrollBar } from "./scroll-area"
import { MinecraftDisclosureText } from "./minecraft-disclosure-text"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./sheet"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./tooltip"
import "./minecraft-sidebar.css"

type Scale=1|2|3
type SidebarState={state:"expanded"|"collapsed";open:boolean;setOpen:React.Dispatch<React.SetStateAction<boolean>>;openMobile:boolean;setOpenMobile:React.Dispatch<React.SetStateAction<boolean>>;isMobile:boolean;toggleSidebar:()=>void}
type Context=SidebarState&{scale:Scale;lastActive:React.RefObject<HTMLElement|null>}
const SidebarContext=React.createContext<Context|null>(null)
const CollapsibleContext=React.createContext<"offcanvas"|"icon"|"none">("offcanvas")
function useSidebarContext(){const value=React.useContext(SidebarContext);if(!value)throw new Error("useSidebar must be used within a SidebarProvider.");return value}
function useSidebar():SidebarState{const{scale,lastActive,...state}=useSidebarContext();return state}
function useIsMobile(){const[mobile,setMobile]=React.useState(false);React.useEffect(()=>{const query=matchMedia("(max-width: 767px)"),update=()=>setMobile(query.matches);update();query.addEventListener("change",update);return()=>query.removeEventListener("change",update)},[]);return mobile}

function SidebarProvider({defaultOpen=true,open:controlled,onOpenChange,className,style,children,scale=2,...props}:React.ComponentProps<"div">&{defaultOpen?:boolean;open?:boolean;onOpenChange?:(open:boolean)=>void;scale?:Scale}){
 const isMobile=useIsMobile(),[internal,setInternal]=React.useState(defaultOpen),[openMobile,setOpenMobile]=React.useState(false),lastActive=React.useRef<HTMLElement|null>(null)
 const open=controlled??internal,latest=React.useRef(open);latest.current=open
 const setOpen=React.useCallback<React.Dispatch<React.SetStateAction<boolean>>>(next=>{const value=typeof next==="function"?next(latest.current):next;if(controlled===undefined){latest.current=value;setInternal(value)}onOpenChange?.(value)},[controlled,onOpenChange])
 React.useEffect(()=>{document.cookie=`sidebar_state=${open}; path=/; max-age=${60*60*24*7}`},[open])
 const toggleSidebar=React.useCallback(()=>{if(isMobile){if(!openMobile&&document.activeElement instanceof HTMLElement)lastActive.current=document.activeElement;setOpenMobile(value=>!value)}else setOpen(value=>!value)},[isMobile,openMobile,setOpen])
 React.useEffect(()=>{const listener=(event:KeyboardEvent)=>{if(!event.defaultPrevented&&event.key==="b"&&(event.metaKey||event.ctrlKey)){event.preventDefault();toggleSidebar()}};window.addEventListener("keydown",listener);return()=>window.removeEventListener("keydown",listener)},[toggleSidebar])
 const value=React.useMemo<Context>(()=>({state:open?"expanded":"collapsed",open,setOpen,openMobile,setOpenMobile,isMobile,toggleSidebar,scale,lastActive}),[open,setOpen,openMobile,isMobile,toggleSidebar,scale])
 return <SidebarContext.Provider value={value}><TooltipProvider delayDuration={0}><div data-slot="sidebar-wrapper" className={`mc-sidebar-wrapper ${className??""}`} style={{"--mc-scale":scale,"--sidebar-width":`${120*scale}px`,"--sidebar-width-icon":`${36*scale}px`,"--sidebar-width-mobile":`${140*scale}px`,...style} as React.CSSProperties} {...props}>{children}</div></TooltipProvider></SidebarContext.Provider>
}

type SidebarProps=React.ComponentProps<"div">&{side?:"left"|"right";variant?:"sidebar";collapsible?:"offcanvas"|"icon"|"none"}
function Sidebar({side="left",variant="sidebar",collapsible="offcanvas",className,children,style,...props}:SidebarProps){
 const{state,isMobile,openMobile,setOpenMobile,scale,lastActive}=useSidebarContext()
 if(variant!=="sidebar")throw new Error("Minecraft Sidebar supports the default sidebar visual variant only")
 const content=<CollapsibleContext.Provider value={collapsible}>{children}</CollapsibleContext.Provider>
 if(collapsible==="none")return <Card scale={scale} data-slot="sidebar" data-sidebar="sidebar" data-side={side} data-state={state} data-collapsible="none" className={`mc-sidebar mc-sidebar-static ${className??""}`} style={style} {...props}>{content}</Card>
 if(isMobile)return <Sheet scale={scale} open={openMobile} onOpenChange={setOpenMobile}><SheetContent side={side} data-slot="sidebar" data-sidebar="sidebar" data-mobile="true" data-state={openMobile?"expanded":"collapsed"} className={`mc-sidebar mc-sidebar-mobile ${className??""}`} style={{width:Math.min(140*scale,typeof innerWidth==="number"?innerWidth:140*scale),...style,position:"fixed"}} onOpenAutoFocus={()=>{if(!lastActive.current&&document.activeElement instanceof HTMLElement)lastActive.current=document.activeElement}} onCloseAutoFocus={event=>{event.preventDefault();if(lastActive.current?.isConnected)lastActive.current.focus();lastActive.current=null}} {...props}>
  <SheetHeader className="mc-sidebar-accessible"><SheetTitle>Sidebar</SheetTitle><SheetDescription>Displays the mobile sidebar.</SheetDescription></SheetHeader>{content}
 </SheetContent></Sheet>
 const closed=state==="collapsed"&&collapsible==="offcanvas"
 return <div data-slot="sidebar" data-state={state} data-side={side} data-variant={variant} data-collapsible={state==="collapsed"?collapsible:""} className="mc-sidebar">
  <div data-slot="sidebar-gap" className="mc-sidebar-gap"/>
  <div data-slot="sidebar-container" className={`mc-sidebar-container ${className??""}`} style={style} inert={closed||undefined} aria-hidden={closed||undefined} {...props}><Card scale={scale} data-slot="sidebar-inner" data-sidebar="sidebar" className="mc-sidebar-inner">{content}</Card></div>
 </div>
}

function SidebarActionButton({asChild=false,children,onClick,...props}:React.ComponentProps<typeof Button>){
 const inactive=props.disabled||props["aria-disabled"]===true||props["aria-disabled"]==="true",child=asChild?React.Children.only(children) as React.ReactElement<{children?:React.ReactNode;onClick?:React.MouseEventHandler<HTMLElement>}>:null
 const content=child?React.cloneElement(child,{onClick:event=>{if(inactive){event.preventDefault();return};child.props.onClick?.(event)}}):children
 return <Button asChild={asChild} {...props} aria-disabled={inactive||props["aria-disabled"]} tabIndex={inactive?-1:props.tabIndex} onClick={event=>{if(inactive){event.preventDefault();return};onClick?.(event)}}>{content}</Button>
}

function SidebarTrigger({className,onClick,children="=",scale:explicit,...props}:React.ComponentProps<typeof Button>){const{toggleSidebar,open,openMobile,isMobile,scale}=useSidebarContext();return <SidebarActionButton type="button" data-slot="sidebar-trigger" data-sidebar="trigger" aria-label="Toggle Sidebar" aria-expanded={isMobile?openMobile:open} scale={explicit??scale} className={`mc-sidebar-trigger ${className??""}`} {...props} onClick={event=>{onClick?.(event);if(!event.defaultPrevented)toggleSidebar()}}>{children}</SidebarActionButton>}
function SidebarRail({className,onClick,...props}:React.ComponentProps<"button">){const{toggleSidebar}=useSidebarContext();return <button type="button" data-slot="sidebar-rail" data-sidebar="rail" aria-label="Toggle Sidebar" title="Toggle Sidebar" tabIndex={-1} className={`mc-sidebar-rail ${className??""}`} {...props} onClick={event=>{onClick?.(event);if(!event.defaultPrevented)toggleSidebar()}}/>}
function SidebarInset({className,...props}:React.ComponentProps<"main">){return <main data-slot="sidebar-inset" className={`mc-sidebar-inset ${className??""}`} {...props}/>}
function SidebarInput({className,scale:explicit,...props}:React.ComponentProps<typeof Input>){const{scale}=useSidebarContext();return <Input data-slot="sidebar-input" data-sidebar="input" scale={explicit??scale} className={`mc-sidebar-input ${className??""}`} {...props}/>}
function SidebarSeparator({className,scale:explicit,...props}:React.ComponentProps<typeof Separator>){const{scale}=useSidebarContext();return <Separator data-slot="sidebar-separator" data-sidebar="separator" scale={explicit??scale} className={`mc-sidebar-separator ${className??""}`} {...props}/>}

function SidebarHeader({className,...props}:React.ComponentProps<"div">){return <div data-slot="sidebar-header" data-sidebar="header" className={`mc-sidebar-header ${className??""}`} {...props}/>}
function SidebarFooter({className,...props}:React.ComponentProps<"div">){return <div data-slot="sidebar-footer" data-sidebar="footer" className={`mc-sidebar-footer ${className??""}`} {...props}/>}
function SidebarContent({className,children,onScroll,viewportProps,...props}:React.ComponentProps<"div">&Pick<React.ComponentProps<typeof ScrollArea>,"viewportRef"|"viewportProps"|"disabled">){const{scale}=useSidebarContext();return <ScrollArea data-slot="sidebar-content" data-sidebar="content" scale={scale} className={`mc-sidebar-content ${className??""}`} {...props as React.ComponentProps<typeof ScrollArea>} viewportProps={{...viewportProps,onScroll:event=>{viewportProps?.onScroll?.(event);onScroll?.(event)}}}><>{children}</><ScrollBar/></ScrollArea>}
function SidebarGroup({className,...props}:React.ComponentProps<"div">){return <div data-slot="sidebar-group" data-sidebar="group" className={`mc-sidebar-group ${className??""}`} {...props}/>}
function SidebarGroupContent({className,...props}:React.ComponentProps<"div">){return <div data-slot="sidebar-group-content" data-sidebar="group-content" className={`mc-sidebar-group-content ${className??""}`} {...props}/>}
type SidebarLabelProps=React.ComponentProps<"div">&{asChild?:boolean;maxWidth?:number;align?:"left"|"center"}
function SidebarGroupLabel({className,asChild=false,children,maxWidth,align,...props}:SidebarLabelProps){const{scale}=useSidebarContext();return asChild?<Slot.Root data-slot="sidebar-group-label" data-sidebar="group-label" className={`mc-sidebar-group-label ${className??""}`} {...props}>{children}</Slot.Root>:<MinecraftDisclosureText data-slot="sidebar-group-label" data-sidebar="group-label" scale={scale} maxWidth={maxWidth} align={align} className={`mc-sidebar-group-label ${className??""}`} {...props}>{children}</MinecraftDisclosureText>}
function SidebarGroupAction({className,scale:explicit,style,...props}:React.ComponentProps<typeof Button>){const{scale}=useSidebarContext();return <SidebarActionButton type="button" data-slot="sidebar-group-action" data-sidebar="group-action" scale={explicit??scale} className={`mc-sidebar-group-action ${className??""}`} style={{position:"absolute",right:4*(explicit??scale),top:0,...style}} {...props}/>}
function SidebarMenu({className,...props}:React.ComponentProps<"ul">){return <ul data-slot="sidebar-menu" data-sidebar="menu" className={`mc-sidebar-menu ${className??""}`} {...props}/>}
function SidebarMenuItem({className,...props}:React.ComponentProps<"li">){return <li data-slot="sidebar-menu-item" data-sidebar="menu-item" className={`mc-sidebar-menu-item ${className??""}`} {...props}/>}

function plainText(children:React.ReactNode):string{return React.Children.toArray(children).map(child=>typeof child==="string"||typeof child==="number"?String(child):React.isValidElement<{children?:React.ReactNode}>(child)&&child.type!=="svg"?plainText(child.props.children):"").join("")}
function collapsedContent(children:React.ReactNode):React.ReactNode{const values=React.Children.toArray(children),icon=values.find(child=>React.isValidElement<{children?:React.ReactNode;"data-sidebar-icon"?:boolean}>(child)&&(child.type==="svg"||child.props["data-sidebar-icon"]||child.props.children===undefined));return icon??Array.from(plainText(children))[0]??"?"}
const sidebarMenuButtonVariants=cva("mc-sidebar-menu-button",{variants:{variant:{default:""},size:{default:""}},defaultVariants:{variant:"default",size:"default"}})
type SidebarMenuButtonProps=Omit<React.ComponentProps<typeof Button>,"variant"|"size">&{variant?:"default";size?:"default";isActive?:boolean;tooltip?:string|React.ComponentProps<typeof TooltipContent>}
function SidebarMenuButton({className,asChild=false,isActive=false,variant="default",size="default",tooltip,children,onClick,scale:explicit,...props}:SidebarMenuButtonProps){
 const{state,isMobile,scale:inherited}=useSidebarContext(),mode=React.useContext(CollapsibleContext),scale=explicit??inherited,collapsed=!isMobile&&state==="collapsed"&&mode==="icon",disabled=props.disabled||props["aria-disabled"]===true||props["aria-disabled"]==="true"
 if(variant!=="default"||size!=="default")throw new Error("Minecraft sidebar menu buttons support the native default visual variant and size only")
 const child=asChild?React.Children.only(children) as React.ReactElement<{children?:React.ReactNode;onClick?:React.MouseEventHandler<HTMLElement>}>:null,raw=child?child.props.children:children,label=props["aria-label"]??plainText(raw),display=collapsed?collapsedContent(raw):raw
 const content=child?React.cloneElement(child,{onClick:event=>{if(disabled){event.preventDefault();return};child.props.onClick?.(event)}},display):display
 const button=<Button type="button" asChild={asChild} data-slot="sidebar-menu-button" data-sidebar="menu-button" data-active={isActive||undefined} aria-current={isActive?"page":undefined} data-size={size} aria-label={label||undefined} scale={scale} className={sidebarMenuButtonVariants({variant,size,className})} {...props} aria-disabled={disabled||props["aria-disabled"]} tabIndex={disabled?-1:props.tabIndex} onClick={event=>{if(disabled){event.preventDefault();return};onClick?.(event)}}>{content}</Button>
 if(!tooltip||state!=="collapsed"||isMobile)return button
 const info=typeof tooltip==="string"?{children:tooltip}:tooltip
 return <Tooltip><TooltipTrigger asChild>{button}</TooltipTrigger><TooltipContent side="right" align="center" scale={scale} {...info}/></Tooltip>
}
function SidebarMenuAction({className,showOnHover=false,scale:explicit,style,...props}:React.ComponentProps<typeof Button>&{showOnHover?:boolean}){const{scale}=useSidebarContext();return <SidebarActionButton type="button" data-slot="sidebar-menu-action" data-sidebar="menu-action" data-show-on-hover={showOnHover||undefined} scale={explicit??scale} className={`mc-sidebar-menu-action ${className??""}`} style={{position:"absolute",right:2*(explicit??scale),top:0,...style}} {...props}/>}
function SidebarMenuBadge({className,maxWidth,align,...props}:React.ComponentProps<"div">&{maxWidth?:number;align?:"left"|"center"}){const{scale}=useSidebarContext();return <MinecraftDisclosureText data-slot="sidebar-menu-badge" data-sidebar="menu-badge" scale={scale} maxWidth={maxWidth} align={align} className={`mc-sidebar-menu-badge ${className??""}`} {...props}/>}
function SidebarMenuSkeleton({className,showIcon=false,style,...props}:React.ComponentProps<"div">&{showIcon?:boolean}){const{scale}=useSidebarContext();return <div data-slot="sidebar-menu-skeleton" data-sidebar="menu-skeleton" aria-busy="true" className={`mc-sidebar-menu-skeleton ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}>{showIcon?<Button disabled scale={scale} aria-hidden="true" tabIndex={-1} className="mc-sidebar-skeleton-icon"/>:null}<Button disabled scale={scale} aria-hidden="true" tabIndex={-1} className="mc-sidebar-skeleton-label"/></div>}
function SidebarMenuSub({className,...props}:React.ComponentProps<"ul">){return <ul data-slot="sidebar-menu-sub" data-sidebar="menu-sub" className={`mc-sidebar-menu-sub ${className??""}`} {...props}/>}
function SidebarMenuSubItem({className,...props}:React.ComponentProps<"li">){return <li data-slot="sidebar-menu-sub-item" data-sidebar="menu-sub-item" className={`mc-sidebar-menu-sub-item ${className??""}`} {...props}/>}
function SidebarMenuSubButton({asChild=false,isActive=false,className,children,size="default",...props}:React.ComponentProps<"a">&{asChild?:boolean;isActive?:boolean;size?:"default"}){return <SidebarMenuButton asChild isActive={isActive} size={size} aria-disabled={props["aria-disabled"]} data-slot="sidebar-menu-sub-button" data-sidebar="menu-sub-button" className={`mc-sidebar-menu-sub-button ${className??""}`}>{asChild?React.cloneElement(React.Children.only(children) as React.ReactElement,props):<a {...props}>{children}</a>}</SidebarMenuButton>}

export{Sidebar,SidebarContent,SidebarFooter,SidebarGroup,SidebarGroupAction,SidebarGroupContent,SidebarGroupLabel,SidebarHeader,SidebarInput,SidebarInset,SidebarMenu,SidebarMenuAction,SidebarMenuBadge,SidebarMenuButton,SidebarMenuItem,SidebarMenuSkeleton,SidebarMenuSub,SidebarMenuSubButton,SidebarMenuSubItem,SidebarProvider,SidebarRail,SidebarSeparator,SidebarTrigger,useSidebar}
