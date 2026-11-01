import { FormExample } from "../../registry/blocks/form"
import type { DemoProps } from "../types"
export default function FormDemo({scale}: DemoProps) {
  return <div className="demo-stage" data-stage="form"><div data-stage="field" style={{minWidth:0,width:"100%"}}><FormExample scale={scale}/></div></div>
}
