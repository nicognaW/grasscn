"use client";

import { createColumnHelper, useTable } from "@tanstack/react-table";
import * as React from "react";

import {
  features,
  type DataTableFeatures,
} from "@/components/data-table-features";
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

type World = { id: string; name: string; players: number };

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
          header: ({ column }) => (
            <Button
              type="button"
              scale={scale}
              aria-label="World"
              style={{ width: 100 * scale, maxWidth: "100%" }}
              onClick={() => column.toggleSorting()}
            >{`World${column.getIsSorted() === "asc" ? " ^" : column.getIsSorted() === "desc" ? " v" : ""}`}</Button>
          ),
          filterFn: "includesString",
          sortFn: "text",
        }),
        helper.accessor("players", {
          header: "Players",
          sortFn: "alphanumeric",
        }),
      ]),
    [scale]
  );

  const table = useTable({
    features,
    columns,
    data: worlds,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 2 } },
    defaultColumn: {
      cell: (info) => (
        <MinecraftDisclosureText scale={scale}>
          {String(info.getValue() ?? "")}
        </MinecraftDisclosureText>
      ),
    },
  });

  return (
    <div data-stage="data-table">
      <div>
        <Input
          aria-label="Filter worlds"
          placeholder="Search worlds"
          scale={scale}
          style={{ width: 160 * scale, maxWidth: "100%" }}
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(e) =>
            table.getColumn("name")?.setFilterValue(e.target.value)
          }
        />
        <Button
          type="button"
          scale={scale}
          style={{ width: 100 * scale, maxWidth: "100%" }}
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
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : typeof header.column.columnDef
                      .header === "string" ? (
                    header.column.columnDef.header
                  ) : (
                    <table.FlexRender header={header} />
                  )}
                </TableHead>
              ))}
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
                onClick={() => row.toggleSelected()}
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
          style={{ width: 80 * scale }}
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          Previous
        </Button>
        <Button
          scale={scale}
          type="button"
          style={{ width: 80 * scale }}
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
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
