"use client";

import * as React from "react";

import { MinecraftDisclosureText } from "./minecraft-disclosure-text";
import {
  isMinecraftEmptyChild,
  isMinecraftTextScalar,
  minecraftClasses as cn,
  minecraftStyle,
} from "./minecraft-render";
import { minecraftSelectAssets } from "./minecraft-select-assets";

import "./minecraft-table.css";

interface TablePaintStyle extends React.CSSProperties {
  "--mc-scale": number;
  "--mc-table-background": string;
  "--mc-table-footer": string;
  "--mc-table-header": string;
}

const TableScale = React.createContext<1 | 2 | 3>(2);

const literalText = function literalText(
  children: React.ReactNode
): string | null {
  let plain = true;
  let result = "";

  const visit = (node: React.ReactNode) => {
    if (isMinecraftEmptyChild(node)) {
      return;
    }

    if (isMinecraftTextScalar(node)) {
      result += String(node);

      return;
    }

    if (Array.isArray(node)) {
      node.forEach(visit);

      return;
    }

    if (
      React.isValidElement<{
        children?: React.ReactNode;
      }>(node) &&
      node.type === React.Fragment
    ) {
      visit(node.props.children);

      return;
    }

    plain = false;
  };

  visit(children);

  return plain ? result : null;
};

interface TextLayout {
  maxTextWidth?: number;
  textAlign?: "left" | "center";
}

const TableText = ({
  children,
  maxTextWidth,
  textAlign = "left",
}: {
  children: React.ReactNode;
} & TextLayout): React.ReactNode => {
  const scale = React.useContext(TableScale);
  const value = literalText(children);

  if (
    typeof children === "undefined" ||
    children === null ||
    typeof children === "boolean"
  ) {
    return null;
  }

  return value === null ? (
    children
  ) : (
    <MinecraftDisclosureText
      scale={scale}
      maxWidth={maxTextWidth}
      align={textAlign}
      style={{ width: "100%" }}
    >
      {value}
    </MinecraftDisclosureText>
  );
};

const Table = ({
  className,
  scale = 2,
  style,
  ...props
}: React.ComponentProps<"table"> & {
  scale?: 1 | 2 | 3;
}) => (
  <TableScale.Provider value={scale}>
    <div
      data-slot="table-container"
      className="mc-table-container"
      style={{ "--mc-scale": scale } as React.CSSProperties}
    >
      <table
        data-slot="table"
        className={cn(`mc-table`, className)}
        style={minecraftStyle(
          style,
          (__style): TablePaintStyle =>
            ({
              "--mc-scale": scale,
              "--mc-table-background":
                minecraftSelectAssets.menu_list_background,
              "--mc-table-footer": minecraftSelectAssets.footer_separator,
              "--mc-table-header": minecraftSelectAssets.header_separator,
              ...__style,
            })
        )}
        {...props}
      />
    </div>
  </TableScale.Provider>
);

const TableHeader = ({
  className,
  ...props
}: React.ComponentProps<"thead">) => (
  <thead
    data-slot="table-header"
    className={cn(`mc-table-header`, className)}
    {...props}
  />
);

const TableBody = ({ className, ...props }: React.ComponentProps<"tbody">) => (
  <tbody
    data-slot="table-body"
    className={cn(`mc-table-body`, className)}
    {...props}
  />
);

const TableFooter = ({
  className,
  ...props
}: React.ComponentProps<"tfoot">) => (
  <tfoot
    data-slot="table-footer"
    className={cn(`mc-table-footer`, className)}
    {...props}
  />
);

const TableRow = ({ className, ...props }: React.ComponentProps<"tr">) => (
  <tr
    data-slot="table-row"
    className={cn(`mc-table-row`, className)}
    {...props}
  />
);

const TableHead = ({
  className,
  children,
  maxTextWidth,
  textAlign,
  ...props
}: React.ComponentProps<"th"> & TextLayout) => (
  <th
    data-slot="table-head"
    scope="col"
    className={cn(`mc-table-head`, className)}
    {...props}
  >
    <TableText maxTextWidth={maxTextWidth} textAlign={textAlign}>
      {children}
    </TableText>
  </th>
);

const TableCell = ({
  className,
  children,
  maxTextWidth,
  textAlign,
  ...props
}: React.ComponentProps<"td"> & TextLayout) => (
  <td
    data-slot="table-cell"
    className={cn(`mc-table-cell`, className)}
    {...props}
  >
    <TableText maxTextWidth={maxTextWidth} textAlign={textAlign}>
      {children}
    </TableText>
  </td>
);

const TableCaption = ({
  className,
  children,
  maxTextWidth,
  textAlign,
  ...props
}: React.ComponentProps<"caption"> & TextLayout) => (
  <caption
    data-slot="table-caption"
    className={cn(`mc-table-caption`, className)}
    {...props}
  >
    <TableText maxTextWidth={maxTextWidth} textAlign={textAlign}>
      {children}
    </TableText>
  </caption>
);

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
