import * as React from "react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../../registry/ui/dialog"
import { Button } from "../../registry/ui/button"
import { Input } from "../../registry/ui/input"
import { Textarea } from "../../registry/ui/textarea"
import type { DemoProps } from "../types"

export default function DialogDemo({scale}:DemoProps) {
  const [title,setTitle]=React.useState("World settings"),[message,setMessage]=React.useState("A helpful description."),[saved,setSaved]=React.useState(0)
  const [open,setOpen]=React.useState(false)
  return <>
    <div className="demo-options"><label className="demo-option">Title<Input aria-label="Dialog title" value={title} onChange={e=>setTitle(e.target.value)} style={{width:240}}/></label><label className="demo-option">Message<Textarea aria-label="Dialog message" value={message} onChange={e=>setMessage(e.target.value)} style={{width:320,height:100}}/></label></div>
    <div className="demo-stage" data-stage="dialog"><Dialog scale={scale} open={open} onOpenChange={setOpen}><DialogTrigger>Open world settings</DialogTrigger><DialogContent><DialogHeader><DialogTitle>{title || " "}</DialogTitle><DialogDescription>{message}</DialogDescription></DialogHeader><DialogFooter><DialogClose>Cancel</DialogClose><Button scale={scale} onClick={()=>{setSaved(n=>n+1);setOpen(false)}}>Continue</Button></DialogFooter></DialogContent></Dialog></div>
    <div className="demo-result"><span className="status-dot"/><output aria-label="Dialog confirmations">{`Confirmed ${saved} ${saved===1 ? "time" : "times"}`}</output><span>Edit your details, then save</span></div>
  </>
}
