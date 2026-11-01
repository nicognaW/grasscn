import * as React from "react"
import {Sheet,SheetTrigger,SheetContent,SheetHeader,SheetTitle,SheetDescription,SheetFooter,SheetClose} from "../registry/ui/sheet"
import {Input} from "../registry/ui/input"
import {Textarea} from "../registry/ui/textarea"
import type {DemoProps} from "../types"
export default function SheetDemo({scale}:DemoProps){
 const [title,setTitle]=React.useState("World settings"),[message,setMessage]=React.useState("Hello Minecraft\n你好，世界")
 return <><div className="demo-options"><label className="demo-option">Title<Input aria-label="Sheet title" value={title} onChange={e=>setTitle(e.target.value)} style={{width:280}}/></label><label className="demo-option">Message<Textarea aria-label="Sheet message" value={message} onChange={e=>setMessage(e.target.value)} style={{width:320,height:100}}/></label></div><div className="demo-stage" data-stage="sheet"><Sheet scale={scale}><SheetTrigger>Open sheet</SheetTrigger><SheetContent side="right" showCloseButton={false}><SheetHeader><SheetTitle>{title}</SheetTitle><SheetDescription>{message}</SheetDescription></SheetHeader><SheetFooter><SheetClose>Done</SheetClose></SheetFooter></SheetContent></Sheet></div></>
}
