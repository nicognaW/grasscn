import * as React from "react"
import { minecraftGlyphs } from "./minecraft-font"
import { MinecraftText } from "./minecraft-text"
import { getUnihexGlyph,loadUnihex } from "./minecraft-unifont"
import { MinecraftUnicodeLabel } from "./minecraft-unicode-label"
import { confirmationUnihexAtlas } from "./minecraft-confirmation-atlas"

export const ConfirmationTextContext=React.createContext<{scale:number;contentWidth:number;compact?:boolean;nativeContentWidth?:number}>({scale:2,contentWidth:462})
const advance=(char:string)=>minecraftGlyphs[char.codePointAt(0)!-32]?.[2] ?? getUnihexGlyph(char)?.advance ?? 0
const widthOf=(text:string)=>Math.ceil(Array.from(text).reduce((sum,char)=>sum+advance(char),0))
function wrap(text:string,maximum:number) {
  const lines:string[]=[]
  for(let remaining of text.split("\n")){
    while(widthOf(remaining)>maximum){
      let count=0,used=0,space=-1
      while(count<remaining.length){if(remaining[count]===" ")space=count;const next=advance(remaining[count]);if(used+next>maximum&&count>0)break;used+=next;count++}
      const end=space>=0 ? space : Math.max(1,count);lines.push(remaining.slice(0,end));remaining=remaining.slice(end+Number(space>=0))
    }
    lines.push(remaining)
  }
  return lines
}
export function confirmationButtonText(children:React.ReactNode) {
  return (typeof children==="string"||typeof children==="number")&&/[^\x20-\x7e]/.test(String(children)) ? <MinecraftUnicodeLabel text={String(children)} atlas={confirmationUnihexAtlas}/> : children
}
export function MinecraftConfirmationText({children,title=false}:{children:React.ReactNode;title?:boolean}) {
  const {scale,contentWidth,compact=false,nativeContentWidth=contentWidth}=React.useContext(ConfirmationTextContext),[,loaded]=React.useReducer(n=>n+1,0)
  const unicode=typeof children==="string"&&/[^\x20-\x7e\n]/.test(children)
  React.useEffect(()=>{let active=true;if(unicode)loadUnihex().then(()=>{if(active)loaded()});return()=>{active=false}},[unicode])
  if((typeof children!=="string"&&typeof children!=="number")||!Array.from(String(children)).every(char=>/^[\x20-\x7e\n]$/.test(char)||getUnihexGlyph(char)))return <span>{children}</span>
  const text=String(children),allLines=text==="" ? [] : title&&!compact ? [text] : wrap(text,contentWidth),lines=compact?allLines:allLines.slice(0,title ? 1 : 15)
  if(!compact && !title && allLines.length>15){let last=lines[14];const limit=widthOf(last)-widthOf("...");while(last.length&&widthOf(last)>limit)last=last.slice(0,-1);lines[14]=last+"..."}
  const widths=lines.map(widthOf),widest=Math.max(0,...widths)
  const nativeLines=text===""?[]:title?[text]:compact?wrap(text,nativeContentWidth):allLines
  return <span className="mc-confirmation-text" data-mc-confirmation-native-height={Math.min(title?1:15,nativeLines.length)*9*scale} data-mc-confirmation-natural-width={title?Math.max(0,...text.split("\n").map(widthOf))*scale:undefined} style={{display:"block",width:widest*scale}}><span aria-hidden="true">{lines.map((line,index)=><span key={index} className="mc-card-text-line" style={{paddingLeft:(Math.floor(widest/2)-Math.floor(widths[index]/2))*scale}}>{/[^\x20-\x7e]/.test(line) ? <MinecraftUnicodeLabel text={line} atlas={confirmationUnihexAtlas}/> : <MinecraftText>{line}</MinecraftText>}</span>)}</span><span className="mc-dialog-accessible">{text}</span></span>
}
