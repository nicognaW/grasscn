import { DirectionProvider as BaseDirectionProvider } from "@base-ui/react/direction-provider";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@grasscn/web/ui/alert-dialog";
import { Button, buttonVariants } from "@grasscn/web/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@grasscn/web/ui/card";
import { Checkbox } from "@grasscn/web/ui/checkbox";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@grasscn/web/ui/collapsible";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuLabel,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuPortal,
  ContextMenuSubContent,
} from "@grasscn/web/ui/context-menu";
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@grasscn/web/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@grasscn/web/ui/dropdown-menu";
import { Input } from "@grasscn/web/ui/input";
import { Label } from "@grasscn/web/ui/label";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarLabel,
  MenubarItem,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubTrigger,
  MenubarPortal,
  MenubarSubContent,
} from "@grasscn/web/ui/menubar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverClose,
} from "@grasscn/web/ui/popover";
import { Progress } from "@grasscn/web/ui/progress";
import type { BossBarColor, BossBarOverlay } from "@grasscn/web/ui/progress";
import { RadioGroup, RadioGroupItem } from "@grasscn/web/ui/radio-group";
import { ScrollArea, ScrollBar } from "@grasscn/web/ui/scroll-area";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@grasscn/web/ui/select";
import { Separator } from "@grasscn/web/ui/separator";
import { Slider } from "@grasscn/web/ui/slider";
import { Switch } from "@grasscn/web/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@grasscn/web/ui/tabs";
import { Textarea } from "@grasscn/web/ui/textarea";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@grasscn/web/ui/tooltip";
import type { ReactNode } from "react";
import * as React from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";

import { AlertDialogMediaFixture } from "./alert-dialog-media";
import { AttachmentFixture } from "./attachment";
import { AvatarFixture } from "./avatar";
import { BadgeAdvancementFixture } from "./badge-advancement";
import { BaseUICompositionFixture } from "./base-ui-composition";
import { ButtonCompositionFixture } from "./button-composition";
import { CalendarFixture } from "./calendar";
import { CarouselFixture } from "./carousel";
import { ChartFixture } from "./chart";
import { ChatFamilyFixture } from "./chat-family";
import { CodeBlockFixture } from "./code-block";
import { CollapsibleFirstFrameFixture } from "./collapsible-first-frame";
import { ColorPainterStressFixture } from "./color-painter-stress";
import { ComboboxFixture } from "./combobox";
import { CommandFixture } from "./command";
import { CustomApiFixture } from "./custom-api";
import { DataTableFixture } from "./data-table";
import { DialogFooterFixture } from "./dialog-footer";
import type { FixtureLabels } from "./fixture-query-protocol";
import { resolveFixtureRoute } from "./fixture-routing";
import type { FixtureRoute } from "./fixture-routing";
import { FormsFixture } from "./forms";
import { InputGroupFixture } from "./input-group";
import { InputOTPFixture } from "./input-otp";
import { ItemFixture } from "./item";
import { KeyedRichChildrenFixture } from "./keyed-rich-children";
import { MarkerFixture } from "./marker";
import { NativeSelectFixture } from "./native-select";
import { NativeTextCompositionsFixture } from "./native-text-compositions";
import { OverlayFixture } from "./overlay";
import { QuestionnaireFixture } from "./questionnaire";
import { ResizableFixture } from "./resizable";
import { SidebarFixture } from "./sidebar";
import { StructuralFixture } from "./structural";
import { TableFixture } from "./table";
import { TabsFallbackFixture } from "./tabs-fallback";
import { TextComponentsFixture } from "./text-components";
import { TextWidgetsFixture } from "./text-widgets";
import { ToastFixture } from "./toast";
import { ToggleFixture } from "./toggle";
import { ToggleGroupFixture } from "./toggle-group";
import { cn, fixtureFallbackLabel } from "./utils";

import "./style.css";

const params = new URLSearchParams(location.search);

// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale =
  // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
  Number(params.get("scale") ?? 2) as 1 | 2 | 3;

const width = Number(params.get("width") ?? 200);
const state = params.get("state") ?? "normal";
const label = params.get("label") ?? "Button";

const SelectFixture = () => {
  const labelsSource = params.get("labels");

  // SAFETY: owned Select titles callers serialize string label arrays; preserve this branch's existing parameter/default read.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact Select titles query-label producer boundary.
  const titles: string[] =
    labelsSource === null
      ? ["Survival", "Creative", "Adventure"]
      : (JSON.parse(labelsSource) as FixtureLabels);
  // oxlint-enable typescript/no-unsafe-type-assertion

  const initial = Number(params.get("selectedIndex") ?? 0);

  const [value, setValue] = React.useState(
    initial >= 0 ? `item-${initial}` : ""
  );

  const [changes, setChanges] = React.useState(0);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const itemRef = React.useRef<HTMLDivElement>(null);

  const [refs, setRefs] = React.useState("");
  const [submittedValue, setSubmittedValue] = React.useState("");

  const single = params.get("component") === "select-trigger";
  const capture = params.get("component") === "select-list";

  const content = titles.map((title, index) => (
    <SelectItem
      render={
        params.has("itemAsChild") && index === 0 ? <section /> : undefined
      }
      key={index}
      value={`item-${index}`}
      ref={index === 0 ? itemRef : undefined}
      disabled={
        params.has("disabledIndex") &&
        Number(params.get("disabledIndex")) === index
      }
      onPointerMove={
        capture
          ? (event) => {
              event.preventDefault();
            }
          : undefined
      }
    >
      {title}
    </SelectItem>
  ));

  let selectedFixtureBranch1: ReactNode;

  if (params.has("contentAsChild")) {
    selectedFixtureBranch1 = content;
  } else {
    selectedFixtureBranch1 = params.has("group") ? (
      <SelectGroup>
        <SelectLabel>Game modes</SelectLabel>
        {content}
        <SelectSeparator />
      </SelectGroup>
    ) : (
      content
    );
  }

  const controls = (
    <>
      <Select
        items={titles.map((optionLabel, index) => ({
          label: optionLabel,
          value: `item-${index}`,
        }))}
        name={params.has("form") ? "mode" : undefined}
        required={params.has("required")}
        scale={scale}
        onOpenChange={(next, details) => {
          if (
            (next && params.has("cancelOpen")) ||
            (!next && params.has("cancelClose"))
          ) {
            details.cancel();
          }
        }}
        defaultOpen={capture || params.has("open")}
        value={params.has("controlled") ? value : undefined}
        defaultValue={initial >= 0 ? `item-${initial}` : ""}
        onValueChange={(next) => {
          if (!params.has("reject")) {
            setValue(next ?? "");
          }

          setChanges((current) => current + 1);
        }}
        disabled={
          params.has("disabled") || (single && state.startsWith("disabled"))
        }
      >
        <SelectTrigger
          render={
            params.has("triggerAsChild") ? (
              // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- SelectTrigger supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
              <button type="button" />
            ) : undefined
          }
          id={single ? "subject" : "select-trigger"}
          aria-label="Game mode"
          ref={triggerRef}
          className="fixture-geometry-width"
          style={{ "--fixture-width": `${width * scale}px` }}
          data-subject={
            (single ? "subject" : "select-trigger") === "subject"
              ? "true"
              : undefined
          }
        >
          <SelectValue
            placeholder={params.get("placeholder") ?? "Choose game mode"}
          >
            {single ? (params.get("label") ?? "Survival") : undefined}
          </SelectValue>
        </SelectTrigger>
        {!single && (
          <SelectContent
            render={params.has("contentAsChild") ? <section /> : undefined}
            id={capture ? "subject" : "select-popup"}
            ref={contentRef}
            alignItemWithTrigger={
              (capture || params.has("popper") ? "popper" : "item-aligned") ===
              "item-aligned"
            }
            collisionAvoidance={
              capture ? { align: "none", side: "none" } : undefined
            }
            className={cn({
              "fixture-geometry-height fixture-geometry-width": capture,
            })}
            style={
              capture
                ? {
                    "--fixture-height": `${Number(params.get("height")) * scale}px`,
                    "--fixture-width": `${width * scale}px`,
                  }
                : undefined
            }
            data-subject={
              (capture ? "subject" : "select-popup") === "subject"
                ? "true"
                : undefined
            }
          >
            {selectedFixtureBranch1}
          </SelectContent>
        )}
      </Select>
      <button
        type="submit"
        id="select-external"
        onClick={() => {
          setValue(`item-${titles.length - 1}`);
        }}
      >
        Select externally
      </button>
      <button
        type="submit"
        id="read-select-refs"
        onClick={() => {
          setRefs(
            `${triggerRef.current?.tagName}/${contentRef.current?.tagName}/${itemRef.current?.tagName}`
          );
        }}
      >
        Read refs
      </button>
      <output aria-label="Selected game mode">{value}</output>
      <output aria-label="Select changes">{changes}</output>
      <output aria-label="Select refs">{refs}</output>
    </>
  );

  return params.has("form") ? (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSubmittedValue(
          // SAFETY: this owned form's mode controls are RadioGroup/Select/Switch string-value inputs; there are no file controls named mode. An unsuccessful/absent control remains null, and the existing missing fallback stays unchanged. Its result is already a string, so no coercion is needed.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact named form-control producer boundary; no runtime check or changed read.
          (new FormData(event.currentTarget).get("mode") as string | null) ??
            "missing"
        );
      }}
    >
      {controls}
      <button type="submit">Save mode</button>
      <output aria-label="Submitted mode">{submittedValue}</output>
    </form>
  ) : (
    controls
  );
};

const RadioFixture = () => {
  const single = params.get("component") === "radio-group-item";

  let selectedInitial: string;

  if (single) {
    selectedInitial = params.get("checked") === "true" ? "subject" : "other";
  } else if (params.has("none")) {
    selectedInitial = "";
  } else {
    selectedInitial = params.get("value") ?? "survival";
  }

  const initial = selectedInitial;

  const [value, setValue] = React.useState(initial);
  const [changes, setChanges] = React.useState(0);
  const [events, setEvents] = React.useState(0);
  const [result, setResult] = React.useState("");

  const rootRef = React.useRef<HTMLDivElement>(null);
  const itemRef = React.useRef<HTMLButtonElement>(null);

  const [refs, setRefs] = React.useState("");

  const names = single
    ? ["subject"]
    : ["survival", "creative", "adventure", "spectator"];

  const items = names.map((name, index) => {
    let selectedFixtureBranch2: ReactNode;

    if (params.has("itemAsChild")) {
      selectedFixtureBranch2 = params.has("anchor") ? (
        // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- RadioGroupItem supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
        <a href="#radio" />
      ) : (
        // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- RadioGroupItem supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
        <button type="submit" />
      );
    } else {
      selectedFixtureBranch2 = undefined;
    }

    return (
      <div
        key={name}
        style={{ "--fixture-layout-7": `${4 * scale}px` }}
        className="fixture-owner-layout-12 fixture-owner-layout-13 fixture-owner-layout-14"
      >
        <RadioGroupItem
          render={selectedFixtureBranch2}
          id={single ? "subject" : `radio-${name}`}
          ref={index === 0 ? itemRef : undefined}
          value={name}
          aria-label={name}
          disabled={
            single
              ? state === "disabled"
              : index === Number(params.get("disabledIndex") ?? -1)
          }
          onClick={(event) => {
            setEvents((current) => current + 1);

            if (params.has("prevent")) {
              event.preventDefault();
              event.preventBaseUIHandler();
            }
          }}
          data-subject={
            (single ? "subject" : `radio-${name}`) === "subject"
              ? "true"
              : undefined
          }
        >
          {undefined}
        </RadioGroupItem>
        {!single && (
          <Label scale={scale} htmlFor={`radio-${name}`}>
            {name[0].toUpperCase() + name.slice(1)}
          </Label>
        )}
      </div>
    );
  });

  const group = (
    <RadioGroup
      render={params.has("rootAsChild") ? <fieldset /> : undefined}
      ref={rootRef}
      aria-label="Game modes"
      scale={scale}
      disabled={params.has("rootDisabled")}
      defaultValue={initial}
      value={params.has("controlled") ? value : undefined}
      onValueChange={(next) => {
        if (!params.has("reject")) {
          setValue(next ?? "");
        }

        setChanges((current) => current + 1);
      }}
      name={params.has("form") ? "mode" : undefined}
      required={params.has("required")}
      dir={params.get("dir") === "rtl" ? "rtl" : "ltr"}
    >
      {items}
    </RadioGroup>
  );

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setResult(
            // SAFETY: this owned form's mode controls are RadioGroup/Select/Switch string-value inputs; there are no file controls named mode. An unsuccessful/absent control remains null, and the existing missing fallback stays unchanged. Its result is already a string, so no coercion is needed.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact named form-control producer boundary; no runtime check or changed read.
            (new FormData(event.currentTarget).get("mode") as string | null) ??
              "missing"
          );
        }}
      >
        {group}
        {params.has("form") && <button type="submit">Save mode</button>}
      </form>
      <button
        type="button"
        id="radio-external"
        onClick={() => {
          setValue("adventure");
        }}
      >
        Choose externally
      </button>
      <button
        type="button"
        id="radio-read-refs"
        onClick={() => {
          setRefs(`${rootRef.current?.tagName}/${itemRef.current?.tagName}`);
        }}
      >
        Read refs
      </button>
      <output aria-label="Radio value">{value}</output>
      <output aria-label="Radio changes">{changes}</output>
      <output aria-label="Radio events">{events}</output>
      <output aria-label="Radio refs">{refs}</output>
      <output aria-label="Submitted radio">{result}</output>
    </>
  );
};

