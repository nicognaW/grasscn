import * as React from "react"
import {Tabs,TabsList,TabsTrigger} from "../../../../apps/web/registry/ui/tabs"

export function TabsFallbackFixture(){
  const [changed,setChanged]=React.useState(false)
  const remove=new URLSearchParams(location.search).get("reason")==="missing"
  return <><Tabs defaultValue="second"><TabsList aria-label="Automatic selection"><TabsTrigger value="first">First</TabsTrigger>{!(remove&&changed)&&<TabsTrigger value="second" disabled={!remove&&changed}>Second</TabsTrigger>}</TabsList></Tabs><button onClick={()=>setChanged(true)}>Change tabs</button></>
}
