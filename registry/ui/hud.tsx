"use client"
import * as React from "react"
import {AdventureImage,type AdventureTexture} from "./minecraft-adventure-image"
import "./minecraft-hud.css"
type MeterProps=React.ComponentProps<"div">&{value:number;scale?:1|2|3;max?:number}
function IconMeter({value,max=20,scale=2,kind,condition="normal",className,style,...props}:MeterProps&{kind:"health"|"armor"|"hunger"|"air";condition?:"normal"|"poisoned"|"withered"|"frozen"|"absorbing"}){
 const limit=kind==='air'?10:20,count=Math.max(1,Math.min(10,Math.ceil(max/(kind==='air'?1:2)))),amount=Math.max(0,Math.min(max,limit,Number.isFinite(value)?value:0)),step=kind==='air'?1:2
 const prefix=kind==='health'?`gui/sprites/hud/heart/${condition==='normal'?'':condition+'_'}`:kind==='hunger'?'gui/sprites/hud/food_':kind==='armor'?'gui/sprites/hud/armor_':'gui/sprites/hud/air'
 return <div {...props} data-slot={`${kind}-meter`} role="meter" aria-label={props['aria-label']??kind} aria-valuemin={0} aria-valuemax={Math.min(max,limit)} aria-valuenow={amount} className={`mc-hud-meter ${className??''}`} style={{width:(count*8+1)*scale,height:9*scale,...style}}>{Array.from({length:kind==='armor'&&amount===0?0:count},(_,order)=>{const i=kind==='health'?count-1-order:order,filled=Math.max(0,Math.min(step,amount-i*step)),empty=kind==='health'?'gui/sprites/hud/heart/container':kind==='air'?'gui/sprites/hud/air_empty':prefix+'empty',fill=kind==='air'?'gui/sprites/hud/air':prefix+(filled>=step?'full':'half');return <span key={i} style={{left:(kind==='hunger'||kind==='air'?count-1-i:i)*8*scale,width:9*scale,height:9*scale}}>{!(kind==='air'&&(filled>0||(amount>0&&i===Math.ceil(amount))))&&<AdventureImage texture={empty as AdventureTexture} scale={scale}/>}{filled>0&&<AdventureImage texture={fill as AdventureTexture} scale={scale}/>}</span>})}</div>
}
function HealthMeter(props:MeterProps&{condition?:"normal"|"poisoned"|"withered"|"frozen"|"absorbing"}){return <IconMeter {...props} kind="health"/>}
function ArmorMeter(props:MeterProps){return <IconMeter {...props} kind="armor"/>}
function HungerMeter(props:MeterProps){return <IconMeter {...props} kind="hunger"/>}
function AirMeter(props:MeterProps){return <IconMeter max={10} {...props} kind="air"/>}
function ExperienceBar({value,scale=2,style,className,...props}:Omit<MeterProps,'max'>){const progress=Math.max(0,Math.min(1,Number.isFinite(value)?value:0)),width=Math.min(182,Math.floor(Math.fround(progress*183)));return <div {...props} data-slot="experience-bar" role="meter" aria-label={props['aria-label']??"Experience"} aria-valuemin={0} aria-valuemax={1} aria-valuenow={progress} className={`mc-xp-bar ${className??''}`} style={{width:182*scale,height:5*scale,...style}}><AdventureImage texture="gui/sprites/hud/experience_bar_background" scale={scale}/><span style={{width:width*scale}}><AdventureImage texture="gui/sprites/hud/experience_bar_progress" scale={scale}/></span></div>}
export {HealthMeter,ArmorMeter,HungerMeter,AirMeter,ExperienceBar}
export type {MeterProps}