const SwitchFixture = () => {
  const [checked, setChecked] = React.useState(
    params.get("checked") === "true"
  );

  const [changes, setChanges] = React.useState(0);
  const [events, setEvents] = React.useState(0);
  const [result, setResult] = React.useState("");

  const ref = React.useRef<HTMLButtonElement>(null);
  const [tag, setTag] = React.useState("");

  let selectedFixtureBranch3: ReactNode;

  if (params.has("asChild")) {
    selectedFixtureBranch3 = params.has("anchor") ? (
      // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- Switch supplies its actual name through explicit aria-labelledby when labelled and aria-label otherwise; keep this receiver empty to verify real forwarding.
      <a href="#switch" />
    ) : (
      // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- Switch supplies its actual name through explicit aria-labelledby when labelled and aria-label otherwise; keep this receiver empty to verify real forwarding.
      <button type="submit" />
    );
  } else {
    selectedFixtureBranch3 = undefined;
  }

  const control = (
    <Switch
      render={selectedFixtureBranch3}
      id="subject"
      ref={ref}
      scale={scale}
      size={
        // SAFETY: owned fixture callers serialize the size option from the actual component protocol ("default" | undefined); preserve this URL read, original default and component handling.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
        (params.get("size") ?? undefined) as "default" | undefined
      }
      checked={params.has("controlled") ? checked : undefined}
      defaultChecked={params.get("checked") === "true"}
      disabled={state === "disabled"}
      onCheckedChange={(next) => {
        if (!params.has("reject")) {
          setChecked(next);
        }

        setChanges((current) => current + 1);
      }}
      name={params.has("form") ? "mode" : undefined}
      value={params.get("formValue") ?? "enabled"}
      required={params.has("required")}
      aria-label={params.has("labelled") ? undefined : "Test switch"}
      aria-labelledby={
        params.has("labelled") ? "switch-setting-label" : undefined
      }
      style={params.has("width") ? { width: width * scale } : undefined}
      onClick={(event) => {
        setEvents((current) => current + 1);

        if (params.has("prevent")) {
          event.preventDefault();
          event.preventBaseUIHandler();
        }
      }}
      data-subject="true"
    >
      {undefined}
    </Switch>
  );

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setResult(
            // SAFETY: this owned form's mode controls are RadioGroup/Select/Switch string-value inputs; there are no file controls named mode. An unsuccessful/absent control remains null, and the existing missing fallback stays unchanged. Its result is already a string, so no coercion is needed.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact named form-control producer boundary; no runtime check or changed read.
            (new FormData(event.currentTarget).get("mode") as string | null) ??
              "missing"
          );
        }}
      >
        {params.has("labelled") && (
          <Label id="switch-setting-label" scale={scale} htmlFor="subject">
            Switch setting
          </Label>
        )}
        {control}
        {params.has("form") && <button type="submit">Save switch</button>}
      </form>
      <button
        type="button"
        id="switch-external"
        onClick={() => {
          setChecked((current) => !current);
        }}
      >
        Change externally
      </button>
      <button
        type="button"
        id="switch-read-ref"
        onClick={() => {
          setTag(ref.current?.tagName ?? "missing");
        }}
      >
        Read ref
      </button>
      <output aria-label="Switch value">{String(checked)}</output>
      <output aria-label="Switch changes">{changes}</output>
      <output aria-label="Switch events">{events}</output>
      <output aria-label="Switch ref">{tag}</output>
      <output aria-label="Submitted switch">{result}</output>
    </>
  );
};

const ContextFixture = () => {
  const native = params.has("native");

  const [open, setOpen] = React.useState(params.has("open"));

  const [, setMenuValue] = React.useState(params.has("open") ? "game" : "");

  const [actions, setActions] = React.useState(0);
  const [checked, setChecked] = React.useState(false);
  const [radio, setRadio] = React.useState("world");
  const [tags, setTags] = React.useState("");

  const content = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLDivElement>(null);

  // SAFETY: owned ContextMenu items callers serialize string label arrays; preserve this branch's existing parameter/default read.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact ContextMenu items query-label producer boundary.
  const labels: string[] = JSON.parse(
    params.get("labels") ?? '["Game","World","More >"]'
  ) as FixtureLabels;

  const part = params.get("part");
  const nativeLabel = params.get("label") ?? "World Settings";
  const nativeDisabled = (params.get("state") ?? "").startsWith("disabled");
  const nativeChecked = params.get("checked") === "true";

  const choose = (event: {
    preventDefault: () => void;
    preventBaseUIHandler?: () => void;
  }) => {
    setActions((n) => n + 1);

    if (params.has("preventAction")) {
      event.preventDefault();
      event.preventBaseUIHandler?.();
    }
  };

  let selectedNativeBody: React.JSX.Element | React.JSX.Element[];

  if (part === "menu-checkbox") {
    selectedNativeBody = (
      <ContextMenuCheckboxItem
        checked={nativeChecked}
        disabled={nativeDisabled}
      >
        {nativeLabel}
      </ContextMenuCheckboxItem>
    );
  } else if (part === "menu-radio") {
    selectedNativeBody = (
      <ContextMenuRadioGroup value={nativeChecked ? "on" : "off"}>
        <ContextMenuRadioItem value="on" disabled={nativeDisabled}>
          {nativeLabel}
        </ContextMenuRadioItem>
      </ContextMenuRadioGroup>
    );
  } else if (part === "menu-label" || part === "menu-label-inset") {
    selectedNativeBody = (
      <ContextMenuGroup>
        <ContextMenuLabel inset={part === "menu-label-inset"}>
          {nativeLabel}
        </ContextMenuLabel>
      </ContextMenuGroup>
    );
  } else if (part === "menu-separator") {
    selectedNativeBody = <ContextMenuSeparator />;
  } else if (part === "menu-sub-trigger") {
    selectedNativeBody = (
      <ContextMenuSub>
        <ContextMenuSubTrigger>{nativeLabel}</ContextMenuSubTrigger>
      </ContextMenuSub>
    );
  } else if (part === "menu-disabled") {
    selectedNativeBody = (
      <ContextMenuItem disabled>{nativeLabel}</ContextMenuItem>
    );
  } else {
    selectedNativeBody = labels.map((contextItemLabel, index) => (
      <ContextMenuItem key={index} data-native-index={index}>
        {contextItemLabel}
      </ContextMenuItem>
    ));
  }

  const nativeBody = selectedNativeBody;

  const handleOpen = (
    next: boolean,
    details: { reason: string; cancel: () => void }
  ) => {
    if (
      params.has("reject") ||
      params.has("disabled") ||
      (!next &&
        ((details.reason === "escape-key" && params.has("preventEscape")) ||
          ((details.reason === "outside-press" ||
            details.reason === "focus-out" ||
            details.reason === "cancel-open") &&
            params.has("preventOutside"))))
    ) {
      details.cancel();

      return;
    }

    setOpen(next);
    setMenuValue(next ? "game" : "");
  };

  const rows = (
    <>
      <ContextMenuGroup>
        <ContextMenuLabel>World Settings</ContextMenuLabel>
        <ContextMenuItem onClick={choose}>
          Resume game<ContextMenuShortcut>Esc</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled onClick={choose}>
          Unavailable
        </ContextMenuItem>
        <ContextMenuItem onClick={choose}>你好，世界</ContextMenuItem>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuCheckboxItem
        checked={checked}
        disabled={params.has("disabledCheck")}
        onCheckedChange={setChecked}
        closeOnClick={false}
      >
        Show coordinates
      </ContextMenuCheckboxItem>
      <ContextMenuRadioGroup value={radio} onValueChange={setRadio}>
        <ContextMenuRadioItem value="world" closeOnClick={false}>
          World
        </ContextMenuRadioItem>
        <ContextMenuRadioItem value="game" closeOnClick={false}>
          Game
        </ContextMenuRadioItem>
      </ContextMenuRadioGroup>
      <ContextMenuSub>
        <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
        <ContextMenuPortal>
          <ContextMenuSubContent side="right">
            <ContextMenuItem onClick={choose}>Video settings</ContextMenuItem>
            <ContextMenuItem onClick={choose}>Audio settings</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuPortal>
      </ContextMenuSub>
    </>
  );

  let selectedFixtureBranch4: ReactNode;

  if (params.has("contentAsChild")) {
    selectedFixtureBranch4 = (
      <ContextMenuItem
        render={
          // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- ContextMenuItem supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
          <a href="#menu-composed" />
        }
        onClick={choose}
      >
        Composed action
      </ContextMenuItem>
    );
  } else {
    selectedFixtureBranch4 = native ? nativeBody : rows;
  }

  let popupNativeHeight: string | undefined;
  let popupNativeWidth: string | undefined;
  let popupMaximumHeight: number | undefined;

  if (native) {
    popupNativeHeight = `${Number(params.get("height")) * scale}px`;
    popupNativeWidth = `${Number(params.get("width")) * scale}px`;
  } else if (params.has("maxHeight")) {
    popupMaximumHeight = Number(params.get("maxHeight"));
  }

  const popup = (
    <ContextMenuContent
      render={params.has("contentAsChild") ? <section /> : undefined}
      id="subject"
      data-subject="true"
      ref={content}
      side={
        // SAFETY: owned fixture callers serialize the side option from the actual component protocol ("top" | "right" | "bottom" | "left"); preserve this URL read, original default and component handling.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
        (params.get("side") ?? "right") as "top" | "right" | "bottom" | "left"
      }
      align={
        // SAFETY: owned fixture callers serialize the align option from the actual component protocol ("start" | "center" | "end"); preserve this URL read, original default and component handling.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
        (params.get("align") ?? "start") as "start" | "center" | "end"
      }
      sideOffset={native ? 0 : 4}
      surface={
        params.get("surface") === "suggestions" ? "suggestions" : "popup"
      }
      className={cn({
        "fixture-geometry-height fixture-geometry-width": native,
      })}
      style={{
        "--fixture-height": popupNativeHeight,
        "--fixture-width": popupNativeWidth,
        maxHeight: popupMaximumHeight,
      }}
    >
      {selectedFixtureBranch4}
    </ContextMenuContent>
  );

  return (
    <>
      <ContextMenu
        scale={scale}
        open={params.has("controlled") ? open : undefined}
        onOpenChange={handleOpen}
      >
        <ContextMenuTrigger
          render={
            params.has("triggerAsChild") ? (
              // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- ContextMenuTrigger supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
              <button type="button" />
            ) : undefined
          }
          id="context-hit"
          ref={trigger}
          className={
            native ? "fixture-context-native-hit" : "fixture-context-web-hit"
          }
          onContextMenu={
            params.has("preventTrigger")
              ? (event) => {
                  event.preventDefault();
                  event.preventBaseUIHandler();
                }
              : undefined
          }
        >
          Right click here
        </ContextMenuTrigger>
        {popup}
      </ContextMenu>
      <button
        type="button"
        id="context-outside"
        className="fixture-corner-control"
        onClick={() => {
          setTags(
            [trigger.current?.tagName, content.current?.tagName].join(",")
          );
        }}
      >
        Inspect menu refs
      </button>
      <output aria-label="Menu actions">{actions}</output>
      <output aria-label="Menu checked">{String(checked)}</output>
      <output aria-label="Menu radio">{radio}</output>
      <output aria-label="Menu refs">{tags}</output>
    </>
  );
};

