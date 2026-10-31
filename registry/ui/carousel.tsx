"use client"

import * as React from "react"
import useEmblaCarousel,{type UseEmblaCarouselType} from "embla-carousel-react"
import {playMinecraftClick} from "./minecraft-sound"
import "./minecraft-pagination.css"
import "./minecraft-pagination-assets.css"
import "./minecraft-carousel.css"

type CarouselApi=UseEmblaCarouselType[1]
type CarouselOptions=Parameters<typeof useEmblaCarousel>[0]
type CarouselPlugin=Parameters<typeof useEmblaCarousel>[1]
type CarouselProps={opts?:CarouselOptions;plugins?:CarouselPlugin;orientation?:"horizontal"|"vertical";setApi?:(api:CarouselApi)=>void;scale?:1|2|3}
type CarouselContextProps=CarouselProps&{carouselRef:UseEmblaCarouselType[0];api:CarouselApi;scrollPrev:()=>void;scrollNext:()=>void;canScrollPrev:boolean;canScrollNext:boolean}
const CarouselContext=React.createContext<CarouselContextProps|null>(null)
function useCarousel(){const value=React.useContext(CarouselContext);if(!value)throw new Error("useCarousel must be used within a <Carousel />");return value}
function Carousel({orientation="horizontal",opts,plugins,setApi,scale=2,className,style,onKeyDownCapture,children,...props}:React.ComponentProps<"div">&CarouselProps){
 const[carouselRef,api]=useEmblaCarousel({...opts,axis:orientation==="horizontal"?"x":"y"},plugins),[canScrollPrev,setPrev]=React.useState(false),[canScrollNext,setNext]=React.useState(false)
 const scrollPrev=React.useCallback(()=>{api?.scrollPrev()},[api]),scrollNext=React.useCallback(()=>{api?.scrollNext()},[api])
 React.useEffect(()=>{if(api)setApi?.(api)},[api,setApi])
 React.useEffect(()=>{if(!api)return;const update=()=>{setPrev(api.canScrollPrev());setNext(api.canScrollNext())};update();api.on("select",update).on("reInit",update);return()=>{api.off("select",update).off("reInit",update)}},[api])
 return <CarouselContext.Provider value={{carouselRef,api,opts,plugins,orientation,scale,scrollPrev,scrollNext,canScrollPrev,canScrollNext}}><div role="region" aria-roledescription="carousel" data-slot="carousel" data-orientation={orientation} className={`mc-carousel ${className??""}`} style={{"--mc-scale":scale,...style}as React.CSSProperties} {...props} onKeyDownCapture={event=>{onKeyDownCapture?.(event);if(event.defaultPrevented||(event.target as HTMLElement).closest("input,textarea,select,[contenteditable=true]"))return;const prev=orientation==="vertical"?"ArrowUp":opts?.direction==="rtl"?"ArrowRight":"ArrowLeft",next=orientation==="vertical"?"ArrowDown":opts?.direction==="rtl"?"ArrowLeft":"ArrowRight";if(event.key===prev){event.preventDefault();scrollPrev()}else if(event.key===next){event.preventDefault();scrollNext()}}}>{children}</div></CarouselContext.Provider>
}
function CarouselContent({className,...props}:React.ComponentProps<"div">){const{carouselRef}=useCarousel();return <div data-slot="carousel-content" className="mc-carousel-viewport" ref={carouselRef}><div data-slot="carousel-track" className={`mc-carousel-track ${className??""}`} {...props}/></div>}
function CarouselItem({className,...props}:React.ComponentProps<"div">){return <div role="group" aria-roledescription="slide" data-slot="carousel-item" className={`mc-carousel-item ${className??""}`} {...props}/>}
type CarouselArrowProps=React.ComponentProps<"button">&{scale?:1|2|3;variant?:"default";size?:"default"}
function CarouselArrow({direction,scale:ownScale,variant="default",size="default",className,style,disabled,onClick,...props}:CarouselArrowProps&{direction:"backward"|"forward"}){const context=useCarousel(),forward=direction==="forward",inactive=disabled??!(forward?context.canScrollNext:context.canScrollPrev);if(variant!=="default"||size!=="default")throw new Error("Minecraft Carousel arrows support only the original default appearance");return <button type="button" aria-label={forward?"Next slide":"Previous slide"} data-slot={forward?"carousel-next":"carousel-previous"} data-direction={direction} aria-disabled={inactive||undefined} disabled={inactive} className={`mc-pagination-arrow mc-carousel-arrow ${className??""}`} style={{"--mc-scale":ownScale??context.scale,...style}as React.CSSProperties} {...props} onClick={event=>{if(inactive){event.preventDefault();return};onClick?.(event);if(!event.defaultPrevented){forward?context.scrollNext():context.scrollPrev();playMinecraftClick()}}}/>}
function CarouselPrevious(props:CarouselArrowProps){return <CarouselArrow direction="backward" {...props}/>}
function CarouselNext(props:CarouselArrowProps){return <CarouselArrow direction="forward" {...props}/>}
export{Carousel,CarouselContent,CarouselItem,CarouselPrevious,CarouselNext,useCarousel}
export type{CarouselApi,CarouselProps,CarouselOptions,CarouselPlugin,CarouselArrowProps}
