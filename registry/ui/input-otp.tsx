"use client"
import * as React from "react"
import {OTPInput,OTPInputContext} from "input-otp"
import {MinecraftProse} from "./minecraft-prose"
import {attachMinecraftOTPSlot} from "./minecraft-otp-paint"
import "./minecraft-input.css"
import "./minecraft-input-otp.css"
type Scale=1|2|3
const OTPStyle=React.createContext({scale:2 as Scale,disabled:false,readOnly:false})
function InputOTP({scale=2,className,containerClassName,spellCheck=false,autoCorrect="off",...props}:React.ComponentProps<typeof OTPInput>&{scale?:Scale}){return <OTPStyle.Provider value={{scale,disabled:!!props.disabled,readOnly:!!props.readOnly}}><OTPInput spellCheck={spellCheck} autoCorrect={autoCorrect} data-slot="input-otp" containerClassName={`mc-otp ${containerClassName??""}`} className={className} {...props}/></OTPStyle.Provider>}
function InputOTPGroup({className,...props}:React.ComponentProps<'div'>){return <div data-slot="input-otp-group" className={`mc-otp-group ${className??""}`} {...props}/>}
function InputOTPSlot({index,className,style,...props}:React.ComponentProps<'div'>&{index:number}){
 const {scale,disabled,readOnly}=React.useContext(OTPStyle),context=React.useContext(OTPInputContext),slot=context?.slots[index],node=React.useRef<HTMLInputElement>(null),active=React.useRef(false)
 active.current=!!slot?.isActive&&!!context?.isFocused
 React.useEffect(()=>node.current?attachMinecraftOTPSlot(node.current,scale,()=>active.current):undefined,[scale])
 React.useLayoutEffect(()=>{if(node.current){const pos=(slot?.char??"").length;node.current.setSelectionRange(pos,pos)}},[slot?.char,slot?.isActive])
 return <div data-slot="input-otp-slot" data-active={active.current} className={`mc-otp-slot ${className??""}`} style={{"--mc-scale":scale,...style} as React.CSSProperties} {...props}><input ref={node} className="mc-input" tabIndex={-1} maxLength={1} aria-hidden="true" value={slot?.char??""} placeholder={slot?.placeholderChar??""} disabled={disabled} readOnly={readOnly} onChange={()=>{}} spellCheck={false} autoCorrect="off"/></div>
}
function InputOTPSeparator({children="-",...props}:React.ComponentProps<'div'>){const {scale}=React.useContext(OTPStyle);return <div data-slot="input-otp-separator" role="separator" {...props}><MinecraftProse scale={scale}>{children}</MinecraftProse></div>}
export {InputOTP,InputOTPGroup,InputOTPSlot,InputOTPSeparator}