const CollapsibleFixture = () => {
  const native = params.has("native");
  const body = params.get("part") === "body";
  const [open, setOpen] = React.useState(params.has("open"));
  const [changes, setChanges] = React.useState(0);
  const [refs, setRefs] = React.useState("");

  const root = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const content = React.useRef<HTMLDivElement>(null);

  let selectedFixtureBranch5: ReactNode;

  if (params.has("asChild")) {
    selectedFixtureBranch5 = "World details";
  } else {
    selectedFixtureBranch5 = native
      ? (params.get("label") ?? "Button")
      : "World details";
  }

  let selectedFixtureBranch6: ReactNode;

  if (params.has("contentAsChild")) {
    selectedFixtureBranch6 = (
      <button
        type="button"
        onClick={() => {
          setChanges((n) => n + 1);
        }}
      >
        Inside action
      </button>
    );
  } else if (native) {
    selectedFixtureBranch6 = params.get("text") ?? "";
  } else {
    selectedFixtureBranch6 = params.has("rich") ? (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setChanges((n) => n + 1);
        }}
      >
        <input
          aria-label="World name"
          spellCheck={false}
          autoCorrect="off"
          defaultValue="Minecraft"
        />
        <Button type="submit">Save world</Button>
      </form>
    ) : (
      "\u4F60\u597D\uFF0C\u4E16\u754C\nHello Minecraft"
    );
  }

  const child = (
    <>
      <CollapsibleTrigger
        render={
          params.has("asChild") ? (
            // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- CollapsibleTrigger supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
            <button type="button" />
          ) : undefined
        }
        ref={trigger}
        {...(native && !body ? { "data-subject": "true", id: "subject" } : {})}
        {...(native && !body && params.get("state") === "disabled"
          ? { disabled: true }
          : {})}
        className={cn({
          "fixture-native-collapse-hidden-trigger": native && body,
        })}
        onClick={
          params.has("prevent")
            ? (event) => {
                event.preventDefault();
                event.preventBaseUIHandler();
              }
            : undefined
        }
      >
        {selectedFixtureBranch5}
      </CollapsibleTrigger>
      <CollapsibleContent
        render={params.has("contentAsChild") ? <section /> : undefined}
        ref={content}
        {...(native && body ? { "data-subject": "true", id: "subject" } : {})}
        wrap={!native}
        align={params.get("align") === "center" ? "center" : "left"}
        maxWidth={
          params.has("wrapWidth") ? Number(params.get("wrapWidth")) : undefined
        }
        keepMounted={params.has("forceMount") ? true : undefined}
        className={cn({
          "fixture-geometry-height fixture-geometry-x fixture-placement-fixed fixture-geometry-y fixture-native-collapse-padding":
            native && body,
        })}
        style={
          native && body
            ? {
                "--fixture-height": `${Number(params.get("height")) * scale}px`,
                "--fixture-x": `${Number(params.get("x") ?? 16) * scale}px`,
                "--fixture-y": `${Number(params.get("y") ?? 16) * scale}px`,
                width: Number(params.get("width")) * scale,
              }
            : undefined
        }
      >
        {selectedFixtureBranch6}
      </CollapsibleContent>
    </>
  );

  let selectedFixtureBranch7: ReactNode;

  if (native) {
    selectedFixtureBranch7 = body || params.has("expanded");
  } else {
    selectedFixtureBranch7 = params.has("controlled") ? open : undefined;
  }

  return (
    <>
      <Collapsible
        render={params.has("rootAsChild") ? <article /> : undefined}
        ref={root}
        scale={scale}
        open={selectedFixtureBranch7}
        defaultOpen={params.has("open")}
        disabled={params.has("disabled")}
        onOpenChange={(next) => {
          setChanges((n) => n + 1);

          if (!params.has("reject")) {
            setOpen(next);
          }
        }}
        className={cn({ "fixture-native-collapse-root": native })}
        style={
          native
            ? {
                "--fixture-collapse-left": `${Number(params.get("x") ?? 16) * scale}px`,
                "--fixture-collapse-top": `${Number(params.get("y") ?? 16) * scale}px`,
                "--fixture-collapse-width": `${Number(params.get("width") ?? 200) * scale}px`,
              }
            : undefined
        }
      >
        {child}
      </Collapsible>
      <button
        type="button"
        id="collapsible-refs"
        className="fixture-corner-control"
        onClick={() => {
          setRefs(
            [
              root.current?.tagName,
              trigger.current?.tagName,
              content.current?.tagName,
            ].join(",")
          );
        }}
      >
        Read collapsible refs
      </button>
      <button
        type="button"
        id="collapsible-external"
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        Change externally
      </button>
      <output aria-label="Collapsible changes">{changes}</output>
      <output aria-label="Collapsible refs">{refs}</output>
      <output aria-label="Collapsible value">{String(open)}</output>
    </>
  );
};

const MenubarFixture = () => {
  const native = params.has("native");
  const triggerPixels = params.has("triggerPixels");

  const triggerLabel = triggerPixels
    ? (params.get("label") ?? "Button")
    : "Game menu";

  const [, setOpen] = React.useState(params.has("open"));

  const [menuValue, setMenuValue] = React.useState(
    params.has("open") ? "game" : ""
  );

  const [actions, setActions] = React.useState(0);
  const [checked, setChecked] = React.useState(false);
  const [radio, setRadio] = React.useState("world");
  const [tags, setTags] = React.useState("");

  const content = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // SAFETY: owned Menubar items callers serialize string label arrays; preserve this branch's existing parameter/default read.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact Menubar items query-label producer boundary.
  const labels: string[] = JSON.parse(
    params.get("labels") ?? '["Game","World","More >"]'
  ) as FixtureLabels;

  const part = params.get("part");
  const nativeLabel = params.get("label") ?? "World Settings";
  const nativeDisabled = (params.get("state") ?? "").startsWith("disabled");
  const nativeChecked = params.get("checked") === "true";

  const choose = (event: {
    preventDefault: () => void;
    preventBaseUIHandler?: () => void;
  }) => {
    setActions((n) => n + 1);

    if (params.has("preventAction")) {
      event.preventDefault();
      event.preventBaseUIHandler?.();
    }
  };

  let selectedNativeBody: React.JSX.Element | React.JSX.Element[];

  if (part === "menu-checkbox") {
    selectedNativeBody = (
      <MenubarCheckboxItem checked={nativeChecked} disabled={nativeDisabled}>
        {nativeLabel}
      </MenubarCheckboxItem>
    );
  } else if (part === "menu-radio") {
    selectedNativeBody = (
      <MenubarRadioGroup value={nativeChecked ? "on" : "off"}>
        <MenubarRadioItem value="on" disabled={nativeDisabled}>
          {nativeLabel}
        </MenubarRadioItem>
      </MenubarRadioGroup>
    );
  } else if (part === "menu-label" || part === "menu-label-inset") {
    selectedNativeBody = (
      <MenubarGroup>
        <MenubarLabel inset={part === "menu-label-inset"}>
          {nativeLabel}
        </MenubarLabel>
      </MenubarGroup>
    );
  } else if (part === "menu-separator") {
    selectedNativeBody = <MenubarSeparator />;
  } else if (part === "menu-sub-trigger") {
    selectedNativeBody = (
      <MenubarSub>
        <MenubarSubTrigger>{nativeLabel}</MenubarSubTrigger>
      </MenubarSub>
    );
  } else if (part === "menu-disabled") {
    selectedNativeBody = <MenubarItem disabled>{nativeLabel}</MenubarItem>;
  } else {
    selectedNativeBody = labels.map((menubarItemLabel, index) => (
      <MenubarItem key={index} data-native-index={index}>
        {menubarItemLabel}
      </MenubarItem>
    ));
  }

  const nativeBody = selectedNativeBody;

  const handleOpen = (
    next: boolean,
    details: { reason: string; cancel: () => void }
  ) => {
    if (
      params.has("reject") ||
      params.has("disabled") ||
      (!next &&
        ((details.reason === "escape-key" && params.has("preventEscape")) ||
          ((details.reason === "outside-press" ||
            details.reason === "focus-out" ||
            details.reason === "cancel-open") &&
            params.has("preventOutside"))))
    ) {
      details.cancel();

      return;
    }

    setOpen(next);
    setMenuValue(next ? "game" : "");
  };

  const rows = (
    <>
      <MenubarGroup>
        <MenubarLabel>World Settings</MenubarLabel>
        <MenubarItem onClick={choose}>
          Resume game<MenubarShortcut>Esc</MenubarShortcut>
        </MenubarItem>
        <MenubarItem disabled onClick={choose}>
          Unavailable
        </MenubarItem>
        <MenubarItem onClick={choose}>你好，世界</MenubarItem>
      </MenubarGroup>
      <MenubarSeparator />
      <MenubarCheckboxItem
        checked={checked}
        disabled={params.has("disabledCheck")}
        onCheckedChange={setChecked}
        closeOnClick={false}
      >
        Show coordinates
      </MenubarCheckboxItem>
      <MenubarRadioGroup value={radio} onValueChange={setRadio}>
        <MenubarRadioItem value="world" closeOnClick={false}>
          World
        </MenubarRadioItem>
        <MenubarRadioItem value="game" closeOnClick={false}>
          Game
        </MenubarRadioItem>
      </MenubarRadioGroup>
      <MenubarSub>
        <MenubarSubTrigger>More</MenubarSubTrigger>
        <MenubarPortal>
          <MenubarSubContent side="right">
            <MenubarItem onClick={choose}>Video settings</MenubarItem>
            <MenubarItem onClick={choose}>Audio settings</MenubarItem>
          </MenubarSubContent>
        </MenubarPortal>
      </MenubarSub>
    </>
  );

  let selectedFixtureBranch8: ReactNode;

  if (params.has("contentAsChild")) {
    selectedFixtureBranch8 = (
      <MenubarItem
        render={
          // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- MenubarItem supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
          <a href="#menu-composed" />
        }
        onClick={choose}
      >
        Composed action
      </MenubarItem>
    );
  } else {
    selectedFixtureBranch8 = native ? nativeBody : rows;
  }

  let popupNativeHeight: string | undefined;
  let popupNativeWidth: string | undefined;
  let popupMaximumHeight: number | undefined;

  if (native) {
    popupNativeHeight = `${Number(params.get("height")) * scale}px`;
    popupNativeWidth = `${Number(params.get("width")) * scale}px`;
  } else if (params.has("maxHeight")) {
    popupMaximumHeight = Number(params.get("maxHeight"));
  }

  const popup = (
    <MenubarContent
      render={params.has("contentAsChild") ? <section /> : undefined}
      id="subject"
      data-subject="true"
      ref={content}
      side={
        // SAFETY: owned fixture callers serialize the side option from the actual component protocol ("top" | "right" | "bottom" | "left"); preserve this URL read, original default and component handling.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
        (params.get("side") ?? "bottom") as "top" | "right" | "bottom" | "left"
      }
      align={
        // SAFETY: owned fixture callers serialize the align option from the actual component protocol (| "start" | "center" | "end"); preserve this URL read, original default and component handling.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
        (params.get("align") ?? (native ? "start" : "center")) as
          | "start"
          | "center"
          | "end"
      }
      sideOffset={native ? 0 : 4}
      surface={
        params.get("surface") === "suggestions" ? "suggestions" : "popup"
      }
      className={cn({
        "fixture-geometry-height fixture-geometry-width": native,
      })}
      style={{
        "--fixture-height": popupNativeHeight,
        "--fixture-width": popupNativeWidth,
        maxHeight: popupMaximumHeight,
      }}
    >
      {selectedFixtureBranch8}
    </MenubarContent>
  );

  const nativeTriggerPositioned =
    triggerPixels && (!native || params.has("nativeButtonChild"));

  let selectedFixtureBranch9: ReactNode;

  if (native || (triggerPixels && params.has("open"))) {
    selectedFixtureBranch9 = true;
  } else {
    selectedFixtureBranch9 = params.has("controlled")
      ? menuValue === "game"
      : undefined;
  }

  let selectedFixtureBranch10: ReactNode;

  if (params.has("nativeButtonChild")) {
    selectedFixtureBranch10 = <Button scale={scale} />;
  } else {
    selectedFixtureBranch10 =
      native || params.has("triggerAsChild") ? (
        <button
          type="button"
          aria-label={fixtureFallbackLabel("Game menu", triggerLabel)}
          className={native ? "fixture-native-anchor" : undefined}
          style={
            native
              ? {
                  "--fixture-anchor-x": `${Number(params.get("x")) * scale}px`,
                  "--fixture-anchor-y": `${Number(params.get("y")) * scale}px`,
                }
              : undefined
          }
        />
      ) : undefined;
  }

  return (
    <>
      <Menubar ref={rootRef} scale={scale}>
        <MenubarMenu
          open={selectedFixtureBranch9}
          defaultOpen={params.has("open")}
          onOpenChange={handleOpen}
        >
          <MenubarTrigger
            render={selectedFixtureBranch10}
            ref={trigger}
            disabled={
              params.has("disabled") ||
              (triggerPixels && params.get("state") === "disabled")
            }
            className={cn({
              "fixture-native-menu-trigger": nativeTriggerPositioned,
            })}
            style={
              nativeTriggerPositioned
                ? {
                    "--fixture-trigger-left": `${Number(params.get("x") ?? 16) * scale}px`,
                    "--fixture-trigger-top": `${Number(params.get("y") ?? 16) * scale}px`,
                    "--fixture-trigger-width": `${Number(params.get("width") ?? 200) * scale}px`,
                  }
                : undefined
            }
          >
            {triggerLabel}
          </MenubarTrigger>

          {popup}
        </MenubarMenu>
        {!native && !triggerPixels && (
          <>
            <MenubarMenu>
              <MenubarTrigger>World menu</MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={choose}>Create world</MenubarItem>
                <MenubarItem onClick={choose}>Load world</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger disabled>Unavailable menu</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>Unavailable</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </>
        )}
      </Menubar>
      <button
        type="button"
        id="menubar-outside"
        className="fixture-corner-control"
        onClick={() => {
          setTags(
            [
              rootRef.current?.tagName,
              trigger.current?.tagName,
              content.current?.tagName,
            ].join(",")
          );
        }}
      >
        Inspect menu refs
      </button>
      <output aria-label="Menu actions">{actions}</output>
      <output aria-label="Menu checked">{String(checked)}</output>
      <output aria-label="Menu radio">{radio}</output>
      <output aria-label="Menu refs">{tags}</output>
    </>
  );
};

