"use client"

import * as React from "react"
import { Card,CardTitle,CardDescription } from "./card"
import { MinecraftDisclosureText } from "./minecraft-disclosure-text"

const AlertScale=React.createContext<1|2|3>(2)
type AlertProps=React.ComponentProps<typeof Card>&{variant?:"default"}
function Alert({variant="default",scale=2,children,...props}:AlertProps){
 if(variant!=="default")throw new Error("Minecraft popup panels support the default alert visual variant only")
 return <Card data-slot="alert" role="alert" scale={scale} {...props}><AlertScale.Provider value={scale}>{children}</AlertScale.Provider></Card>
}
function AlertTitle({children,...props}:React.ComponentProps<"div">){
 const scale=React.useContext(AlertScale)
 return typeof children==="string"&&/[^\x00-\x7f]/.test(children)?<MinecraftDisclosureText data-slot="alert-title" scale={scale} {...props}>{children}</MinecraftDisclosureText>:<CardTitle data-slot="alert-title" {...props}>{children}</CardTitle>
}
function AlertDescription({children,...props}:React.ComponentProps<"div">){
 const scale=React.useContext(AlertScale)
 return typeof children==="string"&&/[^\x00-\x7f]/.test(children)?<MinecraftDisclosureText data-slot="alert-description" scale={scale} {...props}>{children}</MinecraftDisclosureText>:<CardDescription data-slot="alert-description" {...props}>{children}</CardDescription>
}
export {Alert,AlertTitle,AlertDescription}
export type {AlertProps}
