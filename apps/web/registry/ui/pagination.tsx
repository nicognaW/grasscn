"use client";

import * as React from "react";

import { Button } from "./button";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { playMinecraftClick } from "./minecraft-sound";
import { MinecraftText } from "./minecraft-text";

import "./minecraft-pagination.css";
import "./minecraft-pagination-assets.css";

interface OwnedPaginationDimensions1 extends React.CSSProperties {
  "--mc-z-pagination-base-1-width"?: string;
}

interface PaginationScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    data-slot="pagination"
    className={cn(`mc-pagination`, className)}
    {...props}
  />
);

const PaginationContent = ({
  className,
  ...props
}: React.ComponentProps<"ul">) => (
  <ul
    data-slot="pagination-content"
    className={cn(`mc-pagination-content`, className)}
    {...props}
  />
);

const PaginationItem = (props: React.ComponentProps<"li">) => (
  <li data-slot="pagination-item" {...props} />
);

type PaginationLinkProps = React.ComponentProps<"a"> & {
  isActive?: boolean;
  size?: "default";
  scale?: 1 | 2 | 3;
};

const PaginationLink = ({
  isActive,
  size = "default",
  scale = 2,
  children,
  className,
  style,
  onClick,
  ...props
}: PaginationLinkProps) => {
  if (size !== "default") {
    throw new Error(
      "Minecraft pagination supports the native default visual size only"
    );
  }

  return (
    <Button
      render={
        // oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- Preserve the upstream anchor-prop render API: the caller forwards href through props and Button supplies composition. Href-less custom actions remain caller accessibility responsibility.
        <a
          aria-current={(isActive ?? false) ? "page" : undefined}
          data-slot="pagination-link"
          data-active={isActive ?? undefined}
          {...props}
          onClick={(event) => {
            if (
              props["aria-disabled"] === true ||
              props["aria-disabled"] === "true"
            ) {
              event.preventDefault();

              return;
            }

            onClick?.(event);
          }}
        />
      }
      scale={scale}
      size={size}
      className={cn("mc-pagination-link mc-owned-base-pagination-1", className)}
      style={minecraftStyle(style, (__style): OwnedPaginationDimensions1 => ({
        "--mc-z-pagination-base-1-width": `${40 * scale}px`,
        ...__style,
      }))}
    >
      {children}
    </Button>
  );
};

const PaginationArrow = ({
  direction,
  scale = 2,
  size = "default",
  className,
  style,
  onClick,
  children,
  isActive,
  ...props
}: PaginationLinkProps & {
  direction: "backward" | "forward";
}) => {
  if (size !== "default") {
    throw new Error(
      "Minecraft pagination supports the native default visual size only"
    );
  }

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- This anchor preserves caller href/ref/navigation semantics and native Enter activation when href is supplied; href-less action use remains explicit compatibility debt.
    <a
      data-slot={
        direction === "forward" ? "pagination-next" : "pagination-previous"
      }
      data-direction={direction}
      className={cn(`mc-pagination-arrow`, className)}
      style={minecraftStyle(style, (__style): PaginationScaleStyle => ({
        "--mc-scale": scale,
        ...__style,
      }))}
      aria-current={(isActive ?? false) ? "page" : undefined}
      {...props}
      onClick={(event) => {
        if (
          props["aria-disabled"] === true ||
          props["aria-disabled"] === "true"
        ) {
          event.preventDefault();

          return;
        }

        onClick?.(event);

        if (!event.defaultPrevented) {
          playMinecraftClick();
        }
      }}
    >
      {children}
    </a>
  );
};

const PaginationPrevious = (props: PaginationLinkProps) => (
  <PaginationArrow
    direction="backward"
    aria-label="Go to previous page"
    {...props}
  />
);

const PaginationNext = (props: PaginationLinkProps) => (
  <PaginationArrow
    direction="forward"
    aria-label="Go to next page"
    {...props}
  />
);

const PaginationEllipsis = ({
  className,
  scale = 2,
  style,
  ...props
}: React.ComponentProps<"span"> & {
  scale?: 1 | 2 | 3;
}) => (
  <span
    aria-hidden="true"
    data-slot="pagination-ellipsis"
    className={cn(`mc-pagination-ellipsis`, className)}
    style={minecraftStyle(style, (__style): PaginationScaleStyle => ({
      "--mc-scale": scale,
      ...__style,
    }))}
    {...props}
  >
    <MinecraftText>...</MinecraftText>
  </span>
);

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};

export type { PaginationLinkProps };
