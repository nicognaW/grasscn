import {TabsFallbackFixture} from "./tabs-fallback";
import {BaseUICompositionFixture} from "./base-ui-composition";
import { DirectionProvider as BaseDirectionProvider } from "@base-ui/react/direction-provider";
import { CollapsibleFirstFrameFixture } from "./collapsible-first-frame";
import { BadgeAdvancementFixture } from "./badge-advancement";
import { QuestionnaireFixture } from "./questionnaire";
import { DialogFooterFixture } from "./dialog-footer";
import { AlertDialogMediaFixture } from "./alert-dialog-media";
import { ComboboxFixture } from "./combobox";
import { AttachmentFixture } from "./attachment";
import { ColorPainterStressFixture } from "./color-painter-stress";
import { MarkerFixture } from "./marker";
import { ChartFixture } from "./chart";
import { NativeSelectFixture } from "./native-select";
import { TextWidgetsFixture } from "./text-widgets";
import { CodeBlockFixture } from "./code-block";
import { NativeTextCompositionsFixture } from "./native-text-compositions";
import { InputOTPFixture } from "./input-otp";
import { CarouselFixture } from "./carousel";
import { FormsFixture } from "./forms";
import { DataTableFixture } from "./data-table";
import { InputGroupFixture } from "./input-group";
import { CommandFixture } from "./command";
import { CalendarFixture } from "./calendar";
import { ChatFamilyFixture } from "./chat-family";
import { ResizableFixture } from "./resizable";
import { SidebarFixture } from "./sidebar";
import { TableFixture } from "./table";
import { ItemFixture } from "./item";
import { AvatarFixture } from "./avatar";
import { ToastFixture } from "./toast";
import { ButtonCompositionFixture } from "./button-composition";
import { TextComponentsFixture } from "./text-components";
import { OverlayFixture } from "./overlay";
import { StructuralFixture } from "./structural";
import { ToggleGroupFixture } from "./toggle-group";
import { ToggleFixture } from "./toggle";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../registry/ui/collapsible";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../../registry/ui/accordion";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuLink, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuPositioner, navigationMenuTriggerStyle } from "../../registry/ui/navigation-menu";
import { minecraftTabsAssets as navigationAssets } from "../../registry/ui/minecraft-tabs-assets";
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarGroup, MenubarLabel, MenubarItem, MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubTrigger, MenubarPortal, MenubarSubContent } from "../../registry/ui/menubar";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuGroup, ContextMenuLabel, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubTrigger, ContextMenuPortal, ContextMenuSubContent } from "../../registry/ui/context-menu";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "../../registry/ui/hover-card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "../../registry/ui/dropdown-menu";
import { Button, buttonVariants } from "../../registry/ui/button";
import { Checkbox } from "../../registry/ui/checkbox";
import { Slider } from "../../registry/ui/slider";
import { Input } from "../../registry/ui/input";
import { Textarea } from "../../registry/ui/textarea";
import { Label } from "../../registry/ui/label";
import { Separator } from "../../registry/ui/separator";
import { ScrollArea, ScrollBar } from "../../registry/ui/scroll-area";
import { Progress, type BossBarColor, type BossBarOverlay } from "../../registry/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../registry/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "../../registry/ui/card";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "../../registry/ui/tooltip";
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator } from "../../registry/ui/select";
import { RadioGroup, RadioGroupItem } from "../../registry/ui/radio-group";
import { Switch } from "../../registry/ui/switch";
import { Dialog, DialogTrigger, DialogPortal, DialogOverlay, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from "../../registry/ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "../../registry/ui/alert-dialog";
import { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription, PopoverClose } from "../../registry/ui/popover";
import "./style.css";
const params = new URLSearchParams(location.search);
const scale = Number(params.get("scale") || 2) as 1 | 2 | 3;
const width = Number(params.get("width") || 200);
const state = params.get("state") || "normal";
const label = params.get("label") || "Button";
function SelectFixture() {
    const titles: string[] = params.has("labels") ? JSON.parse(params.get("labels")!) : ["Survival", "Creative", "Adventure"];
    const initial = Number(params.get("selectedIndex") ?? 0);
    const [value, setValue] = React.useState(initial >= 0 ? `item-${initial}` : "");
    const [changes, setChanges] = React.useState(0);
    const triggerRef = React.useRef<HTMLButtonElement>(null), contentRef = React.useRef<HTMLDivElement>(null), itemRef = React.useRef<HTMLDivElement>(null);
    const [refs, setRefs] = React.useState("");
    const [submittedValue, setSubmittedValue] = React.useState("");
    const single = params.get("component") === "select-trigger", capture = params.get("component") === "select-list";
    const content = titles.map((title, index) => <SelectItem render={params.has("itemAsChild") && index === 0 ? <section /> : undefined} key={index} value={`item-${index}`} ref={index === 0 ? itemRef : undefined} disabled={params.has("disabledIndex") && Number(params.get("disabledIndex")) === index} onPointerMove={capture ? event => event.preventDefault() : undefined}>{title}</SelectItem>);
    const controls = <>
    <Select items={titles.map((label, index) => ({ label, value: `item-${index}` }))} name={params.has("form") ? "mode" : undefined} required={params.has("required")} scale={scale} onOpenChange={(next, details) => {if ((next && params.has("cancelOpen")) || (!next && params.has("cancelClose"))) details.cancel();}} defaultOpen={capture || params.has("open")} value={params.has("controlled") ? value : undefined} defaultValue={initial >= 0 ? `item-${initial}` : ""} onValueChange={next => {
            if (!params.has("reject"))
                setValue(next ?? "");
            setChanges(current => current + 1);
        }} disabled={params.has("disabled") || single && state.startsWith("disabled")}>
      <SelectTrigger render={params.has("triggerAsChild") ? <button /> : undefined} id={single ? "subject" : "select-trigger"} aria-label="Game mode" ref={triggerRef} style={{ width: width * scale }} data-subject={(single ? "subject" : "select-trigger") === "subject" ? "true" : undefined}>{<SelectValue placeholder={params.get("placeholder") ?? "Choose game mode"}>{single ? params.get("label") ?? "Survival" : undefined}</SelectValue>}</SelectTrigger>
      {!single && <SelectContent render={params.has("contentAsChild") ? <section /> : undefined} id={capture ? "subject" : "select-popup"} ref={contentRef} alignItemWithTrigger={(capture || params.has("popper") ? "popper" : "item-aligned") === "item-aligned"} collisionAvoidance={capture ? { side: "none", align: "none" } : undefined} style={capture ? { width: width * scale, height: Number(params.get("height")) * scale } : undefined} data-subject={(capture ? "subject" : "select-popup") === "subject" ? "true" : undefined}>{params.has("contentAsChild") ? content : params.has("group") ? <SelectGroup><SelectLabel>Game modes</SelectLabel>{content}<SelectSeparator /></SelectGroup> : content}</SelectContent>}
    </Select>
    <button id="select-external" onClick={() => setValue(`item-${titles.length - 1}`)}>Select externally</button>
    <button id="read-select-refs" onClick={() => setRefs(`${triggerRef.current?.tagName}/${contentRef.current?.tagName}/${itemRef.current?.tagName}`)}>Read refs</button>
    <output aria-label="Selected game mode">{value}</output><output aria-label="Select changes">{changes}</output><output aria-label="Select refs">{refs}</output>
  </>;
    return params.has("form") ? <form onSubmit={event => { event.preventDefault(); setSubmittedValue(String(new FormData(event.currentTarget).get("mode") ?? "missing")); }}>{controls}<button type="submit">Save mode</button><output aria-label="Submitted mode">{submittedValue}</output></form> : controls;
}
function RadioFixture() {
    const single = params.get("component") === "radio-group-item";
    const initial = single ? params.get("checked") === "true" ? "subject" : "other" : params.has("none") ? "" : params.get("value") ?? "survival";
    const [value, setValue] = React.useState(initial), [changes, setChanges] = React.useState(0), [events, setEvents] = React.useState(0), [result, setResult] = React.useState("");
    const rootRef = React.useRef<HTMLDivElement>(null), itemRef = React.useRef<HTMLButtonElement>(null);
    const [refs, setRefs] = React.useState("");
    const names = single ? ["subject"] : ["survival", "creative", "adventure", "spectator"];
    const items = names.map((name, index) => <div key={name} style={{ display: "flex", alignItems: "center", gap: 4 * scale }}><RadioGroupItem render={params.has("itemAsChild") ? params.has("anchor") ? <a href="#radio"/> : <button /> : undefined} id={single ? "subject" : `radio-${name}`} ref={index === 0 ? itemRef : undefined} value={name} aria-label={name} disabled={single ? state === "disabled" : index === Number(params.get("disabledIndex") ?? -1)} onClick={event => {
            setEvents(current => current + 1);
            if (params.has("prevent")) {event.preventDefault();event.preventBaseUIHandler();}
        }} data-subject={(single ? "subject" : `radio-${name}`) === "subject" ? "true" : undefined}>{undefined}</RadioGroupItem>{!single && <Label scale={scale} htmlFor={`radio-${name}`}>{name[0].toUpperCase() + name.slice(1)}</Label>}</div>);
    const group = <RadioGroup render={params.has("rootAsChild") ? <fieldset /> : undefined} ref={rootRef} aria-label="Game modes" scale={scale} disabled={params.has("rootDisabled")} defaultValue={initial} value={params.has("controlled") ? value : undefined} onValueChange={next => {
            if (!params.has("reject"))
                setValue(next ?? "");
            setChanges(current => current + 1);
        }} name={params.has("form") ? "mode" : undefined} required={params.has("required")} dir={params.get("dir") === "rtl" ? "rtl" : "ltr"}>{items}</RadioGroup>;
    return <><form onSubmit={event => { event.preventDefault(); setResult(String(new FormData(event.currentTarget).get("mode") ?? "missing")); }}>{group}{params.has("form") && <button type="submit">Save mode</button>}</form><button id="radio-external" onClick={() => setValue("adventure")}>Choose externally</button><button id="radio-read-refs" onClick={() => setRefs(`${rootRef.current?.tagName}/${itemRef.current?.tagName}`)}>Read refs</button><output aria-label="Radio value">{value}</output><output aria-label="Radio changes">{changes}</output><output aria-label="Radio events">{events}</output><output aria-label="Radio refs">{refs}</output><output aria-label="Submitted radio">{result}</output></>;
}
function SwitchFixture() {
    const [checked, setChecked] = React.useState(params.get("checked") === "true"), [changes, setChanges] = React.useState(0), [events, setEvents] = React.useState(0), [result, setResult] = React.useState("");
    const ref = React.useRef<HTMLButtonElement>(null), [tag, setTag] = React.useState("");
    const control = <Switch render={params.has("asChild") ? params.has("anchor") ? <a href="#switch"/> : <button /> : undefined} id="subject" ref={ref} scale={scale} size={(params.get("size") ?? undefined) as "default" | undefined} checked={params.has("controlled") ? checked : undefined} defaultChecked={params.get("checked") === "true"} disabled={state === "disabled"} onCheckedChange={next => {
            if (!params.has("reject"))
                setChecked(next);
            setChanges(current => current + 1);
        }} name={params.has("form") ? "mode" : undefined} value={params.get("formValue") ?? "enabled"} required={params.has("required")} aria-label={params.has("labelled") ? undefined : "Test switch"} style={params.has("width") ? { width: width * scale } : undefined} onClick={event => {
            setEvents(current => current + 1);
            if (params.has("prevent")) {event.preventDefault();event.preventBaseUIHandler();}
        }} data-subject="true">{undefined}</Switch>;
    return <><form onSubmit={event => { event.preventDefault(); setResult(String(new FormData(event.currentTarget).get("mode") ?? "missing")); }}>{params.has("labelled") && <Label scale={scale} htmlFor="subject">Switch setting</Label>}{control}{params.has("form") && <button type="submit">Save switch</button>}</form><button id="switch-external" onClick={() => setChecked(current => !current)}>Change externally</button><button id="switch-read-ref" onClick={() => setTag(ref.current?.tagName ?? "missing")}>Read ref</button><output aria-label="Switch value">{String(checked)}</output><output aria-label="Switch changes">{changes}</output><output aria-label="Switch events">{events}</output><output aria-label="Switch ref">{tag}</output><output aria-label="Submitted switch">{result}</output></>;
}
function ContextFixture() {
 const native=params.has("native"),triggerPixels=params.has("triggerPixels"),[open,setOpen]=React.useState(params.has("open")),[menuValue,setMenuValue]=React.useState(params.has("open")?"game":""),[actions,setActions]=React.useState(0),[checked,setChecked]=React.useState(false),[radio,setRadio]=React.useState("world"),[tags,setTags]=React.useState("");
 const content=React.useRef<HTMLDivElement>(null),trigger=React.useRef<HTMLDivElement>(null),rootRef=React.useRef<HTMLDivElement>(null);
 const labels:string[]=JSON.parse(params.get("labels")??'["Game","World","More >"]'),part=params.get("part"),nativeLabel=params.get("label")??"World Settings",nativeDisabled=(params.get("state")??"").startsWith("disabled"),nativeChecked=params.get("checked")==="true";
 const choose=(event:{preventDefault():void;preventBaseUIHandler?():void})=>{setActions(n=>n+1);if(params.has("preventAction")){event.preventDefault();event.preventBaseUIHandler?.();}};
 const nativeBody=part==="menu-checkbox"?<ContextMenuCheckboxItem checked={nativeChecked} disabled={nativeDisabled}>{nativeLabel}</ContextMenuCheckboxItem>:part==="menu-radio"?<ContextMenuRadioGroup value={nativeChecked?"on":"off"}><ContextMenuRadioItem value="on" disabled={nativeDisabled}>{nativeLabel}</ContextMenuRadioItem></ContextMenuRadioGroup>:part==="menu-label"||part==="menu-label-inset"?<ContextMenuGroup><ContextMenuLabel inset={part==="menu-label-inset"}>{nativeLabel}</ContextMenuLabel></ContextMenuGroup>:part==="menu-separator"?<ContextMenuSeparator/>:part==="menu-sub-trigger"?<ContextMenuSub><ContextMenuSubTrigger>{nativeLabel}</ContextMenuSubTrigger></ContextMenuSub>:part==="menu-disabled"?<ContextMenuItem disabled>{nativeLabel}</ContextMenuItem>:labels.map((label,index)=><ContextMenuItem key={index} data-native-index={index}>{label}</ContextMenuItem>);
 const handleOpen=(next:boolean,details:{reason:string;cancel():void})=>{if(params.has("reject")||params.has("disabled")||(!next&&((details.reason==="escape-key"&&params.has("preventEscape"))||((details.reason==="outside-press"||details.reason==="focus-out"||details.reason==="cancel-open")&&params.has("preventOutside"))))){details.cancel();return;}setOpen(next);setMenuValue(next?"game":"");};
 const rows=<><ContextMenuGroup><ContextMenuLabel>World Settings</ContextMenuLabel><ContextMenuItem onClick={choose}>Resume game<ContextMenuShortcut>Esc</ContextMenuShortcut></ContextMenuItem><ContextMenuItem disabled onClick={choose}>Unavailable</ContextMenuItem><ContextMenuItem onClick={choose}>你好，世界</ContextMenuItem></ContextMenuGroup><ContextMenuSeparator/><ContextMenuCheckboxItem checked={checked} disabled={params.has("disabledCheck")} onCheckedChange={setChecked} closeOnClick={false}>Show coordinates</ContextMenuCheckboxItem><ContextMenuRadioGroup value={radio} onValueChange={setRadio}><ContextMenuRadioItem value="world" closeOnClick={false}>World</ContextMenuRadioItem><ContextMenuRadioItem value="game" closeOnClick={false}>Game</ContextMenuRadioItem></ContextMenuRadioGroup><ContextMenuSub><ContextMenuSubTrigger>More</ContextMenuSubTrigger><ContextMenuPortal><ContextMenuSubContent side="right"><ContextMenuItem onClick={choose}>Video settings</ContextMenuItem><ContextMenuItem onClick={choose}>Audio settings</ContextMenuItem></ContextMenuSubContent></ContextMenuPortal></ContextMenuSub></>;
 const popup=<ContextMenuContent render={params.has("contentAsChild")?<section/>:undefined} id="subject" data-subject="true" ref={content} side={(params.get("side")??"right") as "top"|"right"|"bottom"|"left"} align={(params.get("align")??"start") as "start"|"center"|"end"} sideOffset={native?0:4} surface={params.get("surface")==="suggestions"?"suggestions":"popup"} style={native?{width:Number(params.get("width"))*scale,height:Number(params.get("height"))*scale}:params.has("maxHeight")?{maxHeight:Number(params.get("maxHeight"))}:undefined}>{params.has("contentAsChild")?<ContextMenuItem render={<a href="#menu-composed"/>} onClick={choose}>Composed action</ContextMenuItem>:native?nativeBody:rows}</ContextMenuContent>;
return <><ContextMenu scale={scale} open={params.has("controlled")?open:undefined} onOpenChange={handleOpen}><ContextMenuTrigger render={params.has("triggerAsChild")?<button/>:undefined} id="context-hit" ref={trigger} style={native?{position:"fixed",inset:0}:{display:"block",width:400,height:200,border:"2px solid #aaa"}} onContextMenu={params.has("preventTrigger")?event=>{event.preventDefault();event.preventBaseUIHandler();}:undefined}>Right click here</ContextMenuTrigger>{popup}</ContextMenu><button id="context-outside" style={{position:"fixed",right:8,bottom:8}} onClick={()=>setTags([trigger.current?.tagName,content.current?.tagName].join(","))}>Inspect menu refs</button><output aria-label="Menu actions">{actions}</output><output aria-label="Menu checked">{String(checked)}</output><output aria-label="Menu radio">{radio}</output><output aria-label="Menu refs">{tags}</output></>;
}
function CollapsibleFixture() {
    const native = params.has("native"), body = params.get("part") === "body", [open, setOpen] = React.useState(params.has("open")), [changes, setChanges] = React.useState(0), [refs, setRefs] = React.useState("");
    const root = React.useRef<HTMLDivElement>(null), trigger = React.useRef<HTMLButtonElement>(null), content = React.useRef<HTMLDivElement>(null);
    const child = <><CollapsibleTrigger render={params.has("asChild") ? <button /> : undefined} ref={trigger} {...(native && !body ? { id: "subject", "data-subject": "true" } : {})} {...(native && !body && params.get("state") === "disabled" ? { disabled: true } : {})} style={native && body ? { position: "fixed", left: -10000 } : undefined} onClick={params.has("prevent") ? event => { event.preventDefault(); event.preventBaseUIHandler(); } : undefined}>{params.has("asChild") ? "World details" : native ? params.get("label") ?? "Button" : "World details"}</CollapsibleTrigger><CollapsibleContent render={params.has("contentAsChild") ? <section /> : undefined} ref={content} {...(native && body ? { id: "subject", "data-subject": "true" } : {})} wrap={!native} align={params.get("align") === "center" ? "center" : "left"} maxWidth={params.has("wrapWidth") ? Number(params.get("wrapWidth")) : undefined} keepMounted={params.has("forceMount") ? true : undefined} style={native && body ? { position: "fixed", left: Number(params.get("x") ?? 16) * scale, top: Number(params.get("y") ?? 16) * scale, width: Number(params.get("width")) * scale, height: Number(params.get("height")) * scale, padding: 0 } : undefined}>{params.has("contentAsChild") ? <button onClick={() => setChanges(n => n + 1)}>Inside action</button> : native ? params.get("text") ?? "" : params.has("rich") ? <form onSubmit={event => { event.preventDefault(); setChanges(n => n + 1); }}><input aria-label="World name" spellCheck={false} autoCorrect="off" defaultValue="Minecraft"/><Button type="submit">Save world</Button></form> : "\u4F60\u597D\uFF0C\u4E16\u754C\nHello Minecraft"}</CollapsibleContent></>;
    return <><Collapsible render={params.has("rootAsChild") ? <article /> : undefined} ref={root} scale={scale} open={native ? body || params.has("expanded") : params.has("controlled") ? open : undefined} defaultOpen={params.has("open")} disabled={params.has("disabled")} onOpenChange={next => {
            setChanges(n => n + 1);
            if (!params.has("reject"))
                setOpen(next);
        }} style={native ? { position: "fixed", left: Number(params.get("x") ?? 16) * scale, top: Number(params.get("y") ?? 16) * scale, width: Number(params.get("width") ?? 200) * scale } : undefined}>{child}</Collapsible><button id="collapsible-refs" style={{ position: "fixed", right: 8, bottom: 8 }} onClick={() => setRefs([root.current?.tagName, trigger.current?.tagName, content.current?.tagName].join(","))}>Read collapsible refs</button><button id="collapsible-external" onClick={() => setOpen(value => !value)}>Change externally</button><output aria-label="Collapsible changes">{changes}</output><output aria-label="Collapsible refs">{refs}</output><output aria-label="Collapsible value">{String(open)}</output></>;
}
function AccordionFixture() {
    const native = params.has("native"), part = params.get("part"), multiple = params.has("multiple"), [single, setSingle] = React.useState(params.has("open") ? "game" : ""), [many, setMany] = React.useState<string[]>(params.has("open") ? ["game"] : []), [changes, setChanges] = React.useState(0), [refs, setRefs] = React.useState("");
    const root = React.useRef<HTMLDivElement>(null), item = React.useRef<HTMLDivElement>(null), trigger = React.useRef<HTMLButtonElement>(null), content = React.useRef<HTMLDivElement>(null);
    const initial = native ? part === "body" || params.has("expanded") ? "game" : "" : params.has("open") ? "game" : "";
    const controlled = params.has("controlled") || native;
    const shared = { ref: root, scale, orientation: params.has("horizontal") ? "horizontal" as const : "vertical" as const, dir: params.has("rtl") ? "rtl" as const : "ltr" as const, disabled: params.has("rootDisabled"), style: native ? { position: "fixed" as const, left: Number(params.get("x") ?? 16) * scale, top: Number(params.get("y") ?? 16) * scale, width: Number(params.get("width") ?? 200) * scale } : undefined };
    const children = <><AccordionItem ref={item} value="game" disabled={params.has("disabled")}><AccordionTrigger render={params.has("asChild") ? <button /> : undefined} style={native && part === "body" ? { position: "fixed", left: -10000 } : undefined} {...(native && part !== "body" ? { id: "subject", "data-subject": "true" } : {})} ref={trigger} {...(native && part !== "body" && params.get("state") === "disabled" ? { disabled: true } : {})} onClick={params.has("prevent") ? event => { event.preventDefault(); event.preventBaseUIHandler(); } : undefined}>{params.has("asChild") ? "Game settings" : native ? params.get("label") ?? "Button" : "Game settings"}</AccordionTrigger><AccordionContent render={params.has("contentAsChild") ? <section /> : undefined} {...(native && part === "body" ? { id: "subject", "data-subject": "true" } : {})} ref={content} wrap={!native} align={params.get("align") === "center" ? "center" : "left"} maxWidth={params.has("wrapWidth") ? Number(params.get("wrapWidth")) : undefined} keepMounted={params.has("forceMount") ? true : undefined} style={native && part === "body" ? { position: "fixed", left: Number(params.get("x") ?? 16) * scale, top: Number(params.get("y") ?? 16) * scale, width: Number(params.get("width")) * scale, height: Number(params.get("height")) * scale, padding: 0 } : undefined}>{params.has("contentAsChild") ? <button onClick={() => setChanges(n => n + 1)}>Inside action</button> : native ? params.get("text") ?? "" : "Hello Minecraft"}</AccordionContent></AccordionItem>{!native && <><AccordionItem value="world"><AccordionTrigger>World settings</AccordionTrigger><AccordionContent>你好，世界</AccordionContent></AccordionItem><AccordionItem value="unavailable" disabled><AccordionTrigger>Unavailable</AccordionTrigger><AccordionContent>Unavailable</AccordionContent></AccordionItem></>}
 </>;
    return <>{multiple ? <Accordion {...shared} value={controlled ? many : undefined} defaultValue={params.has("open") ? ["game"] : undefined} onValueChange={__values => {
                const next = __values;
                setChanges(n => n + 1);
                if (!params.has("reject"))
                    setMany(next);
            }} multiple={true}>{children}</Accordion> : <Accordion {...shared} value={native ? (initial ? [initial] : []) : controlled ? (single ? [single] : []) : undefined} defaultValue={params.has("open") ? ["game"] : undefined} onValueChange={(__values, details) => {
                if (params.has("locked") && __values.length === 0) {
                    details.cancel();
                    return;
                }
                const next = __values[0] ?? "";
                setChanges(n => n + 1);
                if (!params.has("reject"))
                    setSingle(next);
            }} multiple={false}>{children}</Accordion>}<button id="accordion-refs" style={{ position: "fixed", right: 8, bottom: 8 }} onClick={() => setRefs([root.current?.tagName, item.current?.tagName, trigger.current?.tagName, content.current?.tagName].join(","))}>Read accordion refs</button><output aria-label="Accordion changes">{changes}</output><output aria-label="Accordion refs">{refs}</output></>;
}
function NavigationFixture() {
    const native = params.has("native"), part = params.get("part"), links = params.has("links"), width = Number(params.get("width") ?? 400), height = Number(params.get("height") ?? 24), state = params.get("state") ?? "normal", selected = Number(params.get("selectedIndex") ?? 0), disabled = Number(params.get("disabledIndex") ?? -1);
    const labels: string[] = JSON.parse(params.get("labels") ?? '["Game","World","More"]'), single = part === "tabs-trigger";
    const value = single ? params.get("selected") === "true" ? "0" : "" : String(selected);
    const [current, setCurrent] = React.useState<string | null>(params.has("open") ? "0" : null), [actions, setActions] = React.useState(0), [refs, setRefs] = React.useState("");
    const rootRef = React.useRef<HTMLElement>(null), listRef = React.useRef<HTMLUListElement>(null), triggerRef = React.useRef<HTMLButtonElement>(null), contentRef = React.useRef<HTMLDivElement>(null), viewportRef = React.useRef<HTMLDivElement>(null), indicatorRef = React.useRef<HTMLDivElement>(null);
    const control = (label: string, index: number) => links ? <NavigationMenuLink active={single ? params.get("selected") === "true" : index === selected} aria-disabled={index === disabled || single && state.startsWith("disabled") ? true : undefined} href="#navigation-target" id={single ? "subject" : undefined} style={single ? { width: width * scale } : undefined} data-subject={(single ? "subject" : undefined) === "subject" ? "true" : undefined}>{label}</NavigationMenuLink> : <NavigationMenuTrigger render={params.has("triggerAsChild") ? <button /> : undefined} ref={index === 0 ? triggerRef : undefined} disabled={index === disabled || single && state.startsWith("disabled")} id={single ? "subject" : undefined} style={single ? { width: width * scale } : undefined} data-subject={(single ? "subject" : undefined) === "subject" ? "true" : undefined}>{label}</NavigationMenuTrigger>;
    const select = (event: {
        preventDefault(): void;
        preventBaseUIHandler?(): void;
    }) => {
        setActions(n => n + 1);
        if (params.has("preventSelect")) {
            event.preventDefault(); event.preventBaseUIHandler?.(); }
    };
    if (params.has("panel")) {
        const labels: string[] = JSON.parse(params.get("labels") ?? "[]"), mode = params.get("mode") ?? "card", panelSurface = params.get("surface") === "suggestions" ? "suggestions" : "popup", rows = mode === "rows";
        return <NavigationMenu scale={scale} value="panel" style={{ position: "fixed", left: (Number(params.get("x") ?? 16) - 14) * scale, top: (Number(params.get("y") ?? 16) - 24) * scale, width: width * scale }}>
   <NavigationMenuList><NavigationMenuItem value="panel"><NavigationMenuTrigger>World</NavigationMenuTrigger><NavigationMenuContent id="subject" surface={panelSurface} style={{ width: width * scale, height: height * scale, padding: rows ? panelSurface === "popup" ? 6 * scale : undefined : mode === "card" ? 0 : undefined, "--mc-navigation-gap": rows ? "0px" : undefined, "--mc-menu-padding": rows && panelSurface === "popup" ? 6 : undefined } as React.CSSProperties} data-subject="true">
    {rows ? labels.map((label, index) => <NavigationMenuLink key={index} href={`#row-${index}`}>{label}</NavigationMenuLink>) : mode === "text" ? <><div className="mc-card-header"><h2 className="mc-card-title">{params.get("label") ?? "World Settings"}</h2><p className="mc-card-description">{params.get("text") ?? ""}</p></div><div style={{ display: "flex", gap: 6 * scale }}><Button scale={scale} style={{ width: "100%" }}>Done</Button></div></> : null}
   </NavigationMenuContent></NavigationMenuItem></NavigationMenuList>
  </NavigationMenu>;
    }
    return <><NavigationMenu ref={rootRef} scale={scale} value={native ? links ? "" : value : params.has("controlled") ? current : undefined} defaultValue={params.has("open") ? "0" : undefined} onValueChange={(next, details) => {
            if ((params.has("manual") && details.reason === "trigger-hover") || (params.has("preventEscape") && details.reason === "escape-key") || (params.has("preventOutside") && (details.reason === "outside-press" || details.reason === "focus-out"))) { details.cancel(); return; }
            if (!params.has("reject"))
                setCurrent(next == null ? null : String(next));
        }} delay={Number(params.get("delay") ?? 0)} orientation={params.has("vertical") ? "vertical" : "horizontal"} dir={params.has("rtl") ? "rtl" : "ltr"} style={native ? { position: "fixed", left: Number(params.get("x") ?? 16) * scale, top: Number(params.get("y") ?? 16) * scale, width: single ? 400 * scale : width * scale, height: single ? undefined : height * scale } : undefined} id={!single && native ? "subject" : undefined} data-subject={(!single && native ? "subject" : undefined) === "subject" ? "true" : undefined}>
 <NavigationMenuList ref={listRef} style={!single && native ? { width: width * scale } : undefined}>
 {(single ? [params.get("label") ?? "Game"] : labels).map((label, index) => <NavigationMenuItem key={index} value={String(index)}>{control(label, index)}{index === 0 && (!native || params.has("indicator")) && <NavigationMenuIndicator ref={indicatorRef}/>} { !native && <NavigationMenuContent render={params.has("contentAsChild") ? <section /> : undefined} ref={index === 0 ? contentRef : undefined}>{params.has("contentAsChild") ? <NavigationMenuLink closeOnClick render={<a href="#composed-nav"/>} onClick={select}>{"Composed link"}</NavigationMenuLink> : params.has("rich") ? <form onSubmit={event => { event.preventDefault(); setActions(n => n + 1); }}><p>Read <strong>world details</strong> here.</p><label htmlFor="navigation-world">World name</label><input id="navigation-world" aria-label="Navigation world name" spellCheck={false} autoCorrect="off" defaultValue="Minecraft"/><Button type="submit" scale={scale}>Save navigation settings</Button></form> : <><NavigationMenuLink closeOnClick href="#world" onClick={select}>World guide</NavigationMenuLink><NavigationMenuLink closeOnClick href="#video" onClick={select}>你好，世界</NavigationMenuLink></>}</NavigationMenuContent>}</NavigationMenuItem>)}
 {!native && <NavigationMenuItem><NavigationMenuLink href="#home" active={params.has("activeLink") || params.has("toggleHome") && actions > 0 && !params.has("reject")} onClick={select}>Home</NavigationMenuLink></NavigationMenuItem>}
 {!native && <NavigationMenuItem><NavigationMenuTrigger disabled>Unavailable</NavigationMenuTrigger><NavigationMenuContent>Unavailable</NavigationMenuContent></NavigationMenuItem>}

 </NavigationMenuList>
 {native && params.has("contentHeight") && <div aria-hidden="true" style={{ position: "absolute", left: 0, top: 24 * scale, width: "100%", height: Number(params.get("contentHeight")) * scale, backgroundImage: navigationAssets.textures.menu_background, backgroundSize: `${32 * scale}px ${32 * scale}px` }}/>}

 </NavigationMenu><button id="navigation-outside" style={{ position: "fixed", right: 8, bottom: 8 }} onClick={() => setRefs([rootRef.current?.tagName, listRef.current?.tagName, triggerRef.current?.tagName, contentRef.current?.tagName, rootRef.current?.ownerDocument.querySelector('[data-slot="navigation-menu-positioner"]')?.tagName, indicatorRef.current?.tagName].join(","))}>Read navigation refs</button><output aria-label="Navigation actions">{actions}</output><output aria-label="Navigation refs">{refs}</output><output aria-label="Navigation value">{current}</output></>;
}
function MenubarFixture() {
 const native=params.has("native"),triggerPixels=params.has("triggerPixels"),[open,setOpen]=React.useState(params.has("open")),[menuValue,setMenuValue]=React.useState(params.has("open")?"game":""),[actions,setActions]=React.useState(0),[checked,setChecked]=React.useState(false),[radio,setRadio]=React.useState("world"),[tags,setTags]=React.useState("");
 const content=React.useRef<HTMLDivElement>(null),trigger=React.useRef<HTMLButtonElement>(null),rootRef=React.useRef<HTMLDivElement>(null);
 const labels:string[]=JSON.parse(params.get("labels")??'["Game","World","More >"]'),part=params.get("part"),nativeLabel=params.get("label")??"World Settings",nativeDisabled=(params.get("state")??"").startsWith("disabled"),nativeChecked=params.get("checked")==="true";
 const choose=(event:{preventDefault():void;preventBaseUIHandler?():void})=>{setActions(n=>n+1);if(params.has("preventAction")){event.preventDefault();event.preventBaseUIHandler?.();}};
 const nativeBody=part==="menu-checkbox"?<MenubarCheckboxItem checked={nativeChecked} disabled={nativeDisabled}>{nativeLabel}</MenubarCheckboxItem>:part==="menu-radio"?<MenubarRadioGroup value={nativeChecked?"on":"off"}><MenubarRadioItem value="on" disabled={nativeDisabled}>{nativeLabel}</MenubarRadioItem></MenubarRadioGroup>:part==="menu-label"||part==="menu-label-inset"?<MenubarGroup><MenubarLabel inset={part==="menu-label-inset"}>{nativeLabel}</MenubarLabel></MenubarGroup>:part==="menu-separator"?<MenubarSeparator/>:part==="menu-sub-trigger"?<MenubarSub><MenubarSubTrigger>{nativeLabel}</MenubarSubTrigger></MenubarSub>:part==="menu-disabled"?<MenubarItem disabled>{nativeLabel}</MenubarItem>:labels.map((label,index)=><MenubarItem key={index} data-native-index={index}>{label}</MenubarItem>);
 const handleOpen=(next:boolean,details:{reason:string;cancel():void})=>{if(params.has("reject")||params.has("disabled")||(!next&&((details.reason==="escape-key"&&params.has("preventEscape"))||((details.reason==="outside-press"||details.reason==="focus-out"||details.reason==="cancel-open")&&params.has("preventOutside"))))){details.cancel();return;}setOpen(next);setMenuValue(next?"game":"");};
 const rows=<><MenubarGroup><MenubarLabel>World Settings</MenubarLabel><MenubarItem onClick={choose}>Resume game<MenubarShortcut>Esc</MenubarShortcut></MenubarItem><MenubarItem disabled onClick={choose}>Unavailable</MenubarItem><MenubarItem onClick={choose}>你好，世界</MenubarItem></MenubarGroup><MenubarSeparator/><MenubarCheckboxItem checked={checked} disabled={params.has("disabledCheck")} onCheckedChange={setChecked} closeOnClick={false}>Show coordinates</MenubarCheckboxItem><MenubarRadioGroup value={radio} onValueChange={setRadio}><MenubarRadioItem value="world" closeOnClick={false}>World</MenubarRadioItem><MenubarRadioItem value="game" closeOnClick={false}>Game</MenubarRadioItem></MenubarRadioGroup><MenubarSub><MenubarSubTrigger>More</MenubarSubTrigger><MenubarPortal><MenubarSubContent side="right"><MenubarItem onClick={choose}>Video settings</MenubarItem><MenubarItem onClick={choose}>Audio settings</MenubarItem></MenubarSubContent></MenubarPortal></MenubarSub></>;
 const popup=<MenubarContent render={params.has("contentAsChild")?<section/>:undefined} id="subject" data-subject="true" ref={content} side={(params.get("side")??"bottom") as "top"|"right"|"bottom"|"left"} align={(params.get("align")??(native?"start":"center")) as "start"|"center"|"end"} sideOffset={native?0:4} surface={params.get("surface")==="suggestions"?"suggestions":"popup"} style={native?{width:Number(params.get("width"))*scale,height:Number(params.get("height"))*scale}:params.has("maxHeight")?{maxHeight:Number(params.get("maxHeight"))}:undefined}>{params.has("contentAsChild")?<MenubarItem render={<a href="#menu-composed"/>} onClick={choose}>Composed action</MenubarItem>:native?nativeBody:rows}</MenubarContent>;
return <><Menubar ref={rootRef} scale={scale}><MenubarMenu open={native || (triggerPixels && params.has("open")) ? true :params.has("controlled")?menuValue==="game":undefined} defaultOpen={params.has("open")} onOpenChange={handleOpen}>{<MenubarTrigger render={params.has("nativeButtonChild")?<Button scale={scale}/>:native||params.has("triggerAsChild")?<button style={native?{position:"fixed",left:Number(params.get("x"))*scale,top:Number(params.get("y"))*scale,width:0,height:0,padding:0,border:0}:undefined}/>:undefined} ref={trigger} disabled={params.has("disabled")||(triggerPixels&&params.get("state")==="disabled")} style={triggerPixels?{position:"fixed",left:Number(params.get("x")??16)*scale,top:Number(params.get("y")??16)*scale,width:Number(params.get("width")??200)*scale}:undefined}>{triggerPixels?params.get("label")??"Button":"Game menu"}</MenubarTrigger>}{popup}</MenubarMenu>{!native&&!triggerPixels&&<><MenubarMenu><MenubarTrigger>World menu</MenubarTrigger><MenubarContent><MenubarItem onClick={choose}>Create world</MenubarItem><MenubarItem onClick={choose}>Load world</MenubarItem></MenubarContent></MenubarMenu><MenubarMenu><MenubarTrigger disabled>Unavailable menu</MenubarTrigger><MenubarContent><MenubarItem>Unavailable</MenubarItem></MenubarContent></MenubarMenu></>}</Menubar><button id="menubar-outside" style={{position:"fixed",right:8,bottom:8}} onClick={()=>setTags([rootRef.current?.tagName,trigger.current?.tagName,content.current?.tagName].join(","))}>Inspect menu refs</button><output aria-label="Menu actions">{actions}</output><output aria-label="Menu checked">{String(checked)}</output><output aria-label="Menu radio">{radio}</output><output aria-label="Menu refs">{tags}</output></>;
}
function DropdownFixture() {
 const native=params.has("native"),triggerPixels=params.has("triggerPixels"),[open,setOpen]=React.useState(params.has("open")),[menuValue,setMenuValue]=React.useState(params.has("open")?"game":""),[actions,setActions]=React.useState(0),[checked,setChecked]=React.useState(false),[radio,setRadio]=React.useState("world"),[tags,setTags]=React.useState("");
 const content=React.useRef<HTMLDivElement>(null),trigger=React.useRef<HTMLButtonElement>(null),rootRef=React.useRef<HTMLDivElement>(null);
 const labels:string[]=JSON.parse(params.get("labels")??'["Game","World","More >"]'),part=params.get("part"),nativeLabel=params.get("label")??"World Settings",nativeDisabled=(params.get("state")??"").startsWith("disabled"),nativeChecked=params.get("checked")==="true";
 const choose=(event:{preventDefault():void;preventBaseUIHandler?():void})=>{setActions(n=>n+1);if(params.has("preventAction")){event.preventDefault();event.preventBaseUIHandler?.();}};
 const nativeBody=part==="menu-checkbox"?<DropdownMenuCheckboxItem checked={nativeChecked} disabled={nativeDisabled}>{nativeLabel}</DropdownMenuCheckboxItem>:part==="menu-radio"?<DropdownMenuRadioGroup value={nativeChecked?"on":"off"}><DropdownMenuRadioItem value="on" disabled={nativeDisabled}>{nativeLabel}</DropdownMenuRadioItem></DropdownMenuRadioGroup>:part==="menu-label"||part==="menu-label-inset"?<DropdownMenuGroup><DropdownMenuLabel inset={part==="menu-label-inset"}>{nativeLabel}</DropdownMenuLabel></DropdownMenuGroup>:part==="menu-separator"?<DropdownMenuSeparator/>:part==="menu-sub-trigger"?<DropdownMenuSub><DropdownMenuSubTrigger>{nativeLabel}</DropdownMenuSubTrigger></DropdownMenuSub>:part==="menu-disabled"?<DropdownMenuItem disabled>{nativeLabel}</DropdownMenuItem>:labels.map((label,index)=><DropdownMenuItem key={index} data-native-index={index}>{label}</DropdownMenuItem>);
 const handleOpen=(next:boolean,details:{reason:string;cancel():void})=>{if(params.has("reject")||params.has("disabled")||(!next&&((details.reason==="escape-key"&&params.has("preventEscape"))||((details.reason==="outside-press"||details.reason==="focus-out"||details.reason==="cancel-open")&&params.has("preventOutside"))))){details.cancel();return;}setOpen(next);setMenuValue(next?"game":"");};
 const rows=<><DropdownMenuGroup><DropdownMenuLabel>World Settings</DropdownMenuLabel><DropdownMenuItem onClick={choose}>Resume game<DropdownMenuShortcut>Esc</DropdownMenuShortcut></DropdownMenuItem><DropdownMenuItem disabled onClick={choose}>Unavailable</DropdownMenuItem><DropdownMenuItem onClick={choose}>你好，世界</DropdownMenuItem></DropdownMenuGroup><DropdownMenuSeparator/><DropdownMenuCheckboxItem checked={checked} disabled={params.has("disabledCheck")} onCheckedChange={setChecked} closeOnClick={false}>Show coordinates</DropdownMenuCheckboxItem><DropdownMenuRadioGroup value={radio} onValueChange={setRadio}><DropdownMenuRadioItem value="world" closeOnClick={false}>World</DropdownMenuRadioItem><DropdownMenuRadioItem value="game" closeOnClick={false}>Game</DropdownMenuRadioItem></DropdownMenuRadioGroup><DropdownMenuSub><DropdownMenuSubTrigger>More</DropdownMenuSubTrigger><DropdownMenuPortal><DropdownMenuSubContent side="right"><DropdownMenuItem onClick={choose}>Video settings</DropdownMenuItem><DropdownMenuItem onClick={choose}>Audio settings</DropdownMenuItem></DropdownMenuSubContent></DropdownMenuPortal></DropdownMenuSub></>;
 const popup=<DropdownMenuContent render={params.has("contentAsChild")?<section/>:undefined} id="subject" data-subject="true" ref={content} side={(params.get("side")??"bottom") as "top"|"right"|"bottom"|"left"} align={(params.get("align")??(native?"start":"center")) as "start"|"center"|"end"} sideOffset={native?0:4} surface={params.get("surface")==="suggestions"?"suggestions":"popup"} style={native?{width:Number(params.get("width"))*scale,height:Number(params.get("height"))*scale}:params.has("maxHeight")?{maxHeight:Number(params.get("maxHeight"))}:undefined}>{params.has("contentAsChild")?<DropdownMenuItem render={<a href="#menu-composed"/>} onClick={choose}>Composed action</DropdownMenuItem>:native?nativeBody:rows}</DropdownMenuContent>;
return <><DropdownMenu scale={scale} open={native?true:params.has("controlled")?open:undefined} defaultOpen={params.has("open")} modal={native||params.has("nonmodal")?false:undefined} onOpenChange={handleOpen}>{<DropdownMenuTrigger render={params.has("nativeButtonChild")?<Button scale={scale}/>:native||params.has("triggerAsChild")?<button style={native?{position:"fixed",left:Number(params.get("x"))*scale,top:Number(params.get("y"))*scale,width:0,height:0,padding:0,border:0}:undefined}/>:undefined} ref={trigger} disabled={params.has("disabled")||(triggerPixels&&params.get("state")==="disabled")} style={triggerPixels?{position:"fixed",left:Number(params.get("x")??16)*scale,top:Number(params.get("y")??16)*scale,width:Number(params.get("width")??200)*scale}:undefined}>{triggerPixels?params.get("label")??"Button":"Game menu"}</DropdownMenuTrigger>}{popup}</DropdownMenu><button id="menu-outside" style={{position:"fixed",right:8,bottom:8}} onClick={()=>setTags([trigger.current?.tagName,content.current?.tagName].join(","))}>Inspect menu refs</button><output aria-label="Menu actions">{actions}</output><output aria-label="Menu checked">{String(checked)}</output><output aria-label="Menu radio">{radio}</output><output aria-label="Menu refs">{tags}</output></>;
}
function HoverCardFixture() {
    const native = params.has("native"), controlled = params.has("controlled"), [open, setOpen] = React.useState(native || params.has("open")), [changes, setChanges] = React.useState(0), [links, setLinks] = React.useState(0), [actions, setActions] = React.useState(0), [tags, setTags] = React.useState("");
    const trigger = React.useRef<HTMLAnchorElement>(null), content = React.useRef<HTMLDivElement>(null);
    const rich = <><p>World details</p><a href="#world-guide" onClick={() => setLinks(n => n + 1)}>Read world guide</a><form style={{ display: "grid", gap: 6 * scale }} onSubmit={event => { event.preventDefault(); setActions(n => n + 1); setOpen(false); }}><label htmlFor="hover-world">World name</label><Input id="hover-world" scale={scale} style={{ width: "100%" }}/><Button type="submit" scale={scale} style={{ width: "100%" }}>Save hover settings</Button></form></>;
    const body = params.has("rich") ? rich : params.get("text") ?? "Diamond Pickaxe\nA helpful description.";
    const nativeStyle = native ? { position: "fixed" as const, left: Number(params.get("x") ?? 16) * scale, top: Number(params.get("y") ?? 16) * scale, width: 0, height: 0 } : undefined;
    return <><HoverCard scale={scale} open={native ? true : controlled ? open : undefined} defaultOpen={params.has("open")} onOpenChange={(next, details) => {
            if (!next && ((details.reason === "escape-key" && params.has("preventEscape")) || ((details.reason === "outside-press" || String(details.reason) === "focus-out") && params.has("preventOutside")))) {
                details.cancel();
                return;
            }
            setChanges(n => n + 1);
            if (!params.has("reject") && !native)
                setOpen(next);
        }}>
    <HoverCardTrigger delay={Number(params.get("delay") ?? 0)} closeDelay={Number(params.get("closeDelay") ?? 300)} render={native || params.has("triggerAsChild") ? <a data-composed-trigger="true"/> : undefined} id="hover-trigger" ref={trigger} href="#hover-trigger-link" style={nativeStyle}>{native || params.has("triggerAsChild") ? native ? "" : "World info" : "World info"}</HoverCardTrigger>
    <HoverCardContent render={params.has("contentAsChild") ? <article data-composed-content="true"/> : undefined} id="subject" ref={content} align={(params.get("align") ?? (native ? "start" : "center")) as "start" | "center" | "end"} side={(params.get("side") ?? "bottom") as "top" | "right" | "bottom" | "left"} sideOffset={native ? 0 : 4} maxWidth={Number(params.get("wrapWidth") ?? 170)} data-subject="true">{body}</HoverCardContent>
  </HoverCard><button id="hover-outside" style={{ position: "fixed", right: 8, top: 8 }} onClick={() => setTags([trigger.current?.tagName, content.current?.tagName].join(","))}>Read hover refs</button><output aria-label="Hover changes">{changes}</output><output aria-label="Hover links">{links}</output><output aria-label="Hover actions">{actions}</output><output aria-label="Hover refs">{tags}</output></>;
}
function PopoverFixture() {
    const native = params.has("native"), [open, setOpen] = React.useState(native || params.has("open")), [changes, setChanges] = React.useState(0), [actions, setActions] = React.useState(0), [refs, setRefs] = React.useState("");
    const content = React.useRef<HTMLDivElement>(null), trigger = React.useRef<HTMLButtonElement>(null), anchor = React.useRef<HTMLDivElement>(null);
    return <><Popover scale={scale} open={params.has("controlled") || native ? open : undefined} defaultOpen={params.has("open")} modal={params.has("modal")} onOpenChange={(next, details) => {
            if (!next && ((details.reason === "escape-key" && params.has("preventEscape")) || ((details.reason === "outside-press" || String(details.reason) === "focus-out") && params.has("preventOutside")))) {
                details.cancel();
                return;
            }
            setChanges(n => n + 1);
            if (!params.has("reject"))
                setOpen(next);
        }}>
    {native && <div ref={anchor} style={{ position: "fixed", left: Number(params.get("x") ?? 16) * scale, top: Number(params.get("y") ?? 16) * scale, width: 0, height: 0 }}/>}
    <PopoverTrigger ref={trigger} disabled={params.has("disabled")}>Open popover</PopoverTrigger>
    <PopoverContent anchor={native ? anchor : undefined} id="subject" ref={content} aria-label={native ? "Test popover" : undefined} side={(params.get("side") ?? "bottom") as "bottom" | "top" | "left" | "right"} align={(params.get("align") ?? (native ? "start" : "center")) as "start" | "center" | "end"} sideOffset={native ? 0 : Number(params.get("sideOffset") ?? 4)} style={{ width: native ? Number(params.get("width")) * scale : undefined, height: native ? Number(params.get("height")) * scale : undefined, padding: native && !params.has("text") ? 0 : undefined }} initialFocus={native ? () => content.current : undefined} data-subject="true">
      {(!native || params.has("text")) && <><PopoverHeader><PopoverTitle>{params.get("label") ?? "World Settings"}</PopoverTitle><PopoverDescription>{params.get("text") ?? "Configure the world."}</PopoverDescription></PopoverHeader>{!native && <form onSubmit={event => { event.preventDefault(); setActions(n => n + 1); setOpen(false); }}><label htmlFor="popover-input">World name</label><Input id="popover-input" scale={scale} defaultValue="Minecraft" style={{ width: "100%" }}/><Button type="submit" scale={scale}>Save</Button></form>}<div style={{ display: "flex", gap: 6 * scale }}><PopoverClose style={{ width: "100%" }} onClick={() => { setActions(n => n + 1); }}>Done</PopoverClose></div>{!native && <Button scale={scale} onClick={() => setRefs([trigger.current?.tagName, content.current?.tagName].join(","))}>Inspect popover refs</Button>}</>}
    </PopoverContent></Popover><button id="popover-outside" style={{ position: "fixed", right: 8, bottom: 8 }}>Outside</button><output aria-label="Popover changes">{changes}</output><output aria-label="Popover actions">{actions}</output><output aria-label="Popover refs">{refs}</output></>;
}
function PopoverCompositionFixture() {
    const [open, setOpen] = React.useState(false), [actions, setActions] = React.useState(0), [tags, setTags] = React.useState("");
    const trigger = React.useRef<HTMLButtonElement>(null), content = React.useRef<HTMLDivElement>(null), anchor = React.useRef<HTMLDivElement>(null);
    return <><Popover scale={scale} open={open} onOpenChange={setOpen}>
    <div ref={anchor} id="composed-anchor" style={{ position: "fixed", left: 240, top: 180, width: 32, height: 24 }}/>
    <PopoverTrigger render={<Button scale={scale}/>} ref={trigger}>{"Composed trigger"}</PopoverTrigger>
    <PopoverContent anchor={anchor} render={<section id="composed-popover"/>} ref={content} side="bottom" align="start" sideOffset={0} style={{ width: 236 * scale }}>{<><PopoverHeader><PopoverTitle>World Settings</PopoverTitle><PopoverDescription>Configure the world.</PopoverDescription></PopoverHeader>
        <form onSubmit={event => { event.preventDefault(); setActions(n => n + 1); setOpen(false); }}><label htmlFor="composed-world-name">World name</label><Input id="composed-world-name" scale={scale}/><Button type="submit" scale={scale}>Save composition</Button></form>
        <Button scale={scale} onClick={() => setTags([trigger.current?.tagName, content.current?.tagName, anchor.current?.tagName].join(","))}>Inspect composition refs</Button>
      </>}</PopoverContent>
  </Popover><output aria-label="Composition refs">{tags}</output><output aria-label="Composition actions">{actions}</output></>;
}
function AlertDialogFixture() {
    const native = params.has("native"), [open, setOpen] = React.useState(native || params.has("open")), [confirmed, setConfirmed] = React.useState(0);
    const content = React.useRef<HTMLDivElement>(null), labels: string[] = JSON.parse(params.get("labels") ?? '["Yes","No"]');
    return <>{params.has("patterned") && createPortal(<div data-dialog-underlay="true" style={{ position: "fixed", inset: 0 }}><div style={{ position: "absolute", left: 18 * scale, top: 18 * scale, height: 64 * scale, display: "flex" }}>{Array.from({ length: 256 }, (_, i) => <i key={i} style={{ display: "block", width: scale, height: "100%", background: `rgb(${i},${255 - i},${i * 37 % 256})` }}/>)}</div><Button scale={scale} style={{ position: "absolute", left: 18 * scale, top: 100 * scale, width: 140 * scale }}>Behind the dialog</Button></div>, document.body)}<AlertDialog scale={scale} open={open} onOpenChange={(next, details) => {
            if (!next && ((details.reason === "escape-key" && params.has("preventEscape")) || ((details.reason === "outside-press" || String(details.reason) === "focus-out") && params.has("preventOutside")))) {
                details.cancel();
                return;
            }
            if (!params.has("reject"))
                setOpen(next);
        }}><AlertDialogTrigger>Open confirmation</AlertDialogTrigger><AlertDialogContent ref={content} keepMounted={params.has("forceMount") ? true : undefined} blur={Number(params.get("blur") ?? 5)} initialFocus={native ? () => content.current : undefined}><AlertDialogHeader><AlertDialogTitle>{params.get("label") ?? "Are you sure?"}</AlertDialogTitle><AlertDialogDescription>{params.get("text") ?? "This action cannot be undone."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction disabled={params.get("disabledIndex") === "0"} onClick={event => {
            if (params.has("preventAction"))
                event.preventDefault();
            setConfirmed(n => n + 1);
            if (!event.defaultPrevented && !params.has("reject"))
                setOpen(false);
        }}>{labels[0]}</AlertDialogAction><AlertDialogCancel disabled={params.get("disabledIndex") === "1"}>{labels[1]}</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog><output aria-label="Confirmations">{confirmed}</output></>;
}
function AlertDialogCompositionFixture() {
    const trigger = React.useRef<HTMLButtonElement>(null), content = React.useRef<HTMLDivElement>(null), action = React.useRef<HTMLButtonElement>(null), cancel = React.useRef<HTMLButtonElement>(null);
    const [refs, setRefs] = React.useState(""), [submissions, setSubmissions] = React.useState(0);
    return <AlertDialog><AlertDialogTrigger render={<Button />} ref={trigger}>{"Composed confirmation"}</AlertDialogTrigger><AlertDialogContent render={<section />} ref={content}>{<><AlertDialogHeader><AlertDialogTitle render={<h3 />}>{"Composed title"}</AlertDialogTitle><AlertDialogDescription render={<div />}>{"Composed description"}</AlertDialogDescription></AlertDialogHeader><form onSubmit={event => { event.preventDefault(); setSubmissions(n => n + 1); }}><Input name="name" aria-label="Confirmation form input"/><Button type="submit">Submit</Button></form><Button onClick={() => setRefs([trigger.current?.tagName, content.current?.tagName, action.current?.tagName, cancel.current?.tagName].join(","))}>Inspect confirmation refs</Button><output aria-label="Confirmation refs">{refs}</output><output aria-label="Confirmation submissions">{submissions}</output><AlertDialogFooter><AlertDialogAction ref={action} nativeButton={false} render={<a href="#confirmed"/>}>{"Confirm link"}</AlertDialogAction><AlertDialogCancel ref={cancel} render={<Button />}>{"Cancel composed"}</AlertDialogCancel></AlertDialogFooter></>}</AlertDialogContent></AlertDialog>;
}
function DialogCompositionFixture() {
    const trigger = React.useRef<HTMLButtonElement>(null), content = React.useRef<HTMLDivElement>(null), overlay = React.useRef<HTMLDivElement>(null);
    const [result, setResult] = React.useState(""), [submissions, setSubmissions] = React.useState(0);
    return <Dialog><DialogTrigger render={<Button />} ref={trigger}>{"Composed trigger"}</DialogTrigger><DialogPortal><DialogOverlay render={<aside data-custom-overlay="true"/>} ref={overlay}>{undefined}</DialogOverlay></DialogPortal><DialogContent render={<section data-custom-content="true"/>} ref={content}>{<><DialogHeader><DialogTitle render={<h3 />}>{"Composed title"}</DialogTitle><DialogDescription render={<div />}>{"Composed description"}</DialogDescription></DialogHeader><form onSubmit={event => { event.preventDefault(); setSubmissions(n => n + 1); }}><Input aria-label="Dialog form input" name="name"/><Button type="submit">Submit</Button></form><Button onClick={() => setResult([trigger.current?.tagName, content.current?.tagName, overlay.current?.tagName].join(","))}>Inspect refs</Button><output aria-label="Dialog composed refs">{result}</output><output aria-label="Dialog submissions">{submissions}</output><DialogFooter><DialogClose render={<Button />}>{"Composed close"}</DialogClose></DialogFooter></>}</DialogContent></Dialog>;
}
function DialogFixture() {
    const native = params.has("native"), [open, setOpen] = React.useState(params.has("open") || native), [actions, setActions] = React.useState(0), [changes, setChanges] = React.useState(0);
    const content = React.useRef<HTMLDivElement>(null), trigger = React.useRef<HTMLButtonElement>(null);
    const labels: string[] = params.has("labels") ? JSON.parse(params.get("labels")!) : ["Cancel", "Continue"];
    const description = native ? params.has("text") ? params.get("text") : null : params.get("text") ?? "A helpful description.";
    return <>{params.has("patterned") && createPortal(<div data-dialog-underlay="true" style={{ position: "fixed", inset: 0 }}><div style={{ position: "absolute", left: 18 * scale, top: 18 * scale, height: 64 * scale, display: "flex" }}>{Array.from({ length: 256 }, (_, i) => <i key={i} style={{ display: "block", width: scale, height: "100%", background: `rgb(${i},${255 - i},${i * 37 % 256})` }}/>)}</div><Button scale={scale} style={{ position: "absolute", left: 18 * scale, top: 100 * scale, width: 140 * scale }}>Behind the dialog</Button></div>, document.body)}<Dialog scale={scale} defaultOpen={params.has("open") || native} open={params.has("controlled") ? open : undefined} modal={!params.has("nonmodal")} onOpenChange={(next, details) => {
            if (!next && ((details.reason === "escape-key" && params.has("preventEscape")) || ((details.reason === "outside-press" || String(details.reason) === "focus-out") && params.has("preventOutside")))) {
                details.cancel();
                return;
            }
            if (!params.has("reject"))
                setOpen(next);
            setChanges(current => current + 1);
        }}><DialogTrigger ref={trigger}>Open dialog</DialogTrigger><DialogContent ref={content} width={Number(params.get("wrapWidth") ?? 250)} initialFocus={native ? () => content.current : undefined}>
    <DialogHeader><DialogTitle>{params.get("label") ?? "World settings"}</DialogTitle>{description != null && <DialogDescription>{description}</DialogDescription>}</DialogHeader>
    <DialogFooter>{labels.map((label, index) => <Button key={index} scale={scale} disabled={Number(params.get("disabledIndex") ?? -1) === index} onClick={() => setActions(current => current + 1)}>{label}</Button>)}</DialogFooter>
    {!native && <DialogClose>Done</DialogClose>}
  </DialogContent></Dialog><button id="dialog-external" onClick={() => setOpen(current => !current)}>Change dialog externally</button><output aria-label="Dialog actions">{actions}</output><output aria-label="Dialog changes">{changes}</output><button id="dialog-read-refs" onClick={() => { setActions(content.current?.tagName === "DIV" && trigger.current?.tagName === "BUTTON" ? 100 : -1); }}>Read refs</button></>;
}
function Fixture() {
    if(params.get("component")==="tabs-fallback") return <TabsFallbackFixture/>;
    if(params.get("component")==="base-ui-composition") return <BaseUICompositionFixture/>;
    if (params.get("component") === "collapsible-first-frame")
        return <CollapsibleFirstFrameFixture />;
    if (params.get("component") === "badge-advancement")
        return <BadgeAdvancementFixture />;
    if (params.get("component") === "questionnaire")
        return <QuestionnaireFixture />;
    if (params.get("component") === "dialog-footer")
        return <DialogFooterFixture />;
    if (params.get("component") === "alert-dialog-media")
        return <AlertDialogMediaFixture />;
    if (params.get("component") === "combobox")
        return <ComboboxFixture />;
    if (params.get("component") === "attachment")
        return <AttachmentFixture />;
    if (params.get("component") === "color-painter-stress")
        return <ColorPainterStressFixture />;
    if (params.get("component") === "marker")
        return <MarkerFixture />;
    if (params.get("component") === "chart")
        return <ChartFixture />;
    if (["trace", "message-scroller", "skeleton", "spinner"].includes(params.get("component") ?? ""))
        return params.has("native") ? <NativeTextCompositionsFixture /> : <TextWidgetsFixture />;
    if (params.get("component") === "native-select")
        return <NativeSelectFixture />;
    if (params.get("component") === "code-block")
        return params.has("native") ? <NativeTextCompositionsFixture /> : <CodeBlockFixture />;
    if (params.get("component") === "input-otp")
        return <InputOTPFixture />;
    if (params.get("component") === "carousel")
        return <CarouselFixture />;
    if (["form", "field"].includes(params.get("component") ?? ""))
        return <FormsFixture />;
    if (params.get("component") === "data-table")
        return <DataTableFixture />;
    if (params.get("component") === "input-group")
        return <InputGroupFixture />;
    if (params.get("component") === "command")
        return <CommandFixture />;
    if (["calendar", "date-picker"].includes(params.get("component") ?? ""))
        return <CalendarFixture />;
    if (["message", "bubble"].includes(params.get("component") ?? ""))
        return <ChatFamilyFixture />;
    if (params.get("component") === "resizable")
        return <ResizableFixture />;
    if (params.get("component") === "sidebar")
        return <SidebarFixture />;
    if (params.get("component") === "table")
        return <TableFixture />;
    if (params.get("component") === "item")
        return <ItemFixture />;
    if (params.get("component") === "avatar")
        return <AvatarFixture />;
    if (["sonner", "sonner-strict"].includes(params.get("component") ?? ""))
        return <ToastFixture />;
    if (params.get("component") === "button-composition")
        return <ButtonCompositionFixture />;
    if (["badge", "typography", "breadcrumb", "kbd", "empty"].includes(params.get("component") ?? ""))
        return <TextComponentsFixture />;
    if (["sheet", "drawer", "alert"].includes(params.get("component") ?? ""))
        return <OverlayFixture />;
    if (["aspect-ratio", "direction", "button-group", "pagination"].includes(params.get("component") ?? ""))
        return <StructuralFixture />;
    if (params.get("component") === "toggle-group")
        return <ToggleGroupFixture />;
    if (params.get("component") === "toggle")
        return <ToggleFixture />;
    if (params.get("component") === "context-menu")
        return <ContextFixture />;
    if (params.get("component") === "collapsible")
        return <CollapsibleFixture />;
    if (params.get("component") === "accordion")
        return <AccordionFixture />;
    if (params.get("component") === "navigation-menu")
        return <NavigationFixture />;
    if (params.get("component") === "menubar")
        return <MenubarFixture />;
    if (params.get("component") === "dropdown-menu")
        return <DropdownFixture />;
    if (params.get("component") === "hover-card")
        return <HoverCardFixture />;
    if (params.get("component") === "popover-composition")
        return <PopoverCompositionFixture />;
    if (params.get("component") === "popover")
        return <PopoverFixture />;
    if (params.get("component") === "alert-dialog-composition")
        return <AlertDialogCompositionFixture />;
    if (params.get("component") === "alert-dialog")
        return <AlertDialogFixture />;
    if (params.get("component") === "dialog-composition")
        return <DialogCompositionFixture />;
    if (params.get("component") === "dialog")
        return <DialogFixture />;
    if (params.get("component") === "switch")
        return <SwitchFixture />;
    if (params.get("component")?.startsWith("radio-group"))
        return <RadioFixture />;
    if (params.get("component")?.startsWith("select"))
        return <SelectFixture />;
    const [count, setCount] = React.useState(0);
    const [commits, setCommits] = React.useState(0);
    const [refName, setRefName] = React.useState("");
    const sliderRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const cardRef = React.useRef<HTMLDivElement>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const labelRef = React.useRef<HTMLLabelElement>(null);
    const separatorRef = React.useRef<HTMLDivElement>(null);
    const scrollAreaRef = React.useRef<HTMLDivElement>(null), viewportRef = React.useRef<HTMLDivElement>(null);
    const [scrollValue, setScrollValue] = React.useState(0);
    const [scrollContent, setScrollContent] = React.useState(Number(params.get("contentHeight") ?? 480));
    const progressRef = React.useRef<HTMLDivElement>(null);
    const [progressValue, setProgressValue] = React.useState<number | null>(params.has("unknown") ? null : Number(params.get("value") ?? 50));
    const tabsRef = React.useRef<HTMLDivElement>(null), tabsListRef = React.useRef<HTMLDivElement>(null), tabsTriggerRef = React.useRef<HTMLButtonElement>(null), tabsContentRef = React.useRef<HTMLDivElement>(null);
    const [tabsValue, setTabsValue] = React.useState(`tab-${params.get("selectedIndex") ?? 0}`);
    const [inputValue, setInputValue] = React.useState(params.get("text") ?? "Hello Minecraft");
    const [submitted, setSubmitted] = React.useState(0);
    const [tooltipOpen, setTooltipOpen] = React.useState(params.has("open"));
    const tooltipRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (params.get("component") === "textarea" && textareaRef.current)
            textareaRef.current.scrollTop = Number(params.get("scroll") ?? 0) * scale;
    }, []);
    React.useEffect(() => {
        if (params.get("component") === "scroll-area" && viewportRef.current)
            viewportRef.current.scrollTop = Number(params.get("scroll") ?? 0) * scale;
    }, []);
    if (params.get("component") === "tabs-trigger")
        return <Tabs scale={scale} defaultValue={params.get("selected") === "true" ? "subject" : null}>
    <TabsList aria-label="Test tab trigger" activateOnFocus={params.get("activationMode") !== "manual" && params.get("component") !== "tabs-trigger"}><TabsTrigger id="subject" value="subject" disabled={state.startsWith("disabled")} style={{ width: width * scale }} data-subject="true">{params.get("label") ?? "Game"}</TabsTrigger></TabsList>
  </Tabs>;
    if (params.get("component") === "tabs") {
        const titles: string[] = params.has("labels") ? JSON.parse(params.get("labels")!) : ["Game", "World", "More"];
        const panel = Number(params.get("contentHeight") ?? 0);
        const triggers = titles.map((title, index) => <TabsTrigger render={params.has("triggerAsChild") && index === 0 ? <a href="#composed-tab"/> : undefined} key={index} value={`tab-${index}`} ref={index === 0 ? tabsTriggerRef : undefined} disabled={params.has("disabledIndex") && Number(params.get("disabledIndex")) === index}>{title}</TabsTrigger>);
        const contents = <><TabsList render={params.has("listAsChild") ? <nav /> : undefined} id={panel > 0 ? "tab-list" : "subject"} ref={tabsListRef} aria-label="Test tabs" activateOnFocus={params.get("activationMode") !== "manual" && params.get("component") !== "tabs-trigger"} data-subject={(panel > 0 ? "tab-list" : "subject") === "subject" ? "true" : undefined}>{triggers}</TabsList>{titles.map((title, index) => <TabsContent key={index} value={`tab-${index}`} ref={index === 0 ? tabsContentRef : undefined} keepMounted={params.has("forceMount") ? true : undefined} style={{ height: panel > 0 ? panel * scale : undefined }}>{panel > 0 && !params.has("panelText") ? null : <span>{title} content</span>}</TabsContent>)}</>;
        return <>
      <Tabs render={params.has("asChild") ? <section /> : undefined} id={panel > 0 ? "subject" : "tabs-root"} ref={tabsRef} scale={scale} defaultValue={`tab-${params.get("selectedIndex") ?? 0}`} value={params.has("controlled") ? tabsValue : undefined} dir={params.get("dir") === "rtl" ? "rtl" : "ltr"} style={{ width: width * scale }} onValueChange={next => {
                if (!params.has("reject"))
                    setTabsValue(next);
                setCount(current => current + 1);
            }} data-subject={(panel > 0 ? "subject" : "tabs-root") === "subject" ? "true" : undefined}>{contents}</Tabs>
      <output aria-label="Selected tab">{tabsValue}</output><output aria-label="Tab changes">{count}</output>
      <button id="select-last-tab" onClick={() => setTabsValue(`tab-${titles.length - 1}`)}>Select last tab externally</button>
      <button id="read-ref" onClick={() => setRefName(`${tabsRef.current?.tagName}/${tabsListRef.current?.tagName}/${tabsTriggerRef.current?.tagName}/${tabsContentRef.current?.tagName}`)}>Read refs</button><output aria-label="Root ref">{refName}</output>
    </>;
    }
    if (params.get("component") === "progress")
        return <>
    <Progress render={params.has("asChild") ? <section data-testid="composed-progress"/> : undefined} id="subject" ref={progressRef} scale={scale} value={progressValue} max={Number(params.get("max") ?? 100)} color={(params.get("color") ?? "pink") as BossBarColor} overlay={(params.get("overlay") ?? "progress") as BossBarOverlay} aria-label="Test progress" onClick={() => setCount(current => current + 1)} aria-valuetext={params.has("customLabel") ? `${progressValue} of ${Number(params.get("max") ?? 100)} loaded` : undefined} data-subject="true">{undefined}</Progress>
    <button id="update-progress" onClick={() => setProgressValue(Number(params.get("next") ?? 100))}>Update progress</button><button id="unknown-progress" onClick={() => setProgressValue(null)}>Unknown progress</button>
    <button id="read-ref" onClick={() => setRefName(progressRef.current?.tagName ?? "missing")}>Read ref</button><output aria-label="Root ref">{refName}</output><output aria-label="Activations">{count}</output>
  </>;
    if (params.get("component") === "scroll-area") {
        const rows = <div key="rows" style={{ height: scrollContent * scale, overflow: "hidden" }}>{Array.from({ length: Math.ceil(scrollContent / 24) }, (_, index) => <div key={index} style={{ height: 24 * scale, display: "flex", alignItems: "flex-start" }}><Button scale={scale} style={{ width: "100%" }} onClick={() => setCount(current => current + 1)}>{`Row ${index + 1}`}</Button></div>)}</div>;
        const customBar = params.has("customBar") ? <ScrollBar key="bar" data-testid="custom-scrollbar"/> : null;
        return <>
      <ScrollArea render={params.has("asChild") ? <section /> : undefined} id="subject" ref={scrollAreaRef} viewportRef={viewportRef} role="region" aria-label="Test scroll area" disabled={state === "disabled"} scale={scale} onPointerDown={() => setCommits(current => current + 1)} viewportProps={{ "aria-label": "Scrollable content", onScroll: event => setScrollValue(event.currentTarget.scrollTop) }} style={params.has("defaults") ? undefined : { width: width * scale, height: Number(params.get("height") ?? 80) * scale }} data-subject="true">{params.has("asChild") ? <>{rows}{customBar}</> : [rows, customBar]}</ScrollArea>
      <button id="read-ref" onClick={() => setRefName(`${scrollAreaRef.current?.tagName}/${viewportRef.current?.tagName}`)}>Read ref</button><output aria-label="Root ref">{refName}</output><output aria-label="Scroll offset">{scrollValue}</output><output aria-label="Activations">{count}</output><output aria-label="Pointer events">{commits}</output>
      <button id="shrink-content" onClick={() => setScrollContent(24)}>Shrink content</button><button id="grow-content" onClick={() => setScrollContent(480)}>Grow content</button>
    </>;
    }
    if (params.get("component") === "separator")
        return <>
        <button id="before">Before separator</button>
        <Separator render={params.has("asChild") ? <hr /> : undefined} id="subject" ref={separatorRef} scale={scale} edge={state === "footer" ? "footer" : "header"} role={params.has("semantic") ? "separator" : "none"} aria-label={params.has("semantic") ? "Settings sections" : undefined} data-testid="native-separator" style={{ width: width * scale }} onClick={() => setCount(current => current + 1)} data-subject="true">{undefined}</Separator>
        <button id="after">After separator</button><button id="read-ref" onClick={() => setRefName(separatorRef.current?.tagName ?? "missing")}>Read ref</button><output aria-label="Root ref">{refName}</output><output aria-label="Activations">{count}</output>
        </>;
    if (params.get("component") === "label")
        return <>
    <Label id="subject" ref={labelRef} htmlFor="label-input" scale={scale} aria-disabled={state === "disabled" || undefined} maxWidth={params.has("wrapWidth") ? Number(params.get("wrapWidth")) : undefined} align={params.get("alignment") === "center" ? "center" : "left"} style={{ width: width * scale, height: Number(params.get("height") ?? 9) * scale }} onClick={() => setCount(current => current + 1)} data-subject="true">{params.has("rich") ? <strong>Rich label</strong> : label}</Label>
    <Input id="label-input" disabled={state === "disabled"} defaultValue="Minecraft"/>
    <button id="read-ref" onClick={() => setRefName(labelRef.current?.tagName ?? "missing")}>Read ref</button><output aria-label="Root ref">{refName}</output><output aria-label="Activations">{count}</output>
  </>;
    if (params.get("component") === "textarea")
        return <>
    <form onSubmit={event => { event.preventDefault(); setSubmitted(current => current + 1); }}>
      <Textarea id="subject" ref={textareaRef} name="message" aria-label="Test textarea" scale={scale} value={params.has("uncontrolled") ? undefined : inputValue} defaultValue={params.has("uncontrolled") ? params.get("text") ?? "" : undefined} disabled={state === "disabled"} readOnly={state.includes("readonly")} placeholder={params.get("placeholder") ?? ""} style={{ width: width * scale, height: Number(params.get("height") ?? 80) * scale }} onChange={event => { setInputValue(event.target.value); setCount(current => current + 1); }} data-subject="true"/>
      <button type="submit" id="submit">Submit</button><button type="reset" id="reset">Reset</button>
    </form>
    <output aria-label="Textarea value">{inputValue}</output><output aria-label="Textarea changes">{count}</output><output aria-label="Submissions">{submitted}</output>
    <button id="read-ref" onClick={() => setRefName(textareaRef.current?.tagName ?? "missing")}>Read ref</button><output aria-label="Root ref">{refName}</output>
  </>;
    if (params.get("component") === "card")
        return <>
    <Card id="subject" ref={cardRef} aria-label="Test card" scale={scale} style={{ width: width * scale, height: Number(params.get("height") ?? 200) * scale, padding: params.has("text") ? undefined : 0 }} data-subject="true">
      {params.has("text") && <><CardHeader><CardTitle>{params.get("label") ?? "World Settings"}</CardTitle><CardDescription>{params.get("text")}</CardDescription>{params.has("action") && <CardAction><button onClick={() => setCount(current => current + 1)}>Action</button></CardAction>}</CardHeader>
        {params.has("content") && <CardContent><label htmlFor="card-input">Name</label><Input id="card-input" defaultValue="Minecraft"/></CardContent>}
        <CardFooter><Button scale={scale} onClick={() => setCount(current => current + 1)}>Done</Button></CardFooter></>}
    </Card>
    <button id="read-ref" onClick={() => setRefName(cardRef.current?.tagName ?? "missing")}>Read ref</button>
    <output aria-label="Root ref">{refName}</output><output aria-label="Activations">{count}</output>
  </>;
    if (params.get("component") === "tooltip")
        return <TooltipProvider delay={Number(params.get("delay") ?? 0)}>
    <Tooltip open={params.has("controlled") ? tooltipOpen : undefined} defaultOpen={params.has("open")} onOpenChange={setTooltipOpen}>
      <TooltipTrigger render={<button id="tooltip-trigger" style={{ marginTop: params.get("edge") === "top" ? 0 : 240, marginLeft: params.get("edge") === "left" ? 0 : 300 }} onClick={() => setCount(current => current + 1)}/>}>{"Inspect"}</TooltipTrigger>
      <TooltipContent render={params.has("asChild") ? <div /> : undefined} id="subject" ref={tooltipRef} scale={scale} maxWidth={Number(params.get("wrapWidth") ?? 170)} side={(params.get("side") ?? "top") as "top" | "bottom" | "left" | "right"} sideOffset={Number(params.get("offset") ?? 0)} data-subject="true">{params.has("asChild") ? params.get("text") ?? "Tooltip" : params.has("rich") ? <strong>Rich tooltip</strong> : params.get("text") ?? "Tooltip"}</TooltipContent>
    </Tooltip>
    <button id="next">Next focus target</button>
    <button id="external-open" onClick={() => setTooltipOpen(true)}>Open externally</button>
    <button id="read-ref" onClick={() => setRefName(tooltipRef.current?.tagName ?? "missing")}>Read ref</button>
    <output aria-label="Root ref">{refName}</output><output aria-label="Tooltip open">{String(tooltipOpen)}</output><output aria-label="Activations">{count}</output>
  </TooltipProvider>;
    if (params.get("component") === "input")
        return <>
    <form id="input-form" onSubmit={event => { event.preventDefault(); setSubmitted(current => current + 1); }}>
      <Input ref={inputRef} id="subject" name="message" aria-label="Test input" scale={scale} style={{ width: width * scale }} value={params.has("uncontrolled") ? undefined : inputValue} defaultValue={params.has("uncontrolled") ? params.get("text") ?? "Hello Minecraft" : undefined} type={params.get("type") ?? "text"} placeholder={params.get("placeholder") ?? undefined} disabled={state === "disabled"} readOnly={state.includes("readonly")} required={params.has("required")} pattern={params.get("pattern") ?? undefined} maxLength={params.has("maxLength") ? Number(params.get("maxLength")) : undefined} onChange={event => { setInputValue(event.target.value); setCount(current => current + 1); }} data-subject="true"/>
      <button id="submit">Submit</button>
      <button type="reset" id="reset">Reset</button>
    </form>
    <output aria-label="Input changes">{count}</output><output aria-label="Input value">{inputValue}</output><output aria-label="Submissions">{submitted}</output>
    <button id="next">Next focus target</button>
    <button id="read-ref" onClick={() => setRefName(inputRef.current?.tagName ?? "missing")}>Read ref</button><output aria-label="Root ref">{refName}</output>
    <button id="imperative" onClick={() => {
                if (inputRef.current)
                    inputRef.current.value = "Done";
            }}>Set through ref</button>
  </>;
    const [checked, setChecked] = React.useState<boolean | "indeterminate">(params.get("checked") === "mixed" ? "indeterminate" : params.get("checked") === "true");
    const [values, setValues] = React.useState((params.get("values") ?? params.get("value") ?? "500").split(",").map(Number));
    if (params.get("component") === "slider")
        return <>
    <form id="slider-form">
    <Slider ref={sliderRef} id="subject" name="volume" scale={scale} aria-label="Volume" label={params.get("label") ?? undefined} value={params.has("uncontrolled") || params.has("default-range") ? undefined : values} defaultValue={params.has("default-range") ? undefined : values} min={0} max={1000} step={1} disabled={state === "disabled"} dir={params.get("dir") === "rtl" ? "rtl" : "ltr"} orientation={params.get("orientation") === "vertical" ? "vertical" : "horizontal"} style={params.get("orientation") === "vertical" ? undefined : { width: width * scale }} onValueCommitted={() => setCommits(current => current + 1)} onValueChange={next => { setValues(typeof next === "number" ? [next] : [...next]); setCount(current => current + 1); }} data-subject="true"/>
    </form>
    <output aria-label="Values">{values.join(",")}</output>
    <output aria-label="Changes">{count}</output>
    <output aria-label="Commits">{commits}</output>
    <output aria-label="Root ref">{refName}</output>
    <button id="next">Next focus target</button>
    <button id="read-ref" onClick={() => setRefName(sliderRef.current?.id ?? "missing")}>Read ref</button>
    <button type="reset" form="slider-form" id="reset">Reset</button>
  </>;
    if (params.get("component") === "checkbox")
        return <>
    <Checkbox id="subject" aria-label="Test checkbox" scale={scale} checked={checked === true} indeterminate={checked === "indeterminate"} disabled={state === "disabled"} onCheckedChange={value => { setChecked(value); setCount(count + 1); }} data-subject="true"/>
    <output aria-label="Changes">{count}</output>
    <button id="next">Next focus target</button>
  </>;
    return <>
    <Button id="subject" scale={scale} disabled={state === "disabled"} style={params.has("width") ? { width: width * scale } : undefined} onClick={() => setCount(count + 1)} data-subject="true">{label}</Button>
    <output aria-label="Activations">{count}</output>
    <Button render={<a href="#destination"/>}>{"Continue"}</Button>
    <Button disabled onClick={() => setCount(count + 100)}>Disabled</Button>
    <a href="#utility" className={buttonVariants()}>Utility link</a>
  </>;
}
createRoot(document.getElementById("root")!).render(<BaseDirectionProvider direction={params.has("rtl") || params.get("dir")==="rtl" ? "rtl" : "ltr"}><Fixture /></BaseDirectionProvider>);
