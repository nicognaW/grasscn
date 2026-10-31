import * as React from "react"
import {Field} from "@base-ui/react/field"
import {Button} from "../../registry/ui/button"
import {Checkbox} from "../../registry/ui/checkbox"
import {Input} from "../../registry/ui/input"
import {Dialog, DialogTrigger, DialogContent, DialogTitle} from "../../registry/ui/dialog"
import {ButtonGroupText} from "../../registry/ui/button-group"
import {SidebarProvider, SidebarGroupLabel, SidebarMenuSubButton} from "../../registry/ui/sidebar"

export function BaseUICompositionFixture() {
  const [disabled, setDisabled] = React.useState(false)
  const [subClicks, setSubClicks] = React.useState(0)
  return <>
    <button onClick={() => setDisabled(value => !value)}>Toggle disabled</button>
    <Button disabled={disabled} className={state => state.disabled ? "state-disabled" : "state-enabled"} style={state => ({width: state.disabled ? 300 : 240})}>Stateful button</Button>
    <Checkbox aria-label="Stateful checkbox" className={state => state.checked ? "state-checked" : "state-unchecked"} style={state => ({"--checked-state": state.checked ? 1 : 0} as React.CSSProperties)}/>
    <Field.Root disabled={disabled}><Field.Label>Inherited field</Field.Label><Input aria-label="Inherited field" defaultValue="Hello 世界"/></Field.Root>
    <ButtonGroupText render={<a href="#group"/>}>Composed group text</ButtonGroupText>
    <SidebarProvider><SidebarGroupLabel render={<a href="#sidebar"/>}>Composed sidebar label</SidebarGroupLabel><SidebarMenuSubButton render={<a/>} href="#composed-sub" onClick={event=>{event.preventDefault();setSubClicks(value=>value+1)}}>Composed submenu</SidebarMenuSubButton><output aria-label="Submenu actions">{subClicks}</output></SidebarProvider>
    <Dialog><DialogTrigger>Open stateful dialog</DialogTrigger><DialogContent className={state => state.open ? "state-open" : "state-closed"} style={state => ({"--open-state": state.open ? 1 : 0} as React.CSSProperties)}><DialogTitle>Native state</DialogTitle></DialogContent></Dialog>
  </>
}
