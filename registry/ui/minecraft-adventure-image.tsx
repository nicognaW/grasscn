"use client"
import * as React from "react"
import {adventureAssets} from "./minecraft-adventure-assets"
type AdventureTexture=keyof typeof adventureAssets
function AdventureImage({texture,scale=1,style,...props}:Omit<React.ComponentProps<"img">,"src">&{texture:AdventureTexture;scale?:number}){const asset=adventureAssets[texture];return <img alt="" draggable={false} {...props} src={asset.src} width={asset.width*scale} height={asset.height*scale} style={{imageRendering:"pixelated",pointerEvents:"none",...style}}/>}
export {AdventureImage}
export type {AdventureTexture}