const DropdownFixture = () => {
  const native = params.has("native");
  const triggerPixels = params.has("triggerPixels");

  const triggerLabel = triggerPixels
    ? (params.get("label") ?? "Button")
    : "Game menu";

  const [open, setOpen] = React.useState(params.has("open"));

  const [, setMenuValue] = React.useState(params.has("open") ? "game" : "");

  const [actions, setActions] = React.useState(0);
  const [checked, setChecked] = React.useState(false);
  const [radio, setRadio] = React.useState("world");
  const [tags, setTags] = React.useState("");

  const content = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);

  // SAFETY: owned DropdownMenu items callers serialize string label arrays; preserve this branch's existing parameter/default read.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact DropdownMenu items query-label producer boundary.
  const labels: string[] = JSON.parse(
    params.get("labels") ?? '["Game","World","More >"]'
  ) as FixtureLabels;

  const part = params.get("part");
  const nativeLabel = params.get("label") ?? "World Settings";
  const nativeDisabled = (params.get("state") ?? "").startsWith("disabled");
  const nativeChecked = params.get("checked") === "true";

  const choose = (event: {
    preventDefault: () => void;
    preventBaseUIHandler?: () => void;
  }) => {
    setActions((n) => n + 1);

    if (params.has("preventAction")) {
      event.preventDefault();
      event.preventBaseUIHandler?.();
    }
  };

  let selectedNativeBody: React.JSX.Element | React.JSX.Element[];

  if (part === "menu-checkbox") {
    selectedNativeBody = (
      <DropdownMenuCheckboxItem
        checked={nativeChecked}
        disabled={nativeDisabled}
      >
        {nativeLabel}
      </DropdownMenuCheckboxItem>
    );
  } else if (part === "menu-radio") {
    selectedNativeBody = (
      <DropdownMenuRadioGroup value={nativeChecked ? "on" : "off"}>
        <DropdownMenuRadioItem value="on" disabled={nativeDisabled}>
          {nativeLabel}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    );
  } else if (part === "menu-label" || part === "menu-label-inset") {
    selectedNativeBody = (
      <DropdownMenuGroup>
        <DropdownMenuLabel inset={part === "menu-label-inset"}>
          {nativeLabel}
        </DropdownMenuLabel>
      </DropdownMenuGroup>
    );
  } else if (part === "menu-separator") {
    selectedNativeBody = <DropdownMenuSeparator />;
  } else if (part === "menu-sub-trigger") {
    selectedNativeBody = (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>{nativeLabel}</DropdownMenuSubTrigger>
      </DropdownMenuSub>
    );
  } else if (part === "menu-disabled") {
    selectedNativeBody = (
      <DropdownMenuItem disabled>{nativeLabel}</DropdownMenuItem>
    );
  } else {
    selectedNativeBody = labels.map((dropdownItemLabel, index) => (
      <DropdownMenuItem key={index} data-native-index={index}>
        {dropdownItemLabel}
      </DropdownMenuItem>
    ));
  }

  const nativeBody = selectedNativeBody;

  const handleOpen = (
    next: boolean,
    details: { reason: string; cancel: () => void }
  ) => {
    if (
      params.has("reject") ||
      params.has("disabled") ||
      (!next &&
        ((details.reason === "escape-key" && params.has("preventEscape")) ||
          ((details.reason === "outside-press" ||
            details.reason === "focus-out" ||
            details.reason === "cancel-open") &&
            params.has("preventOutside"))))
    ) {
      details.cancel();

      return;
    }

    setOpen(next);
    setMenuValue(next ? "game" : "");
  };

  const rows = (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel>World Settings</DropdownMenuLabel>
        <DropdownMenuItem onClick={choose}>
          Resume game<DropdownMenuShortcut>Esc</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem disabled onClick={choose}>
          Unavailable
        </DropdownMenuItem>
        <DropdownMenuItem onClick={choose}>你好，世界</DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem
        checked={checked}
        disabled={params.has("disabledCheck")}
        onCheckedChange={setChecked}
        closeOnClick={false}
      >
        Show coordinates
      </DropdownMenuCheckboxItem>
      <DropdownMenuRadioGroup value={radio} onValueChange={setRadio}>
        <DropdownMenuRadioItem value="world" closeOnClick={false}>
          World
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="game" closeOnClick={false}>
          Game
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent side="right">
            <DropdownMenuItem onClick={choose}>Video settings</DropdownMenuItem>
            <DropdownMenuItem onClick={choose}>Audio settings</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    </>
  );

  let selectedFixtureBranch11: ReactNode;

  if (params.has("contentAsChild")) {
    selectedFixtureBranch11 = (
      <DropdownMenuItem
        render={
          // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- DropdownMenuItem supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
          <a href="#menu-composed" />
        }
        onClick={choose}
      >
        Composed action
      </DropdownMenuItem>
    );
  } else {
    selectedFixtureBranch11 = native ? nativeBody : rows;
  }

  let popupNativeHeight: string | undefined;
  let popupNativeWidth: string | undefined;
  let popupMaximumHeight: number | undefined;

  if (native) {
    popupNativeHeight = `${Number(params.get("height")) * scale}px`;
    popupNativeWidth = `${Number(params.get("width")) * scale}px`;
  } else if (params.has("maxHeight")) {
    popupMaximumHeight = Number(params.get("maxHeight"));
  }

  const popup = (
    <DropdownMenuContent
      render={params.has("contentAsChild") ? <section /> : undefined}
      id="subject"
      data-subject="true"
      ref={content}
      side={
        // SAFETY: owned fixture callers serialize the side option from the actual component protocol ("top" | "right" | "bottom" | "left"); preserve this URL read, original default and component handling.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
        (params.get("side") ?? "bottom") as "top" | "right" | "bottom" | "left"
      }
      align={
        // SAFETY: owned fixture callers serialize the align option from the actual component protocol (| "start" | "center" | "end"); preserve this URL read, original default and component handling.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
        (params.get("align") ?? (native ? "start" : "center")) as
          | "start"
          | "center"
          | "end"
      }
      sideOffset={native ? 0 : 4}
      surface={
        params.get("surface") === "suggestions" ? "suggestions" : "popup"
      }
      className={cn({
        "fixture-geometry-height fixture-geometry-width": native,
      })}
      style={{
        "--fixture-height": popupNativeHeight,
        "--fixture-width": popupNativeWidth,
        maxHeight: popupMaximumHeight,
      }}
    >
      {selectedFixtureBranch11}
    </DropdownMenuContent>
  );

  const nativeTriggerPositioned =
    triggerPixels && (!native || params.has("nativeButtonChild"));

  let selectedFixtureBranch12: ReactNode;

  if (native) {
    selectedFixtureBranch12 = true;
  } else {
    selectedFixtureBranch12 = params.has("controlled") ? open : undefined;
  }

  let selectedFixtureBranch13: ReactNode;

  if (params.has("nativeButtonChild")) {
    selectedFixtureBranch13 = <Button scale={scale} />;
  } else {
    selectedFixtureBranch13 =
      native || params.has("triggerAsChild") ? (
        <button
          type="button"
          aria-label={fixtureFallbackLabel("Game menu", triggerLabel)}
          className={native ? "fixture-native-anchor" : undefined}
          style={
            native
              ? {
                  "--fixture-anchor-x": `${Number(params.get("x")) * scale}px`,
                  "--fixture-anchor-y": `${Number(params.get("y")) * scale}px`,
                }
              : undefined
          }
        />
      ) : undefined;
  }

  return (
    <>
      <DropdownMenu
        scale={scale}
        open={selectedFixtureBranch12}
        defaultOpen={params.has("open")}
        modal={native || params.has("nonmodal") ? false : undefined}
        onOpenChange={handleOpen}
      >
        <DropdownMenuTrigger
          render={selectedFixtureBranch13}
          ref={trigger}
          disabled={
            params.has("disabled") ||
            (triggerPixels && params.get("state") === "disabled")
          }
          className={cn({
            "fixture-native-menu-trigger": nativeTriggerPositioned,
          })}
          style={
            nativeTriggerPositioned
              ? {
                  "--fixture-trigger-left": `${Number(params.get("x") ?? 16) * scale}px`,
                  "--fixture-trigger-top": `${Number(params.get("y") ?? 16) * scale}px`,
                  "--fixture-trigger-width": `${Number(params.get("width") ?? 200) * scale}px`,
                }
              : undefined
          }
        >
          {triggerLabel}
        </DropdownMenuTrigger>

        {popup}
      </DropdownMenu>
      <button
        type="button"
        id="menu-outside"
        className="fixture-corner-control"
        onClick={() => {
          setTags(
            [trigger.current?.tagName, content.current?.tagName].join(",")
          );
        }}
      >
        Inspect menu refs
      </button>
      <output aria-label="Menu actions">{actions}</output>
      <output aria-label="Menu checked">{String(checked)}</output>
      <output aria-label="Menu radio">{radio}</output>
      <output aria-label="Menu refs">{tags}</output>
    </>
  );
};

