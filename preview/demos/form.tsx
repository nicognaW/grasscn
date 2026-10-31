import * as React from "react"
import {useForm} from "react-hook-form"
import {Form,FormField} from "../../registry/ui/form"
import {FieldSet,FieldLegend,FieldGroup,Field,FieldContent,FieldLabel,FieldDescription,FieldError} from "../../registry/ui/field"
import {Input} from "../../registry/ui/input"
import {Textarea} from "../../registry/ui/textarea"
import {Button} from "../../registry/ui/button"
import type {DemoProps} from "../types"

import {MinecraftDisclosureText} from "../../registry/ui/minecraft-disclosure-text"
import {useDemoWidth} from "../use-demo-width"

type Settings = {name:string;world:string;notes:string}
export default function FormDemo({scale}:DemoProps){
 const stage=useDemoWidth(scale)
 const form=useForm<Settings>({defaultValues:{name:"",world:"My world",notes:""}})
 const [saved,setSaved]=React.useState<Settings|null>(null),[disabled,setDisabled]=React.useState(false)
 const id=React.useId()
 return <>
  <div className="demo-options"><Button scale={scale} type="button" style={{width:100*scale,maxWidth:"100%"}} onClick={()=>setDisabled(value=>!value)}>{disabled?"Enable fields":"Disable fields"}</Button></div>
  <div ref={stage.ref} className="demo-stage" data-stage="form" style={{alignItems:"stretch"}}>
   <div data-stage="field">
    <Form {...form}><form aria-label="Player and world settings" onSubmit={form.handleSubmit(values=>setSaved(values))} style={{display:"grid",gap:12*scale,minWidth:0,maxWidth:420*scale}}>
     <FieldSet disabled={disabled}>
      <FieldLegend scale={scale} maxWidth={Math.min(420,stage.width)}>Player and world settings</FieldLegend>
      <FieldGroup>
       <FormField control={form.control} name="name" rules={{required:"Enter your player name",minLength:{value:2,message:"Use at least two characters"}}} render={({field,fieldState})=><Field data-invalid={!!fieldState.error}>
        <FieldLabel scale={scale} htmlFor={`${id}-name`}>Player name</FieldLabel>
        <FieldContent><Input scale={scale} {...field} disabled={disabled} id={`${id}-name`} placeholder="Steve" aria-invalid={!!fieldState.error} aria-describedby={`${id}-name-hint${fieldState.error?` ${id}-name-error`:""}`} style={{width:"100%"}}/>
         <FieldDescription maxWidth={Math.min(420,stage.width)} scale={scale} id={`${id}-name-hint`}>CJK names are welcome.</FieldDescription><FieldError scale={scale} id={`${id}-name-error`}>{fieldState.error?.message?<MinecraftDisclosureText scale={scale} maxWidth={stage.width}>{fieldState.error.message}</MinecraftDisclosureText>:null}</FieldError>
        </FieldContent>
       </Field>}/>
       <FormField control={form.control} name="world" rules={{required:"Enter a world name"}} render={({field,fieldState})=><Field data-invalid={!!fieldState.error}>
        <FieldLabel scale={scale} htmlFor={`${id}-world`}>World name</FieldLabel>
        <FieldContent><Input scale={scale} {...field} disabled={disabled} id={`${id}-world`} aria-invalid={!!fieldState.error} aria-describedby={`${id}-world-hint${fieldState.error?` ${id}-world-error`:""}`} style={{width:"100%"}}/>
         <FieldDescription maxWidth={Math.min(420,stage.width)} scale={scale} id={`${id}-world-hint`}>Name your next adventure.</FieldDescription><FieldError scale={scale} id={`${id}-world-error`}>{fieldState.error?.message?<MinecraftDisclosureText scale={scale} maxWidth={stage.width}>{fieldState.error.message}</MinecraftDisclosureText>:null}</FieldError>
        </FieldContent>
       </Field>}/>
       <FormField control={form.control} name="notes" render={({field})=><Field>
        <FieldLabel scale={scale} htmlFor={`${id}-notes`}>Journey notes</FieldLabel>
        <FieldContent><Textarea scale={scale} {...field} disabled={disabled} id={`${id}-notes`} aria-describedby={`${id}-notes-hint`} placeholder="What will you build?" style={{width:"100%",height:48*scale}}/>
         <FieldDescription maxWidth={Math.min(420,stage.width)} scale={scale} id={`${id}-notes-hint`}>Keep a note for your next visit.</FieldDescription>
        </FieldContent>
       </Field>}/>
      </FieldGroup>
     </FieldSet>
     <div style={{display:"flex",flexWrap:"wrap",gap:8*scale}}><Button scale={scale} type="submit" disabled={disabled} style={{width:100*scale,maxWidth:"100%"}}>Save player</Button><Button scale={scale} type="button" style={{width:80*scale,maxWidth:"100%"}} onClick={()=>{form.reset();setSaved(null)}}>Reset</Button></div>
    </form></Form>
   </div>
  </div>
  <div className="demo-result" aria-live="polite"><span className="status-dot"/>{saved?<><output aria-label="Saved player">{saved.name}</output><output aria-label="Saved world">{saved.world}</output></>:<span>Save an empty form to try validation.</span>}</div>
 </>
}
