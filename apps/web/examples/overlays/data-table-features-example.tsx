"use client";

import { createColumnHelper, useTable } from "@tanstack/react-table";
import * as React from "react";
import type { CSSProperties as IntrinsicLayoutCSSProperties } from "react";

import type { DataTableFeatures } from "@/components/data-table-features";
import { features } from "@/components/data-table-features";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MinecraftDisclosureText } from "@/components/ui/minecraft-disclosure-text";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface ForwardedLayoutStyle1 extends IntrinsicLayoutCSSProperties {
  "--mc-forwarded-examples-overlays-data-table-features-example-1-width": `${number}px`;
}

interface ForwardedLayoutStyle2 extends IntrinsicLayoutCSSProperties {
  "--mc-forwarded-examples-overlays-data-table-features-example-2-width": `${number}px`;
}

interface ForwardedLayoutStyle3 extends IntrinsicLayoutCSSProperties {
  "--mc-forwarded-examples-overlays-data-table-features-example-3-width": `${number}px`;
}

interface ForwardedLayoutStyle4 extends IntrinsicLayoutCSSProperties {
  "--mc-forwarded-examples-overlays-data-table-features-example-4-width": `${number}px`;
}

interface ForwardedLayoutStyle5 extends IntrinsicLayoutCSSProperties {
  "--mc-forwarded-examples-overlays-data-table-features-example-5-width": `${number}px`;
}

interface World {
  id: string;
  name: string;
  players: number;
}

const helper = createColumnHelper<DataTableFeatures, World>();

const worlds: World[] = [
  { id: "a", name: "Grasslands", players: 4 },
  { id: "b", name: "你好，世界", players: 2 },
  { id: "c", name: "Birch Forest", players: 8 },
  { id: "d", name: "Deep Dark", players: 1 },
];

const DataTableDemo = ({ scale = 2 }: { scale?: 1 | 2 | 3 }) => {
  const columns = React.useMemo(
    () =>
      helper.columns([
        helper.accessor("name", {
          cell: (info) => (
            <MinecraftDisclosureText scale={scale}>
              {info.getValue()}
            </MinecraftDisclosureText>
          ),
          filterFn: "includesString",
          header: ({ column }) => {
            let sortIndicator = "";

            if (column.getIsSorted() === "asc") {
              sortIndicator = " ^";
            } else if (column.getIsSorted() === "desc") {
              sortIndicator = " v";
            }

            return (
              <Button
                type="button"
                scale={scale}
                aria-label="World"
                className="w-(--mc-forwarded-examples-overlays-data-table-features-example-1-width) max-w-full"
                style={
                  // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
                  {
                    "--mc-forwarded-examples-overlays-data-table-features-example-1-width": `${100 * scale}px`,
                  } satisfies ForwardedLayoutStyle1 as ForwardedLayoutStyle1
                }
                onClick={() => {
                  column.toggleSorting();
                }}
              >{`World${sortIndicator}`}</Button>
            );
          },
          sortFn: "text",
        }),
        helper.accessor("players", {
          cell: (info) => (
            <MinecraftDisclosureText scale={scale}>
              {info.getValue()}
            </MinecraftDisclosureText>
          ),
          header: "Players",
          sortFn: "alphanumeric",
        }),
      ]),
    [scale]
  );

  const table = useTable({
    columns,
    data: worlds,
    features,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 2 } },
  });

  return (
    <div data-stage="data-table">
      <div>
        <Input
          aria-label="Filter worlds"
          placeholder="Search worlds"
          scale={scale}
          className="w-(--mc-forwarded-examples-overlays-data-table-features-example-2-width) max-w-full"
          style={
            // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
            {
              "--mc-forwarded-examples-overlays-data-table-features-example-2-width": `${160 * scale}px`,
            } satisfies ForwardedLayoutStyle2 as ForwardedLayoutStyle2
          }
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(e) =>
            table.getColumn("name")?.setFilterValue(e.target.value)
          }
        />
        <Button
          type="button"
          scale={scale}
          className="w-(--mc-forwarded-examples-overlays-data-table-features-example-3-width) max-w-full"
          style={
            // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
            {
              "--mc-forwarded-examples-overlays-data-table-features-example-3-width": `${100 * scale}px`,
            } satisfies ForwardedLayoutStyle3 as ForwardedLayoutStyle3
          }
          aria-pressed={table.getColumn("players")?.getIsVisible()}
          onClick={() => table.getColumn("players")?.toggleVisibility()}
        >
          Players column
        </Button>
      </div>
      <Table scale={scale} aria-label="World browser">
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const _precedingkey = header.id;
                let _selectedContent: React.ReactNode;

                if (header.isPlaceholder) {
                  _selectedContent = null;
                } else if (typeof header.column.columnDef.header === "string") {
                  _selectedContent = header.column.columnDef.header;
                } else {
                  _selectedContent = <table.FlexRender header={header} />;
                }

                return (
                  <TableHead key={_precedingkey}>{_selectedContent}</TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                tabIndex={0}
                aria-selected={row.getIsSelected()}
                data-state={row.getIsSelected() ? "selected" : undefined}
                onClick={() => {
                  row.toggleSelected();
                }}
                onKeyDown={(e) => {
                  if (
                    e.target === e.currentTarget &&
                    (e.key === " " || e.key === "Enter")
                  ) {
                    e.preventDefault();
                    row.toggleSelected();
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={table.getVisibleLeafColumns().length}>
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div>
        <Button
          scale={scale}
          type="button"
          className="w-(--mc-forwarded-examples-overlays-data-table-features-example-4-width)"
          style={
            // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
            {
              "--mc-forwarded-examples-overlays-data-table-features-example-4-width": `${80 * scale}px`,
            } satisfies ForwardedLayoutStyle4 as ForwardedLayoutStyle4
          }
          disabled={!table.getCanPreviousPage()}
          onClick={() => {
            table.previousPage();
          }}
        >
          Previous
        </Button>
        <Button
          scale={scale}
          type="button"
          className="w-(--mc-forwarded-examples-overlays-data-table-features-example-5-width)"
          style={
            // SAFETY: These required variables are consumed by the literal layout utility classes or existing demo role hooks; satisfies checks their primitive values and the interface supplies React’s CSSProperties view.
            {
              "--mc-forwarded-examples-overlays-data-table-features-example-5-width": `${80 * scale}px`,
            } satisfies ForwardedLayoutStyle5 as ForwardedLayoutStyle5
          }
          disabled={!table.getCanNextPage()}
          onClick={() => {
            table.nextPage();
          }}
        >
          Next
        </Button>
      </div>
      <div>
        <span />
        <output aria-label="World selection">
          {table.getFilteredSelectedRowModel().rows.length} selected / Page{" "}
          {table.getPageCount() ? table.state.pagination.pageIndex + 1 : 0} of{" "}
          {table.getPageCount()}
        </output>
      </div>
    </div>
  );
};

export { DataTableDemo as default };