const PopoverFixture = () => {
  const native = params.has("native");
  const [open, setOpen] = React.useState(native || params.has("open"));
  const [changes, setChanges] = React.useState(0);
  const [actions, setActions] = React.useState(0);
  const [refs, setRefs] = React.useState("");

  const content = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const anchor = React.useRef<HTMLDivElement>(null);

  return (
    <>
      <Popover
        scale={scale}
        open={params.has("controlled") || native ? open : undefined}
        defaultOpen={params.has("open")}
        modal={params.has("modal")}
        onOpenChange={(next, details) => {
          if (
            !next &&
            ((details.reason === "escape-key" && params.has("preventEscape")) ||
              ((details.reason === "outside-press" ||
                details.reason === "focus-out") &&
                params.has("preventOutside")))
          ) {
            details.cancel();

            return;
          }

          setChanges((n) => n + 1);

          if (!params.has("reject")) {
            setOpen(next);
          }
        }}
      >
        {native && (
          <div
            ref={anchor}
            style={{
              "--fixture-layout-19": `${Number(params.get("x") ?? 16) * scale}px`,
              "--fixture-layout-20": `${Number(params.get("y") ?? 16) * scale}px`,
            }}
            className="fixture-owner-layout-15 fixture-owner-layout-16 fixture-owner-layout-17 fixture-owner-layout-44 fixture-owner-layout-45"
          />
        )}
        <PopoverTrigger ref={trigger} disabled={params.has("disabled")}>
          Open popover
        </PopoverTrigger>
        <PopoverContent
          anchor={native ? anchor : undefined}
          id="subject"
          ref={content}
          aria-label={native ? "Test popover" : undefined}
          side={
            // SAFETY: owned fixture callers serialize the side option from the actual component protocol (| "bottom" | "top" | "left" | "right"); preserve this URL read, original default and component handling.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
            (params.get("side") ?? "bottom") as
              | "bottom"
              | "top"
              | "left"
              | "right"
          }
          align={
            // SAFETY: owned fixture callers serialize the align option from the actual component protocol (| "start" | "center" | "end"); preserve this URL read, original default and component handling.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
            (params.get("align") ?? (native ? "start" : "center")) as
              | "start"
              | "center"
              | "end"
          }
          sideOffset={native ? 0 : Number(params.get("sideOffset") ?? 4)}
          style={{
            height: native ? Number(params.get("height")) * scale : undefined,
            padding: native && !params.has("text") ? 0 : undefined,
            width: native ? Number(params.get("width")) * scale : undefined,
          }}
          initialFocus={native ? () => content.current : undefined}
          data-subject="true"
        >
          {(!native || params.has("text")) && (
            <>
              <PopoverHeader>
                <PopoverTitle>
                  {params.get("label") ?? "World Settings"}
                </PopoverTitle>
                <PopoverDescription>
                  {params.get("text") ?? "Configure the world."}
                </PopoverDescription>
              </PopoverHeader>
              {!native && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setActions((n) => n + 1);
                    setOpen(false);
                  }}
                >
                  <label htmlFor="popover-input">World name</label>
                  <Input
                    id="popover-input"
                    scale={scale}
                    defaultValue="Minecraft"
                    className="fixture-main-full-width"
                  />
                  <Button type="submit" scale={scale}>
                    Save
                  </Button>
                </form>
              )}
              <div
                style={{ "--fixture-layout-8": `${6 * scale}px` }}
                className="fixture-owner-layout-18 fixture-owner-layout-19"
              >
                <PopoverClose
                  className="fixture-owner-layout-20"
                  onClick={() => {
                    setActions((n) => n + 1);
                  }}
                >
                  Done
                </PopoverClose>
              </div>
              {!native && (
                <Button
                  scale={scale}
                  onClick={() => {
                    setRefs(
                      [trigger.current?.tagName, content.current?.tagName].join(
                        ","
                      )
                    );
                  }}
                >
                  Inspect popover refs
                </Button>
              )}
            </>
          )}
        </PopoverContent>
      </Popover>
      <button
        type="button"
        id="popover-outside"
        className="fixture-corner-control"
      >
        Outside
      </button>
      <output aria-label="Popover changes">{changes}</output>
      <output aria-label="Popover actions">{actions}</output>
      <output aria-label="Popover refs">{refs}</output>
    </>
  );
};

const PopoverCompositionFixture = () => {
  const [open, setOpen] = React.useState(false);
  const [actions, setActions] = React.useState(0);
  const [tags, setTags] = React.useState("");

  const trigger = React.useRef<HTMLButtonElement>(null);
  const content = React.useRef<HTMLDivElement>(null);
  const anchor = React.useRef<HTMLDivElement>(null);

  return (
    <>
      <Popover scale={scale} open={open} onOpenChange={setOpen}>
        <div
          ref={anchor}
          id="composed-anchor"
          className="fixture-layout-bulk-1"
        />
        <PopoverTrigger render={<Button scale={scale} />} ref={trigger}>
          Composed trigger
        </PopoverTrigger>
        <PopoverContent
          anchor={anchor}
          render={<section id="composed-popover" />}
          ref={content}
          side="bottom"
          align="start"
          sideOffset={0}
          style={{ "--fixture-layout-9": `${236 * scale}px` }}
          className="fixture-owner-layout-21"
        >
          <>
            <PopoverHeader>
              <PopoverTitle>World Settings</PopoverTitle>
              <PopoverDescription>Configure the world.</PopoverDescription>
            </PopoverHeader>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setActions((n) => n + 1);
                setOpen(false);
              }}
            >
              <label htmlFor="composed-world-name">World name</label>
              <Input id="composed-world-name" scale={scale} />
              <Button type="submit" scale={scale}>
                Save composition
              </Button>
            </form>
            <Button
              scale={scale}
              onClick={() => {
                setTags(
                  [
                    trigger.current?.tagName,
                    content.current?.tagName,
                    anchor.current?.tagName,
                  ].join(",")
                );
              }}
            >
              Inspect composition refs
            </Button>
          </>
        </PopoverContent>
      </Popover>
      <output aria-label="Composition refs">{tags}</output>
      <output aria-label="Composition actions">{actions}</output>
    </>
  );
};

const AlertDialogFixture = () => {
  const native = params.has("native");
  const [open, setOpen] = React.useState(native || params.has("open"));
  const [confirmed, setConfirmed] = React.useState(0);

  const content = React.useRef<HTMLDivElement>(null);

  // SAFETY: owned AlertDialog actions callers serialize string label arrays; preserve this branch's existing parameter/default read.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact AlertDialog actions query-label producer boundary.
  const labels: string[] = JSON.parse(
    params.get("labels") ?? '["Yes","No"]'
  ) as FixtureLabels;

  return (
    <>
      {params.has("patterned") &&
        createPortal(
          <div data-dialog-underlay="true" className="fixture-dialog-underlay">
            <div
              style={{
                "--fixture-layout-10": `${64 * scale}px`,
                "--fixture-layout-11": `${18 * scale}px`,
                "--fixture-layout-12": `${18 * scale}px`,
              }}
              className="fixture-owner-layout-22 fixture-owner-layout-23 fixture-owner-layout-24 fixture-owner-layout-25 fixture-owner-layout-26"
            >
              {Array.from({ length: 256 }, (_, i) => (
                <i
                  key={i}
                  className="fixture-color-bar fixture-dialog-palette"
                  style={{
                    "--fixture-bar-width": `${scale}px`,
                    "--fixture-dialog-palette-step": i,
                  }}
                />
              ))}
            </div>
            <Button
              scale={scale}
              className="fixture-dialog-underlay-button"
              style={{
                "--fixture-width": `${140 * scale}px`,
                "--fixture-x": `${18 * scale}px`,
                "--fixture-y": `${100 * scale}px`,
              }}
            >
              Behind the dialog
            </Button>
          </div>,
          document.body
        )}
      <AlertDialog
        scale={scale}
        open={open}
        onOpenChange={(next, details) => {
          if (
            !next &&
            ((details.reason === "escape-key" && params.has("preventEscape")) ||
              ((details.reason === "outside-press" ||
                details.reason === "focus-out") &&
                params.has("preventOutside")))
          ) {
            details.cancel();

            return;
          }

          if (!params.has("reject")) {
            setOpen(next);
          }
        }}
      >
        <AlertDialogTrigger>Open confirmation</AlertDialogTrigger>
        <AlertDialogContent
          ref={content}
          keepMounted={params.has("forceMount") ? true : undefined}
          blur={Number(params.get("blur") ?? 5)}
          initialFocus={native ? () => content.current : undefined}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {params.get("label") ?? "Are you sure?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {params.get("text") ?? "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              disabled={params.get("disabledIndex") === "0"}
              onClick={(event) => {
                if (params.has("preventAction")) {
                  event.preventDefault();
                }

                setConfirmed((n) => n + 1);

                if (!event.defaultPrevented && !params.has("reject")) {
                  setOpen(false);
                }
              }}
            >
              {labels[0]}
            </AlertDialogAction>
            <AlertDialogCancel disabled={params.get("disabledIndex") === "1"}>
              {labels[1]}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <output aria-label="Confirmations">{confirmed}</output>
    </>
  );
};

const AlertDialogCompositionFixture = () => {
  const trigger = React.useRef<HTMLButtonElement>(null);
  const content = React.useRef<HTMLDivElement>(null);
  const action = React.useRef<HTMLButtonElement>(null);
  const cancel = React.useRef<HTMLButtonElement>(null);

  const [refs, setRefs] = React.useState("");
  const [submissions, setSubmissions] = React.useState(0);

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button />} ref={trigger}>
        Composed confirmation
      </AlertDialogTrigger>
      <AlertDialogContent render={<section />} ref={content}>
        <>
          <AlertDialogHeader>
            <AlertDialogTitle render={<h3 />}>Composed title</AlertDialogTitle>
            <AlertDialogDescription render={<div />}>
              Composed description
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSubmissions((n) => n + 1);
            }}
          >
            <Input name="name" aria-label="Confirmation form input" />
            <Button type="submit">Submit</Button>
          </form>
          <Button
            onClick={() => {
              setRefs(
                [
                  trigger.current?.tagName,
                  content.current?.tagName,
                  action.current?.tagName,
                  cancel.current?.tagName,
                ].join(",")
              );
            }}
          >
            Inspect confirmation refs
          </Button>
          <output aria-label="Confirmation refs">{refs}</output>
          <output aria-label="Confirmation submissions">{submissions}</output>
          <AlertDialogFooter>
            <AlertDialogAction
              ref={action}
              nativeButton={false}
              render={
                // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- AlertDialogAction supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
                <a href="#confirmed" />
              }
            >
              Confirm link
            </AlertDialogAction>
            <AlertDialogCancel ref={cancel} render={<Button />}>
              Cancel composed
            </AlertDialogCancel>
          </AlertDialogFooter>
        </>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const DialogCompositionFixture = () => {
  const trigger = React.useRef<HTMLButtonElement>(null);
  const content = React.useRef<HTMLDivElement>(null);
  const overlay = React.useRef<HTMLDivElement>(null);

  const [result, setResult] = React.useState("");
  const [submissions, setSubmissions] = React.useState(0);

  return (
    <Dialog>
      <DialogTrigger render={<Button />} ref={trigger}>
        Composed trigger
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay
          render={<aside data-custom-overlay="true" />}
          ref={overlay}
        >
          {undefined}
        </DialogOverlay>
      </DialogPortal>
      <DialogContent
        render={<section data-custom-content="true" />}
        ref={content}
      >
        <>
          <DialogHeader>
            <DialogTitle render={<h3 />}>Composed title</DialogTitle>
            <DialogDescription render={<div />}>
              Composed description
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSubmissions((n) => n + 1);
            }}
          >
            <Input aria-label="Dialog form input" name="name" />
            <Button type="submit">Submit</Button>
          </form>
          <Button
            onClick={() => {
              setResult(
                [
                  trigger.current?.tagName,
                  content.current?.tagName,
                  overlay.current?.tagName,
                ].join(",")
              );
            }}
          >
            Inspect refs
          </Button>
          <output aria-label="Dialog composed refs">{result}</output>
          <output aria-label="Dialog submissions">{submissions}</output>
          <DialogFooter>
            <DialogClose render={<Button />}>Composed close</DialogClose>
          </DialogFooter>
        </>
      </DialogContent>
    </Dialog>
  );
};

