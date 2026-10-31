import * as React from "react"
import {useHighlightedCode} from "../registry/hooks/use-highlighted-code"

/** Shadcn's Shiki pipeline, shared with the registry Code Block demo. */
export function SyntaxCode({text,language="tsx"}:{text:string;language?:string}){
 const lines=useHighlightedCode(text,language)
 return <code className="site-syntax" data-language={language}>{lines.map((line,index)=><React.Fragment key={index}>{index>0?"\n":null}{line}</React.Fragment>)}{text.endsWith("\n")?"\n":null}</code>
}
