"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import * as React from "react";

import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import type { MinecraftProps } from "./minecraft-render";
import { playMinecraftClick } from "./minecraft-sound";

import "./minecraft-radio-group.css";

interface RadioGroupItemPaintStyle extends React.CSSProperties {
  "--mc-checkbox-checked": string;
  "--mc-checkbox-checked-focused": string;
  "--mc-checkbox-focused": string;
  "--mc-checkbox-normal": string;
  "--mc-scale": number;
}

interface RadioGroupScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

const RadioContext = React.createContext<{
  scale: 1 | 2 | 3;
  disabled: boolean;
}>({ disabled: false, scale: 2 });

const RadioGroup = function RadioGroup<Value = string>({
  className,
  scale = 2,
  disabled = false,
  style,
  onValueChange,
  onKeyDownCapture,
  onPointerDownCapture,
  ...props
}: MinecraftProps<typeof RadioGroupPrimitive<Value>> & {
  scale?: 1 | 2 | 3;
}) {
  const keyboardSelection = React.useRef(false);

  return (
    <RadioContext.Provider value={{ disabled, scale }}>
      <RadioGroupPrimitive<Value>
        disabled={disabled}
        onPointerDownCapture={(event) => {
          keyboardSelection.current = false;
          onPointerDownCapture?.(event);
        }}
        onKeyDownCapture={(event) => {
          onKeyDownCapture?.(event);
          keyboardSelection.current =
            !disabled &&
            !event.defaultPrevented &&
            !(event.baseUIHandlerPrevented ?? false) &&
            event.key.startsWith("Arrow");
        }}
        onValueChange={(next, details) => {
          onValueChange?.(next, details);

          if (!disabled && !details.isCanceled && keyboardSelection.current) {
            playMinecraftClick();
          }

          keyboardSelection.current = false;
        }}
        data-slot="radio-group"
        className={cn(`mc-radio-group`, className)}
        style={minecraftStyle(
          style,
          (__style): RadioGroupScaleStyle =>
            ({ "--mc-scale": scale, ...__style })
        )}
        {...props}
      />
    </RadioContext.Provider>
  );
};

const RadioGroupItem = ({
  className,
  scale: explicitScale,
  style,
  disabled: itemDisabled = false,
  onClick,
  onPointerDown,
  children,
  render,
  ...props
}: MinecraftProps<typeof RadioPrimitive.Root> & {
  scale?: 1 | 2 | 3;
}) => {
  const context = React.useContext(RadioContext);
  const scale = explicitScale ?? context.scale;
  const disabled = itemDisabled || context.disabled;

  const indicator = (
    <RadioPrimitive.Indicator
      data-slot="radio-group-indicator"
      className="mc-radio-indicator"
      aria-hidden="true"
    />
  );

  return (
    <RadioPrimitive.Root
      render={render}
      data-slot="radio-group-item"
      className={cn(`mc-checkbox mc-radio-item`, className)}
      style={minecraftStyle(
        style,
        (__style): RadioGroupItemPaintStyle =>
          ({
            "--mc-checkbox-checked": `var(--mc-checkbox-selected-native-s${scale})`,
            "--mc-checkbox-checked-focused": `var(--mc-checkbox-selected-highlighted-native-s${scale})`,
            "--mc-checkbox-focused": `var(--mc-checkbox-highlighted-native-s${scale})`,
            "--mc-checkbox-normal": `var(--mc-checkbox-native-s${scale})`,
            "--mc-scale": scale,
            ...__style,
          })
      )}
      {...props}
      disabled={disabled}
      aria-disabled={disabled ? true : props["aria-disabled"]}
      onPointerDown={(event) => {
        if (disabled) {
          event.preventDefault();

          return;
        }

        onPointerDown?.(event);
      }}
      onClick={(event) => {
        if (
          disabled ||
          Object.hasOwn(event.currentTarget.dataset, "disabled") ||
          event.currentTarget.getAttribute("aria-disabled") === "true" ||
          (event.currentTarget as HTMLButtonElement).disabled
        ) {
          event.preventDefault();

          return;
        }

        onClick?.(event);

        if (
          !event.defaultPrevented &&
          !(event.baseUIHandlerPrevented ?? false)
        ) {
          playMinecraftClick();
        }
      }}
    >
      <>
        {children}
        {indicator}
      </>
    </RadioPrimitive.Root>
  );
};

export { RadioGroup, RadioGroupItem };