const DialogFixture = () => {
  const native = params.has("native");
  const [open, setOpen] = React.useState(params.has("open") || native);
  const [actions, setActions] = React.useState(0);
  const [changes, setChanges] = React.useState(0);

  const content = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);

  const labelsSource = params.get("labels");

  // SAFETY: owned Dialog actions callers serialize string label arrays; preserve this branch's existing parameter/default read.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact Dialog actions query-label producer boundary.
  const labels: string[] =
    labelsSource === null
      ? ["Cancel", "Continue"]
      : (JSON.parse(labelsSource) as FixtureLabels);
  // oxlint-enable typescript/no-unsafe-type-assertion

  let selectedDescription: string | null;

  if (native) {
    selectedDescription = params.has("text") ? params.get("text") : null;
  } else {
    selectedDescription = params.get("text") ?? "A helpful description.";
  }

  const description = selectedDescription;

  return (
    <>
      {params.has("patterned") &&
        createPortal(
          <div data-dialog-underlay="true" className="fixture-dialog-underlay">
            <div
              style={{
                "--fixture-layout-13": `${64 * scale}px`,
                "--fixture-layout-14": `${18 * scale}px`,
                "--fixture-layout-15": `${18 * scale}px`,
              }}
              className="fixture-owner-layout-27 fixture-owner-layout-28 fixture-owner-layout-29 fixture-owner-layout-30 fixture-owner-layout-31"
            >
              {Array.from({ length: 256 }, (_, i) => (
                <i
                  key={i}
                  className="fixture-color-bar fixture-dialog-palette"
                  style={{
                    "--fixture-bar-width": `${scale}px`,
                    "--fixture-dialog-palette-step": i,
                  }}
                />
              ))}
            </div>
            <Button
              scale={scale}
              className="fixture-dialog-underlay-button"
              style={{
                "--fixture-width": `${140 * scale}px`,
                "--fixture-x": `${18 * scale}px`,
                "--fixture-y": `${100 * scale}px`,
              }}
            >
              Behind the dialog
            </Button>
          </div>,
          document.body
        )}
      <Dialog
        scale={scale}
        defaultOpen={params.has("open") || native}
        open={params.has("controlled") ? open : undefined}
        modal={!params.has("nonmodal")}
        onOpenChange={(next, details) => {
          if (
            !next &&
            ((details.reason === "escape-key" && params.has("preventEscape")) ||
              ((details.reason === "outside-press" ||
                details.reason === "focus-out") &&
                params.has("preventOutside")))
          ) {
            details.cancel();

            return;
          }

          if (!params.has("reject")) {
            setOpen(next);
          }

          setChanges((current) => current + 1);
        }}
      >
        <DialogTrigger ref={trigger}>Open dialog</DialogTrigger>
        <DialogContent
          ref={content}
          width={Number(params.get("wrapWidth") ?? 250)}
          initialFocus={native ? () => content.current : undefined}
        >
          <DialogHeader>
            <DialogTitle>{params.get("label") ?? "World settings"}</DialogTitle>
            {description !== null && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            {labels.map((actionLabel, index) => (
              <Button
                key={index}
                scale={scale}
                disabled={Number(params.get("disabledIndex") ?? -1) === index}
                onClick={() => {
                  setActions((current) => current + 1);
                }}
              >
                {actionLabel}
              </Button>
            ))}
          </DialogFooter>
          {!native && <DialogClose>Done</DialogClose>}
        </DialogContent>
      </Dialog>
      <button
        type="button"
        id="dialog-external"
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        Change dialog externally
      </button>
      <output aria-label="Dialog actions">{actions}</output>
      <output aria-label="Dialog changes">{changes}</output>
      <button
        type="button"
        id="dialog-read-refs"
        onClick={() => {
          setActions(
            content.current?.tagName === "DIV" &&
              trigger.current?.tagName === "BUTTON"
              ? 100
              : -1
          );
        }}
      >
        Read refs
      </button>
    </>
  );
};

const FixtureTabsTrigger = () => (
  <Tabs
    scale={scale}
    defaultValue={params.get("selected") === "true" ? "subject" : null}
  >
    <TabsList
      aria-label="Test tab trigger"
      activateOnFocus={
        params.get("activationMode") !== "manual" &&
        params.get("component") !== "tabs-trigger"
      }
    >
      <TabsTrigger
        id="subject"
        value="subject"
        disabled={state.startsWith("disabled")}
        className="fixture-geometry-width"
        style={{ "--fixture-width": `${width * scale}px` }}
        data-subject="true"
      >
        {params.get("label") ?? "Game"}
      </TabsTrigger>
    </TabsList>
  </Tabs>
);

const FixtureTabs = () => {
  const [count, setCount] = React.useState(0);
  const [refName, setRefName] = React.useState("");
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const tabsListRef = React.useRef<HTMLDivElement>(null);
  const tabsTriggerRef = React.useRef<HTMLButtonElement>(null);
  const tabsContentRef = React.useRef<HTMLDivElement>(null);

  const [tabsValue, setTabsValue] = React.useState(
    `tab-${params.get("selectedIndex") ?? 0}`
  );

  const labelsSource = params.get("labels");

  // SAFETY: owned Tabs titles callers serialize string label arrays; preserve this branch's existing parameter/default read.
  // oxlint-disable typescript/no-unsafe-type-assertion -- Exact Tabs titles query-label producer boundary.
  const titles: string[] =
    labelsSource === null
      ? ["Game", "World", "More"]
      : (JSON.parse(labelsSource) as FixtureLabels);
  // oxlint-enable typescript/no-unsafe-type-assertion

  const panel = Number(params.get("contentHeight") ?? 0);

  const triggers = titles.map((title, index) => (
    <TabsTrigger
      render={
        params.has("triggerAsChild") && index === 0 ? (
          <a
            href="#composed-tab"
            aria-label={fixtureFallbackLabel("First tab", title)}
          />
        ) : undefined
      }
      key={index}
      value={`tab-${index}`}
      ref={index === 0 ? tabsTriggerRef : undefined}
      disabled={
        params.has("disabledIndex") &&
        Number(params.get("disabledIndex")) === index
      }
    >
      {title}
    </TabsTrigger>
  ));

  const contents = (
    <>
      <TabsList
        render={params.has("listAsChild") ? <nav /> : undefined}
        id={panel > 0 ? "tab-list" : "subject"}
        ref={tabsListRef}
        aria-label="Test tabs"
        activateOnFocus={
          params.get("activationMode") !== "manual" &&
          params.get("component") !== "tabs-trigger"
        }
        data-subject={
          (panel > 0 ? "tab-list" : "subject") === "subject"
            ? "true"
            : undefined
        }
      >
        {triggers}
      </TabsList>
      {titles.map((title, index) => (
        <TabsContent
          key={index}
          value={`tab-${index}`}
          ref={index === 0 ? tabsContentRef : undefined}
          keepMounted={params.has("forceMount") ? true : undefined}
          className={cn({ "fixture-geometry-height": panel > 0 })}
          style={{
            "--fixture-height": panel > 0 ? `${panel * scale}px` : undefined,
          }}
        >
          {panel > 0 && !params.has("panelText") ? null : (
            <span>{title} content</span>
          )}
        </TabsContent>
      ))}
    </>
  );

  return (
    <>
      <Tabs
        render={params.has("asChild") ? <section /> : undefined}
        id={panel > 0 ? "subject" : "tabs-root"}
        ref={tabsRef}
        scale={scale}
        defaultValue={`tab-${params.get("selectedIndex") ?? 0}`}
        value={params.has("controlled") ? tabsValue : undefined}
        dir={params.get("dir") === "rtl" ? "rtl" : "ltr"}
        className="fixture-geometry-width"
        style={{ "--fixture-width": `${width * scale}px` }}
        onValueChange={(next: string) => {
          if (!params.has("reject")) {
            setTabsValue(next);
          }

          setCount((current) => current + 1);
        }}
        data-subject={
          (panel > 0 ? "subject" : "tabs-root") === "subject"
            ? "true"
            : undefined
        }
      >
        {contents}
      </Tabs>
      <output aria-label="Selected tab">{tabsValue}</output>
      <output aria-label="Tab changes">{count}</output>
      <button
        type="button"
        id="select-last-tab"
        onClick={() => {
          setTabsValue(`tab-${titles.length - 1}`);
        }}
      >
        Select last tab externally
      </button>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setRefName(
            `${tabsRef.current?.tagName}/${tabsListRef.current?.tagName}/${tabsTriggerRef.current?.tagName}/${tabsContentRef.current?.tagName}`
          );
        }}
      >
        Read refs
      </button>
      <output aria-label="Root ref">{refName}</output>
    </>
  );
};

const FixtureProgress = () => {
  const [count, setCount] = React.useState(0);
  const [refName, setRefName] = React.useState("");
  const progressRef = React.useRef<HTMLDivElement>(null);

  const [progressValue, setProgressValue] = React.useState<number | null>(
    params.has("unknown") ? null : Number(params.get("value") ?? 50)
  );

  return (
    <>
      <Progress
        render={
          params.has("asChild") ? (
            <section data-testid="composed-progress" />
          ) : undefined
        }
        id="subject"
        ref={progressRef}
        scale={scale}
        value={progressValue}
        max={Number(params.get("max") ?? 100)}
        color={
          // SAFETY: owned fixture callers serialize the color option from the actual component protocol (BossBarColor); preserve this URL read, original default and component handling.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
          (params.get("color") ?? "pink") as BossBarColor
        }
        overlay={
          // SAFETY: owned fixture callers serialize the overlay option from the actual component protocol (BossBarOverlay); preserve this URL read, original default and component handling.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
          (params.get("overlay") ?? "progress") as BossBarOverlay
        }
        aria-label="Test progress"
        onClick={() => {
          setCount((current) => current + 1);
        }}
        aria-valuetext={
          params.has("customLabel")
            ? `${progressValue} of ${Number(params.get("max") ?? 100)} loaded`
            : undefined
        }
        data-subject="true"
      >
        {undefined}
      </Progress>
      <button
        type="button"
        id="update-progress"
        onClick={() => {
          setProgressValue(Number(params.get("next") ?? 100));
        }}
      >
        Update progress
      </button>
      <button
        type="button"
        id="unknown-progress"
        onClick={() => {
          setProgressValue(null);
        }}
      >
        Unknown progress
      </button>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setRefName(progressRef.current?.tagName ?? "missing");
        }}
      >
        Read ref
      </button>
      <output aria-label="Root ref">{refName}</output>
      <output aria-label="Activations">{count}</output>
    </>
  );
};

