import * as React from "react";
import { AdvancementTree } from "../../../../apps/web/registry/ui/advancement-tree";
import { Hotbar } from "../../../../apps/web/registry/ui/hotbar";
import { MinecraftMap } from "../../../../apps/web/registry/ui/map";
import { Book } from "../../../../apps/web/registry/ui/book";
import { Trading } from "../../../../apps/web/registry/ui/trading";
import { PlayerList } from "../../../../apps/web/registry/ui/player-list";

export function CustomApiFixture() {
  const tree = React.useRef<HTMLDivElement>(null), hotbar = React.useRef<HTMLDivElement>(null);
  const [event, setEvent] = React.useState(""), [cancel, setCancel] = React.useState(false);
  return <>
    <button onClick={() => tree.current?.focus()}>Focus tree by ref</button>
    <button onClick={() => hotbar.current?.querySelector("button")?.focus()}>Focus hotbar by ref</button>
    <button onClick={() => setCancel(value => !value)}>Toggle cancellation</button>
    <output id="custom-api-event">{event}</output>
    <AdvancementTree ref={tree} nodes={[{id:"root",title:"Root",x:0,y:0}]} defaultPan={{x:20,y:20}} onClickCapture={event => { if(cancel) event.preventDefault(); }} onSelectedIdChange={id=>setEvent(`tree:${id}`)} />
    <Hotbar ref={hotbar} onClickCapture={event => { if(cancel) event.preventDefault(); }} onWheelCapture={event=>{if(cancel)event.preventDefault();}} onValueChange={value=>setEvent(`slot:${value}`)} />
    <MinecraftMap pixels={new Uint8Array(16384)} onClick={event=>{if(cancel)event.preventDefault();}} onMapClick={point=>setEvent(`map:${point.x},${point.y}`)} />
    <Book pages={["First", "Second"]} turnSound={false} onClickCapture={event=>{if(cancel)event.preventDefault();}} onPageChange={page=>setEvent(`page:${page}`)} />
    <PlayerList players={[{id:"sample",name:"Sample player"}]} onClickCapture={event=>{if(cancel)event.preventDefault();}} onPlayerSelect={id=>setEvent(`player:${id}`)} />
    <Trading offers={[{id:"first",label:"First offer",cost:{label:"Cost",icon:null},result:{label:"Reward",icon:null}},{id:"second",label:"Second offer",cost:{label:"Cost",icon:null},result:{label:"Reward",icon:null}}]} onClickCapture={event=>{if(cancel)event.preventDefault();}} onSelectedIdChange={id=>setEvent(`trade:${id}`)} />
  </>;
}
