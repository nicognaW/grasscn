"use client"

import * as React from "react"
import {MinecraftDisclosureText} from "./minecraft-disclosure-text"
import {minecraftSelectAssets} from "./minecraft-select-assets"
import "./minecraft-table.css"

const TableScale=React.createContext<1|2|3>(2)
function literalText(children:React.ReactNode):string|null {
 let result="",plain=true
 const visit=(node:React.ReactNode)=>{if(node==null||typeof node==="boolean")return;if(typeof node==="string"||typeof node==="number"||typeof node==="bigint"){result+=String(node);return};if(Array.isArray(node)){node.forEach(visit);return};if(React.isValidElement<{children?:React.ReactNode}>(node)&&node.type===React.Fragment){visit(node.props.children);return};plain=false}
 visit(children);return plain?result:null
}
type TextLayout={maxTextWidth?:number;textAlign?:"left"|"center"}
function TableText({children,maxTextWidth,textAlign="left"}:{children:React.ReactNode}&TextLayout){const scale=React.useContext(TableScale),value=literalText(children);if(children==null||typeof children==="boolean")return null;return value==null?children:<MinecraftDisclosureText scale={scale} maxWidth={maxTextWidth} align={textAlign} style={{width:"100%"}}>{value}</MinecraftDisclosureText>}
function Table({className,scale=2,style,...props}:React.ComponentProps<"table">&{scale?:1|2|3}){return <TableScale.Provider value={scale}><div data-slot="table-container" className="mc-table-container" style={{"--mc-scale":scale}as React.CSSProperties}><table data-slot="table" className={`mc-table ${className??""}`} style={{"--mc-scale":scale,"--mc-table-background":minecraftSelectAssets.menu_list_background,"--mc-table-header":minecraftSelectAssets.header_separator,"--mc-table-footer":minecraftSelectAssets.footer_separator,...style}as React.CSSProperties} {...props}/></div></TableScale.Provider>}
function TableHeader({className,...props}:React.ComponentProps<"thead">){return <thead data-slot="table-header" className={`mc-table-header ${className??""}`} {...props}/>}
function TableBody({className,...props}:React.ComponentProps<"tbody">){return <tbody data-slot="table-body" className={`mc-table-body ${className??""}`} {...props}/>}
function TableFooter({className,...props}:React.ComponentProps<"tfoot">){return <tfoot data-slot="table-footer" className={`mc-table-footer ${className??""}`} {...props}/>}
function TableRow({className,...props}:React.ComponentProps<"tr">){return <tr data-slot="table-row" className={`mc-table-row ${className??""}`} {...props}/>}
function TableHead({className,children,maxTextWidth,textAlign,...props}:React.ComponentProps<"th">&TextLayout){return <th data-slot="table-head" scope="col" className={`mc-table-head ${className??""}`} {...props}><TableText maxTextWidth={maxTextWidth} textAlign={textAlign}>{children}</TableText></th>}
function TableCell({className,children,maxTextWidth,textAlign,...props}:React.ComponentProps<"td">&TextLayout){return <td data-slot="table-cell" className={`mc-table-cell ${className??""}`} {...props}><TableText maxTextWidth={maxTextWidth} textAlign={textAlign}>{children}</TableText></td>}
function TableCaption({className,children,maxTextWidth,textAlign,...props}:React.ComponentProps<"caption">&TextLayout){return <caption data-slot="table-caption" className={`mc-table-caption ${className??""}`} {...props}><TableText maxTextWidth={maxTextWidth} textAlign={textAlign}>{children}</TableText></caption>}

export {Table,TableHeader,TableBody,TableFooter,TableRow,TableHead,TableCell,TableCaption}