const FixtureScrollArea = () => {
  const [count, setCount] = React.useState(0);
  const [commits, setCommits] = React.useState(0);
  const [refName, setRefName] = React.useState("");
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [scrollValue, setScrollValue] = React.useState(0);

  const [scrollContent, setScrollContent] = React.useState(
    Number(params.get("contentHeight") ?? 480)
  );

  React.useEffect(() => {
    if (params.get("component") === "scroll-area" && viewportRef.current) {
      viewportRef.current.scrollTop = Number(params.get("scroll") ?? 0) * scale;
    }
  }, []);

  const rows = (
    <div
      key="rows"
      style={{ "--fixture-layout-16": `${scrollContent * scale}px` }}
      className="fixture-owner-layout-32 fixture-owner-layout-33"
    >
      {Array.from({ length: Math.ceil(scrollContent / 24) }, (_, index) => (
        <div
          key={index}
          style={{ "--fixture-layout-17": `${24 * scale}px` }}
          className="fixture-owner-layout-34 fixture-owner-layout-35 fixture-owner-layout-36"
        >
          <Button
            scale={scale}
            className="fixture-main-full-width"
            onClick={() => {
              setCount((current) => current + 1);
            }}
          >{`Row ${index + 1}`}</Button>
        </div>
      ))}
    </div>
  );

  const customBar = params.has("customBar") ? (
    <ScrollBar key="bar" data-testid="custom-scrollbar" />
  ) : null;

  return (
    <>
      <ScrollArea
        render={params.has("asChild") ? <section /> : undefined}
        id="subject"
        ref={scrollAreaRef}
        viewportRef={viewportRef}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- This fixture covers ScrollArea's default div and section render receivers with the explicit region and root/viewport ref contract.
        role="region"
        aria-label="Test scroll area"
        disabled={state === "disabled"}
        scale={scale}
        onPointerDown={() => {
          setCommits((current) => current + 1);
        }}
        viewportProps={{
          "aria-label": "Scrollable content",
          onScroll: (event) => {
            setScrollValue(event.currentTarget.scrollTop);
          },
        }}
        style={
          params.has("defaults")
            ? undefined
            : {
                height: Number(params.get("height") ?? 80) * scale,
                width: width * scale,
              }
        }
        data-subject="true"
      >
        {params.has("asChild") ? (
          <>
            {rows}
            {customBar}
          </>
        ) : (
          [rows, customBar]
        )}
      </ScrollArea>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setRefName(
            `${scrollAreaRef.current?.tagName}/${viewportRef.current?.tagName}`
          );
        }}
      >
        Read ref
      </button>
      <output aria-label="Root ref">{refName}</output>
      <output aria-label="Scroll offset">{scrollValue}</output>
      <output aria-label="Activations">{count}</output>
      <output aria-label="Pointer events">{commits}</output>
      <button
        type="button"
        id="shrink-content"
        onClick={() => {
          setScrollContent(24);
        }}
      >
        Shrink content
      </button>
      <button
        type="button"
        id="grow-content"
        onClick={() => {
          setScrollContent(480);
        }}
      >
        Grow content
      </button>
    </>
  );
};

const FixtureSeparator = () => {
  const [count, setCount] = React.useState(0);
  const [refName, setRefName] = React.useState("");
  const separatorRef = React.useRef<HTMLDivElement>(null);

  return (
    <>
      <button type="button" id="before">
        Before separator
      </button>
      <Separator
        render={params.has("asChild") ? <hr /> : undefined}
        id="subject"
        ref={separatorRef}
        scale={scale}
        edge={state === "footer" ? "footer" : "header"}
        role={params.has("semantic") ? "separator" : "none"}
        aria-label={params.has("semantic") ? "Settings sections" : undefined}
        data-testid="native-separator"
        className="fixture-geometry-width"
        style={{ "--fixture-width": `${width * scale}px` }}
        onClick={() => {
          setCount((current) => current + 1);
        }}
        data-subject="true"
      >
        {undefined}
      </Separator>
      <button type="button" id="after">
        After separator
      </button>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setRefName(separatorRef.current?.tagName ?? "missing");
        }}
      >
        Read ref
      </button>
      <output aria-label="Root ref">{refName}</output>
      <output aria-label="Activations">{count}</output>
    </>
  );
};

const FixtureLabel = () => {
  const [count, setCount] = React.useState(0);
  const [refName, setRefName] = React.useState("");
  const labelRef = React.useRef<HTMLLabelElement>(null);

  return (
    <>
      <Label
        id="subject"
        ref={labelRef}
        htmlFor="label-input"
        scale={scale}
        aria-disabled={state === "disabled" || undefined}
        maxWidth={
          params.has("wrapWidth") ? Number(params.get("wrapWidth")) : undefined
        }
        align={params.get("alignment") === "center" ? "center" : "left"}
        className="fixture-geometry-height"
        style={{
          "--fixture-height": `${Number(params.get("height") ?? 9) * scale}px`,
          width: width * scale,
        }}
        onClick={() => {
          setCount((current) => current + 1);
        }}
        data-subject="true"
      >
        {params.has("rich") ? <strong>Rich label</strong> : label}
      </Label>
      <Input
        id="label-input"
        disabled={state === "disabled"}
        defaultValue="Minecraft"
      />
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setRefName(labelRef.current?.tagName ?? "missing");
        }}
      >
        Read ref
      </button>
      <output aria-label="Root ref">{refName}</output>
      <output aria-label="Activations">{count}</output>
    </>
  );
};

const FixtureTextarea = () => {
  const [count, setCount] = React.useState(0);
  const [refName, setRefName] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const [inputValue, setInputValue] = React.useState(
    params.get("text") ?? "Hello Minecraft"
  );

  const [submitted, setSubmitted] = React.useState(0);
  React.useEffect(() => {
    if (params.get("component") === "textarea" && textareaRef.current) {
      textareaRef.current.scrollTop = Number(params.get("scroll") ?? 0) * scale;
    }
  }, []);

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted((current) => current + 1);
        }}
      >
        <Textarea
          id="subject"
          ref={textareaRef}
          name="message"
          aria-label="Test textarea"
          scale={scale}
          value={params.has("uncontrolled") ? undefined : inputValue}
          defaultValue={
            params.has("uncontrolled") ? (params.get("text") ?? "") : undefined
          }
          disabled={state === "disabled"}
          readOnly={state.includes("readonly")}
          placeholder={params.get("placeholder") ?? ""}
          className="fixture-geometry-width fixture-geometry-height"
          style={{
            "--fixture-height": `${Number(params.get("height") ?? 80) * scale}px`,
            "--fixture-width": `${width * scale}px`,
          }}
          onChange={(event) => {
            setInputValue(event.target.value);
            setCount((current) => current + 1);
          }}
          data-subject="true"
        />
        <button type="submit" id="submit">
          Submit
        </button>
        <button type="reset" id="reset">
          Reset
        </button>
      </form>
      <output aria-label="Textarea value">{inputValue}</output>
      <output aria-label="Textarea changes">{count}</output>
      <output aria-label="Submissions">{submitted}</output>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setRefName(textareaRef.current?.tagName ?? "missing");
        }}
      >
        Read ref
      </button>
      <output aria-label="Root ref">{refName}</output>
    </>
  );
};

const FixtureCard = () => {
  const [count, setCount] = React.useState(0);
  const [refName, setRefName] = React.useState("");
  const cardRef = React.useRef<HTMLDivElement>(null);

  return (
    <>
      <Card
        id="subject"
        ref={cardRef}
        aria-label="Test card"
        scale={scale}
        style={{
          "--fixture-layout-18": `${width * scale}px`,
          "--fixture-layout-21": `${Number(params.get("height") ?? 200) * scale}px`,
        }}
        className={cn("fixture-owner-layout-37 fixture-owner-layout-46", {
          "fixture-card-empty-padding": !params.has("text"),
        })}
        data-subject="true"
      >
        {params.has("text") && (
          <>
            <CardHeader>
              <CardTitle>{params.get("label") ?? "World Settings"}</CardTitle>
              <CardDescription>{params.get("text")}</CardDescription>
              {params.has("action") && (
                <CardAction>
                  <button
                    type="button"
                    onClick={() => {
                      setCount((current) => current + 1);
                    }}
                  >
                    Action
                  </button>
                </CardAction>
              )}
            </CardHeader>
            {params.has("content") && (
              <CardContent>
                <label htmlFor="card-input">Name</label>
                <Input id="card-input" defaultValue="Minecraft" />
              </CardContent>
            )}
            <CardFooter>
              <Button
                scale={scale}
                onClick={() => {
                  setCount((current) => current + 1);
                }}
              >
                Done
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setRefName(cardRef.current?.tagName ?? "missing");
        }}
      >
        Read ref
      </button>
      <output aria-label="Root ref">{refName}</output>
      <output aria-label="Activations">{count}</output>
    </>
  );
};

const FixtureTooltip = () => {
  const [count, setCount] = React.useState(0);
  const [refName, setRefName] = React.useState("");
  const [tooltipOpen, setTooltipOpen] = React.useState(params.has("open"));
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  let selectedFixtureBranch14: ReactNode;

  if (params.has("asChild")) {
    selectedFixtureBranch14 = params.get("text") ?? "Tooltip";
  } else {
    selectedFixtureBranch14 = params.has("rich") ? (
      <strong>Rich tooltip</strong>
    ) : (
      (params.get("text") ?? "Tooltip")
    );
  }

  return (
    <TooltipProvider delay={Number(params.get("delay") ?? 0)}>
      <Tooltip
        open={params.has("controlled") ? tooltipOpen : undefined}
        defaultOpen={params.has("open")}
        onOpenChange={setTooltipOpen}
      >
        <TooltipTrigger
          render={
            // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- TooltipTrigger supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
            <button
              type="button"
              id="tooltip-trigger"
              className="fixture-edge-anchor"
              style={{
                "--fixture-edge-left": `${params.get("edge") === "left" ? 0 : 300}px`,
                "--fixture-edge-top": `${params.get("edge") === "top" ? 0 : 240}px`,
              }}
              onClick={() => {
                setCount((current) => current + 1);
              }}
            />
          }
        >
          Inspect
        </TooltipTrigger>
        <TooltipContent
          render={params.has("asChild") ? <div /> : undefined}
          id="subject"
          ref={tooltipRef}
          scale={scale}
          maxWidth={Number(params.get("wrapWidth") ?? 170)}
          side={
            // SAFETY: owned fixture callers serialize the side option from the actual component protocol ("top" | "bottom" | "left" | "right"); preserve this URL read, original default and component handling.
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
            (params.get("side") ?? "top") as "top" | "bottom" | "left" | "right"
          }
          sideOffset={Number(params.get("offset") ?? 0)}
          data-subject="true"
        >
          {selectedFixtureBranch14}
        </TooltipContent>
      </Tooltip>
      <button type="button" id="next">
        Next focus target
      </button>
      <button
        type="button"
        id="external-open"
        onClick={() => {
          setTooltipOpen(true);
        }}
      >
        Open externally
      </button>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setRefName(tooltipRef.current?.tagName ?? "missing");
        }}
      >
        Read ref
      </button>
      <output aria-label="Root ref">{refName}</output>
      <output aria-label="Tooltip open">{String(tooltipOpen)}</output>
      <output aria-label="Activations">{count}</output>
    </TooltipProvider>
  );
};

