"use client";

import { useTable, type ColumnDef, type RowData } from "@tanstack/react-table";

import { MinecraftDisclosureText } from "@/components/ui/minecraft-disclosure-text";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { features, type DataTableFeatures } from "./data-table-features";

type DataTableProps<TData extends RowData> = {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  scale?: 1 | 2 | 3;
};

export function DataTable<TData extends RowData>({
  columns,
  data,
  scale = 2,
}: DataTableProps<TData>) {
  const table = useTable({
    features,
    data,
    columns,
    defaultColumn: {
      cell: (info) => (
        <MinecraftDisclosureText scale={scale}>
          {String(info.getValue() ?? "")}
        </MinecraftDisclosureText>
      ),
    },
  });
  return (
    <div data-slot="data-table" className="w-full overflow-hidden">
      <Table scale={scale}>
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
}
