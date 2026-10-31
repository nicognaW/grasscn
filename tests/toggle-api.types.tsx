import * as React from "react"
import {Toggle,toggleVariants} from "../registry/ui/toggle"
import {ToggleGroup,ToggleGroupItem} from "../registry/ui/toggle-group"
const itemRef=React.createRef<HTMLButtonElement>(),groupRef=React.createRef<HTMLDivElement>()
const toggle=<Toggle ref={itemRef} scale={3} pressed onPressedChange={value=>value satisfies boolean} asChild><button>Crafting 世界</button></Toggle>
const single=<ToggleGroup ref={groupRef} type="single" value="a" onValueChange={value=>value satisfies string} dir="rtl" orientation="vertical"><ToggleGroupItem ref={itemRef} value="a" aria-label="Crafting"/></ToggleGroup>
const multiple=<ToggleGroup type="multiple" defaultValue={["a"]} onValueChange={value=>value satisfies string[]} spacing={4}><ToggleGroupItem value="a"/></ToggleGroup>
// @ts-expect-error The original recipe filter has no outline variant.
const outline=<Toggle variant="outline"/>
// @ts-expect-error The original recipe filter has no small visual size.
const small=<ToggleGroup type="single" size="sm"/>
toggleVariants({variant:"default",size:"default",className:"custom"})
void [toggle,single,multiple,outline,small]