const FixtureInput = () => {
  const [count, setCount] = React.useState(0);
  const [refName, setRefName] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = React.useState(
    params.get("text") ?? "Hello Minecraft"
  );

  const [submitted, setSubmitted] = React.useState(0);

  return (
    <>
      <form
        id="input-form"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted((current) => current + 1);
        }}
      >
        <Input
          ref={inputRef}
          id="subject"
          name="message"
          aria-label="Test input"
          scale={scale}
          className="fixture-geometry-width"
          style={{ "--fixture-width": `${width * scale}px` }}
          value={params.has("uncontrolled") ? undefined : inputValue}
          defaultValue={
            params.has("uncontrolled")
              ? (params.get("text") ?? "Hello Minecraft")
              : undefined
          }
          type={params.get("type") ?? "text"}
          placeholder={params.get("placeholder") ?? undefined}
          disabled={state === "disabled"}
          readOnly={state.includes("readonly")}
          required={params.has("required")}
          pattern={params.get("pattern") ?? undefined}
          maxLength={
            params.has("maxLength")
              ? Number(params.get("maxLength"))
              : undefined
          }
          onChange={(event) => {
            setInputValue(event.target.value);
            setCount((current) => current + 1);
          }}
          data-subject="true"
        />
        <button type="submit" id="submit">
          Submit
        </button>
        <button type="reset" id="reset">
          Reset
        </button>
      </form>
      <output aria-label="Input changes">{count}</output>
      <output aria-label="Input value">{inputValue}</output>
      <output aria-label="Submissions">{submitted}</output>
      <button type="button" id="next">
        Next focus target
      </button>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setRefName(inputRef.current?.tagName ?? "missing");
        }}
      >
        Read ref
      </button>
      <output aria-label="Root ref">{refName}</output>
      <button
        type="button"
        id="imperative"
        onClick={() => {
          if (inputRef.current) {
            inputRef.current.value = "Done";
          }
        }}
      >
        Set through ref
      </button>
    </>
  );
};

const FixtureSlider = () => {
  const [count, setCount] = React.useState(0);
  const [commits, setCommits] = React.useState(0);
  const [refName, setRefName] = React.useState("");
  const sliderRef = React.useRef<HTMLDivElement>(null);

  const [values, setValues] = React.useState(
    (params.get("values") ?? params.get("value") ?? "500")
      .split(",")
      .map(Number)
  );

  return (
    <>
      <form id="slider-form">
        <Slider
          ref={sliderRef}
          id="subject"
          name="volume"
          scale={scale}
          aria-label="Volume"
          label={params.get("label") ?? undefined}
          value={
            params.has("uncontrolled") || params.has("default-range")
              ? undefined
              : values
          }
          defaultValue={params.has("default-range") ? undefined : values}
          min={0}
          max={1000}
          step={1}
          disabled={state === "disabled"}
          dir={params.get("dir") === "rtl" ? "rtl" : "ltr"}
          orientation={
            params.get("orientation") === "vertical" ? "vertical" : "horizontal"
          }
          className="fixture-main-slider-width"
          style={
            params.get("orientation") === "vertical"
              ? undefined
              : { "--fixture-width": `${width * scale}px` }
          }
          onValueCommitted={() => {
            setCommits((current) => current + 1);
          }}
          onValueChange={(next) => {
            setValues([
              // SAFETY: this fixture always supplies the parsed values array or the wrapper's default [min,max] array. Base UI's range mode returns an array for these producers, including uncontrolled/reset paths.
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned Slider array-mode callback boundary; preserve the original array copy and notifications.
              ...(next as readonly number[]),
            ]);
            setCount((current) => current + 1);
          }}
          data-subject="true"
        />
      </form>
      <output aria-label="Values">{values.join(",")}</output>
      <output aria-label="Changes">{count}</output>
      <output aria-label="Commits">{commits}</output>
      <output aria-label="Root ref">{refName}</output>
      <button type="button" id="next">
        Next focus target
      </button>
      <button
        type="button"
        id="read-ref"
        onClick={() => {
          setRefName(sliderRef.current?.id ?? "missing");
        }}
      >
        Read ref
      </button>
      <button type="reset" form="slider-form" id="reset">
        Reset
      </button>
    </>
  );
};

const FixtureCheckbox = () => {
  const [count, setCount] = React.useState(0);

  const [checked, setChecked] = React.useState<boolean | "indeterminate">(
    params.get("checked") === "mixed"
      ? "indeterminate"
      : params.get("checked") === "true"
  );

  return (
    <>
      <Checkbox
        id="subject"
        aria-label="Test checkbox"
        scale={scale}
        checked={checked === true}
        indeterminate={checked === "indeterminate"}
        disabled={state === "disabled"}
        onCheckedChange={(value) => {
          setChecked(value);
          setCount(count + 1);
        }}
        data-subject="true"
      />
      <output aria-label="Changes">{count}</output>
      <button type="button" id="next">
        Next focus target
      </button>
    </>
  );
};

const FixtureButton = () => {
  const [count, setCount] = React.useState(0);

  return (
    <>
      <Button
        id="subject"
        scale={scale}
        disabled={state === "disabled"}
        style={params.has("width") ? { width: width * scale } : undefined}
        onClick={() => {
          setCount(count + 1);
        }}
        data-subject="true"
      >
        {label}
      </Button>
      <output aria-label="Activations">{count}</output>
      <Button
        render={
          // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- Button supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
          <a href="#destination" />
        }
      >
        Continue
      </Button>
      <Button
        disabled
        onClick={() => {
          setCount(count + 100);
        }}
      >
        Disabled
      </Button>
      <a href="#utility" className={buttonVariants()}>
        Utility link
      </a>
    </>
  );
};

const fixtureRoutes: readonly FixtureRoute[] = [
  {
    fixture: KeyedRichChildrenFixture,
    kind: "name",
    name: "keyed-rich-children",
  },
  {
    fixture: TabsFallbackFixture,
    kind: "name",
    name: "tabs-fallback",
  },
  {
    fixture: BaseUICompositionFixture,
    kind: "name",
    name: "base-ui-composition",
  },
  {
    fixture: CollapsibleFirstFrameFixture,
    kind: "name",
    name: "collapsible-first-frame",
  },
  {
    fixture: BadgeAdvancementFixture,
    kind: "name",
    name: "badge-advancement",
  },
  {
    fixture: QuestionnaireFixture,
    kind: "name",
    name: "questionnaire",
  },
  {
    fixture: DialogFooterFixture,
    kind: "name",
    name: "dialog-footer",
  },
  {
    fixture: AlertDialogMediaFixture,
    kind: "name",
    name: "alert-dialog-media",
  },
  {
    fixture: ComboboxFixture,
    kind: "name",
    name: "combobox",
  },
  {
    fixture: AttachmentFixture,
    kind: "name",
    name: "attachment",
  },
  {
    fixture: ColorPainterStressFixture,
    kind: "name",
    name: "color-painter-stress",
  },
  {
    fixture: MarkerFixture,
    kind: "name",
    name: "marker",
  },
  {
    fixture: ChartFixture,
    kind: "name",
    name: "chart",
  },
  {
    fixture: TextWidgetsFixture,
    kind: "aliases",
    names: ["trace", "message-scroller", "spinner"],
    nativeFixture: NativeTextCompositionsFixture,
  },
  {
    fixture: NativeSelectFixture,
    kind: "name",
    name: "native-select",
  },
  {
    fixture: CodeBlockFixture,
    kind: "name",
    name: "code-block",
    nativeFixture: NativeTextCompositionsFixture,
  },
  {
    fixture: InputOTPFixture,
    kind: "name",
    name: "input-otp",
  },
  {
    fixture: CarouselFixture,
    kind: "name",
    name: "carousel",
  },
  {
    fixture: FormsFixture,
    kind: "aliases",
    names: ["form", "field"],
  },
  {
    fixture: DataTableFixture,
    kind: "name",
    name: "data-table",
  },
  {
    fixture: InputGroupFixture,
    kind: "name",
    name: "input-group",
  },
  {
    fixture: CommandFixture,
    kind: "name",
    name: "command",
  },
  {
    fixture: CalendarFixture,
    kind: "aliases",
    names: ["calendar", "date-picker"],
  },
  {
    fixture: ChatFamilyFixture,
    kind: "aliases",
    names: ["message", "bubble"],
  },
  {
    fixture: ResizableFixture,
    kind: "name",
    name: "resizable",
  },
  {
    fixture: SidebarFixture,
    kind: "name",
    name: "sidebar",
  },
  {
    fixture: TableFixture,
    kind: "name",
    name: "table",
  },
  {
    fixture: ItemFixture,
    kind: "name",
    name: "item",
  },
  {
    fixture: AvatarFixture,
    kind: "name",
    name: "avatar",
  },
  {
    fixture: ToastFixture,
    kind: "aliases",
    names: ["sonner", "sonner-strict"],
  },
  {
    fixture: ButtonCompositionFixture,
    kind: "name",
    name: "button-composition",
  },
  {
    fixture: TextComponentsFixture,
    kind: "aliases",
    names: ["badge", "typography", "breadcrumb", "kbd", "empty"],
  },
  {
    fixture: OverlayFixture,
    kind: "aliases",
    names: ["sheet", "drawer"],
  },
  {
    fixture: StructuralFixture,
    kind: "aliases",
    names: ["aspect-ratio", "button-group", "pagination"],
  },
  {
    fixture: ToggleGroupFixture,
    kind: "name",
    name: "toggle-group",
  },
  {
    fixture: ToggleFixture,
    kind: "name",
    name: "toggle",
  },
  {
    fixture: ContextFixture,
    kind: "name",
    name: "context-menu",
  },
  {
    fixture: CollapsibleFixture,
    kind: "name",
    name: "collapsible",
  },
  {
    fixture: MenubarFixture,
    kind: "name",
    name: "menubar",
  },
  {
    fixture: DropdownFixture,
    kind: "name",
    name: "dropdown-menu",
  },
  {
    fixture: PopoverCompositionFixture,
    kind: "name",
    name: "popover-composition",
  },
  {
    fixture: PopoverFixture,
    kind: "name",
    name: "popover",
  },
  {
    fixture: AlertDialogCompositionFixture,
    kind: "name",
    name: "alert-dialog-composition",
  },
  {
    fixture: AlertDialogFixture,
    kind: "name",
    name: "alert-dialog",
  },
  {
    fixture: DialogCompositionFixture,
    kind: "name",
    name: "dialog-composition",
  },
  {
    fixture: DialogFixture,
    kind: "name",
    name: "dialog",
  },
  {
    fixture: SwitchFixture,
    kind: "name",
    name: "switch",
  },
  {
    fixture: RadioFixture,
    kind: "prefix",
    prefix: "radio-group",
  },
  {
    fixture: SelectFixture,
    kind: "prefix",
    prefix: "select",
  },
  {
    fixture: FixtureTabsTrigger,
    kind: "name",
    name: "tabs-trigger",
  },
  {
    fixture: FixtureTabs,
    kind: "name",
    name: "tabs",
  },
  {
    fixture: FixtureProgress,
    kind: "name",
    name: "progress",
  },
  {
    fixture: FixtureScrollArea,
    kind: "name",
    name: "scroll-area",
  },
  {
    fixture: FixtureSeparator,
    kind: "name",
    name: "separator",
  },
  {
    fixture: FixtureLabel,
    kind: "name",
    name: "label",
  },
  {
    fixture: FixtureTextarea,
    kind: "name",
    name: "textarea",
  },
  {
    fixture: FixtureCard,
    kind: "name",
    name: "card",
  },
  {
    fixture: FixtureTooltip,
    kind: "name",
    name: "tooltip",
  },
  {
    fixture: FixtureInput,
    kind: "name",
    name: "input",
  },
  {
    fixture: FixtureSlider,
    kind: "name",
    name: "slider",
  },
  {
    fixture: FixtureCheckbox,
    kind: "name",
    name: "checkbox",
  },
];

const Fixture = ({ view: ActiveFixture }: { view: React.ComponentType }) => (
  <ActiveFixture />
);

const fixtureRoot3 = document.querySelector("#root");

if (fixtureRoot3 === null) {
  throw new Error("Missing required mandatory fixture html root");
}

const fixtureRenderer = createRoot(fixtureRoot3);

if (params.get("component") === "custom-api") {
  fixtureRenderer.render(<CustomApiFixture />);
} else {
  const direction =
    params.has("rtl") || params.get("dir") === "rtl" ? "rtl" : "ltr";

  // Navigation owns this immutable query; React state updates retain this fixture type.
  const ActiveFixture = resolveFixtureRoute(
    params,
    fixtureRoutes,
    FixtureButton
  );

  fixtureRenderer.render(
    <BaseDirectionProvider direction={direction}>
      <Fixture view={ActiveFixture} />
    </BaseDirectionProvider>
  );
}
