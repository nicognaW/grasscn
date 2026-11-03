"use client";

import { useTable } from "@tanstack/react-table";
import type { ColumnDef, RowData } from "@tanstack/react-table";
import type * as React from "react";

import { MinecraftDisclosureText } from "@/components/ui/minecraft-disclosure-text";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { features } from "./data-table-features";
import type { DataTableFeatures } from "./data-table-features";

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  scale?: 1 | 2 | 3;
}

export const DataTable = <TData extends RowData>({
  columns,
  data,
  scale = 2,
}: DataTableProps<TData>) => {
  const table = useTable({
    columns,
    data,
    defaultColumn: {
      cell: (info) => (
        <MinecraftDisclosureText scale={scale}>
          {String(info.getValue() ?? "")}
        </MinecraftDisclosureText>
      ),
    },
    features,
  });

  return (
    <div data-slot="data-table" className="w-full overflow-hidden">
      <Table scale={scale}>
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
                data-state={row.getIsSelected() ? "selected" : undefined}
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
              <TableCell colSpan={columns.length}>No results.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
