import * as React from "react"
import {AspectRatio} from "../registry/ui/aspect-ratio"
import {DirectionProvider,useDirection} from "../registry/ui/direction"
import {ButtonGroup,ButtonGroupText,ButtonGroupSeparator,buttonGroupVariants} from "../registry/ui/button-group"
import {Pagination,PaginationContent,PaginationItem,PaginationLink,PaginationPrevious,PaginationNext,PaginationEllipsis} from "../registry/ui/pagination"

function StructuralTypes(){
 const div=React.createRef<HTMLDivElement>(),anchor=React.createRef<HTMLAnchorElement>()
 const direction=useDirection("rtl")
 return <DirectionProvider direction={direction}><AspectRatio ref={div} ratio={16/9} style={{overflow:"hidden"}}><img alt="Pixel art"/></AspectRatio>
  <ButtonGroup ref={div} orientation="vertical" scale={3} className={buttonGroupVariants({orientation:"horizontal"})}>
   <ButtonGroupText maxWidth={100} align="center" scale={3}>世界</ButtonGroupText><ButtonGroupText asChild><span>Rich content</span></ButtonGroupText><ButtonGroupSeparator ref={div} orientation="vertical" decorative={false}/>
  </ButtonGroup><Pagination><PaginationContent><PaginationItem><PaginationLink ref={anchor} href="#2" isActive scale={3} size="default">2</PaginationLink></PaginationItem><PaginationPrevious href="#1"/><PaginationNext href="#3"/><PaginationEllipsis/></PaginationContent></Pagination>
 </DirectionProvider>
}
// @ts-expect-error Minecraft provides no icon-sized visual variant.
const unsupported=<PaginationLink size="icon"/>
void StructuralTypes;void unsupported
