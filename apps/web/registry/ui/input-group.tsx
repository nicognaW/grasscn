"use client";

import * as React from "react";

import { Button } from "./button";
import { Input } from "./input";
import { MinecraftProse } from "./minecraft-prose";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { Textarea } from "./textarea";

import "./minecraft-input-group.css";

type Scale = 1 | 2 | 3;

const InputGroupScale = React.createContext<Scale>(2);

const InputGroup = ({
  scale = 2,
  className,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  scale?: Scale;
}) => {
  return (
    <InputGroupScale.Provider value={scale}>
      <div
        data-slot="input-group"
        role="group"
        className={cn(`mc-input-group`, className)}
        style={minecraftStyle(
          style,
          (__style) =>
            ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
        )}
        {...props}
      />
    </InputGroupScale.Provider>
  );
};

const InputGroupAddon = ({
  align = "inline-start",
  className,
  onClick,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "inline-start" | "inline-end" | "block-start" | "block-end";
}) => {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      role="group"
      className={cn(`mc-input-group-addon`, className)}
      {...props}
      onClick={(event) => {
        onClick?.(event);

        if (
          event.defaultPrevented ||
          (event.target as Element).closest(
            'button,a,input,textarea,[role="button"]'
          )
        ) {
          return;
        }

        event.currentTarget.parentElement
          ?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
            "input,textarea"
          )
          ?.focus();
      }}
    />
  );
};

const InputGroupButton = ({
  scale: explicit,
  type = "button",
  style,
  ...props
}: React.ComponentProps<typeof Button>) => {
  const inherited = React.useContext(InputGroupScale);
  const scale = explicit ?? inherited;

  return (
    <Button
      data-slot="input-group-button"
      scale={scale}
      type={type}
      style={minecraftStyle(style, (__style) => ({
        width: 40 * scale,
        ...__style,
      }))}
      {...props}
    />
  );
};

const InputGroupText = ({
  scale: explicit,
  className,
  ...props
}: React.ComponentProps<typeof MinecraftProse>) => {
  const inherited = React.useContext(InputGroupScale);

  return (
    <MinecraftProse
      as="span"
      data-slot="input-group-text"
      scale={explicit ?? inherited}
      className={cn(`mc-input-group-text`, className)}
      {...props}
    />
  );
};

const InputGroupInput = ({
  scale: explicit,
  className,
  ...props
}: React.ComponentProps<typeof Input>) => {
  const inherited = React.useContext(InputGroupScale);

  return (
    <Input
      data-slot="input-group-control"
      scale={explicit ?? inherited}
      className={cn(`mc-input-group-control`, className)}
      {...props}
    />
  );
};

const InputGroupTextarea = ({
  scale: explicit,
  className,
  ...props
}: React.ComponentProps<typeof Textarea>) => {
  const inherited = React.useContext(InputGroupScale);

  return (
    <Textarea
      data-slot="input-group-control"
      scale={explicit ?? inherited}
      className={cn(`mc-input-group-control`, className)}
      {...props}
    />
  );
};

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};
