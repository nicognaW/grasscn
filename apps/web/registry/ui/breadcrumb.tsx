"use client";

import * as React from "react";

import { MinecraftProse } from "./minecraft-prose";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import type { MinecraftPolymorphicProps } from "./minecraft-render";

import "./minecraft-breadcrumb.css";

const BreadcrumbScale = React.createContext<1 | 2 | 3>(2);

const Breadcrumb = ({
  scale = 2,
  style,
  ...props
}: React.ComponentProps<"nav"> & {
  scale?: 1 | 2 | 3;
}) => {
  return (
    <BreadcrumbScale value={scale}>
      <nav
        aria-label="Breadcrumb"
        data-slot="breadcrumb"
        style={minecraftStyle(
          style,
          (__style) =>
            ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
        )}
        {...props}
      />
    </BreadcrumbScale>
  );
};

const BreadcrumbList = ({
  className,
  ...props
}: React.ComponentProps<"ol">) => {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(`mc-breadcrumb-list`, className)}
      {...props}
    />
  );
};

const BreadcrumbItem = ({
  className,
  ...props
}: React.ComponentProps<"li">) => {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn(`mc-breadcrumb-item`, className)}
      {...props}
    />
  );
};

type BreadcrumbLinkProps = MinecraftPolymorphicProps<"a"> & {
  scale?: 1 | 2 | 3;
  maxWidth?: number;
  align?: "left" | "center";
};

const BreadcrumbLink = ({
  render,
  className,
  children,
  scale,
  maxWidth,
  align,
  ...props
}: BreadcrumbLinkProps) => {
  const inherited = React.useContext(BreadcrumbScale);

  return (
    <MinecraftProse
      as="a"
      render={render}
      data-slot="breadcrumb-link"
      className={cn(`mc-breadcrumb-link`, className)}
      scale={scale ?? inherited}
      maxWidth={maxWidth}
      align={align}
      {...props}
    >
      {children}
    </MinecraftProse>
  );
};

const BreadcrumbPage = ({
  children,
  className,
  scale,
  maxWidth,
  align,
  ...props
}: React.ComponentProps<"span"> & {
  scale?: 1 | 2 | 3;
  maxWidth?: number;
  align?: "left" | "center";
}) => {
  const inherited = React.useContext(BreadcrumbScale);

  return (
    <MinecraftProse
      as="span"
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn(`mc-breadcrumb-page`, className)}
      scale={scale ?? inherited}
      maxWidth={maxWidth}
      align={align}
      {...props}
    >
      {children}
    </MinecraftProse>
  );
};

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) => {
  const scale = React.useContext(BreadcrumbScale);

  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn(`mc-breadcrumb-separator`, className)}
      {...props}
    >
      {children ?? <MinecraftProse scale={scale}>{">"}</MinecraftProse>}
    </li>
  );
};

const BreadcrumbEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => {
  const scale = React.useContext(BreadcrumbScale);

  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <MinecraftProse scale={scale}>...</MinecraftProse>
      <span className="mc-breadcrumb-accessible">More</span>
    </span>
  );
};

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};

export type { BreadcrumbLinkProps };
