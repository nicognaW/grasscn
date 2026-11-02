"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import * as React from "react";

import { cn as mergeClasses } from "@/lib/utils";

type ClassValue = Parameters<typeof mergeClasses>[number];

/** Scalar content supported by the Minecraft bitmap text renderers. */
export const isMinecraftTextContent = (
  content: unknown
): content is string | number =>
  typeof content === "string" || typeof content === "number";

export type MinecraftRenderProp = useRender.RenderProp<object>;

export type MinecraftProps<T extends React.ElementType> =
  React.ComponentPropsWithRef<T>;

export type MinecraftPolymorphicProps<T extends React.ElementType> =
  useRender.ComponentProps<T>;

/** Base UI composition for Minecraft's non-primitive artwork components. */
export const MinecraftRender = function MinecraftRender<
  T extends keyof React.JSX.IntrinsicElements = "div",
>({
  as,
  render,
  ref,
  ...props
}: Omit<React.ComponentPropsWithRef<T>, "render"> & {
  as?: T;
  render?: MinecraftRenderProp;
}) {
  return useRender({
    defaultTagName: as ?? "div",
    props: mergeProps({}, props),
    ref: ref as React.Ref<HTMLElement>,
    render,
  });
};

type StateClass<State> = ClassValue | ((state: State) => ClassValue);

/** Distinguish Base UI's state-dependent class props from static class values. */
export const isMinecraftClassResolver = <State,>(
  value: StateClass<State>
): value is (state: State) => ClassValue => typeof value === "function";

export function minecraftClasses(...values: ClassValue[]): string;
export function minecraftClasses<State>(
  ...values: StateClass<State>[]
): string | ((state: State) => string);
export function minecraftClasses<State>(...values: StateClass<State>[]) {
  const resolve = (state: State) =>
    mergeClasses(
      ...values.map((value) =>
        isMinecraftClassResolver(value) ? value(state) : value
      )
    );

  const staticValues: ClassValue[] = [];

  for (const value of values) {
    if (isMinecraftClassResolver(value)) {
      return resolve;
    }

    staticValues.push(value);
  }

  return mergeClasses(...staticValues);
}

type StateStyle<State> =
  | React.CSSProperties
  | ((state: State) => React.CSSProperties | undefined)
  | undefined;

/** Resolve the state callback only when the caller supplied one. */
export const isMinecraftStyleResolver = <State,>(
  style: StateStyle<State>
): style is (state: State) => React.CSSProperties | undefined =>
  typeof style === "function";

export function minecraftStyle(
  style: React.CSSProperties | undefined,
  paint: (style: React.CSSProperties | undefined) => React.CSSProperties
): React.CSSProperties;
export function minecraftStyle<State>(
  style:
    | React.CSSProperties
    | ((state: State) => React.CSSProperties | undefined)
    | undefined,
  paint: (style: React.CSSProperties | undefined) => React.CSSProperties
): React.CSSProperties | ((state: State) => React.CSSProperties);
export function minecraftStyle<State>(
  style:
    | React.CSSProperties
    | ((state: State) => React.CSSProperties | undefined)
    | undefined,
  paint: (style: React.CSSProperties | undefined) => React.CSSProperties
) {
  return isMinecraftStyleResolver(style)
    ? (state: State) => paint(style(state))
    : paint(style);
}
