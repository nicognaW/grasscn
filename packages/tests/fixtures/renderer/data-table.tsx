import { DataTable } from "@grasscn/web/blocks/data-table";
import { features } from "@grasscn/web/blocks/data-table-features";
import type { DataTableFeatures } from "@grasscn/web/blocks/data-table-features";
import { Input } from "@grasscn/web/ui/input";
import { MinecraftDisclosureText } from "@grasscn/web/ui/minecraft-disclosure-text";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@grasscn/web/ui/table";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import * as React from "react";

interface World {
  id: string;
  name: string;
  players: number;
}

const helper = createColumnHelper<DataTableFeatures, World>();

const worlds: World[] = [
  { id: "a", name: "Alpha", players: 4 },
  { id: "b", name: "你好，世界", players: 2 },
  { id: "c", name: "Birch", players: 8 },
  { id: "d", name: "Desert", players: 1 },
];

const p = new URLSearchParams(location.search);

// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale =
  // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
  Number(p.get("scale") ?? 2) as 1 | 2 | 3;

const part = p.get("part");
const width = Number(p.get("width") ?? 200);
const height = Number(p.get("height") ?? 9);
const label = p.get("label") ?? "Minecraft";

export const DataTableFixture = () => {
  React.useLayoutEffect(() => {
    const bg = p.get("background") ?? "#202020";
    const chainedBackgroundOuter = document.documentElement.style;
    const chainedBackgroundInner = document.body.style;
    const chainedBackgroundValue = bg;
    chainedBackgroundInner.background = chainedBackgroundValue;
    chainedBackgroundOuter.background = chainedBackgroundValue;
  }, []);
  const [events, setEvents] = React.useState(0);

  const columns = React.useMemo(
    () =>
      helper.columns([
        helper.accessor("name", {
          filterFn: "includesString",
          header: "World",
          sortFn: "text",
        }),
        helper.accessor("players", {
          cell: (info) => (
            <strong data-testid="rich-cell">{info.getValue()}</strong>
          ),
          header: "Players",
          sortFn: "alphanumeric",
        }),
      ]),
    []
  );

  const table = useTable({
    columns,
    data: worlds,
    defaultColumn: {
      cell: (info) => (
        <MinecraftDisclosureText scale={scale}>
          {String(info.getValue() ?? "")}
        </MinecraftDisclosureText>
      ),
    },
    features,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 2 } },
  });

  if (p.has("native")) {
    const text = (
      <MinecraftDisclosureText
        scale={scale}
        maxWidth={p.has("wrapWidth") ? Number(p.get("wrapWidth")) : undefined}
        align={p.get("alignment") === "center" ? "center" : "left"}
        style={{ width: "100%" }}
      >
        {label}
      </MinecraftDisclosureText>
    );

    return (
      <>
        <style>{`[data-slot=data-table]{position:fixed;left:${Number(p.get("x") ?? 16) * scale}px;top:${Number(p.get("y") ?? 16) * scale}px;width:${width * scale}px}[data-slot=table]{width:${width * scale}px;table-layout:fixed}[data-slot=table-header]::after{background:none}[data-slot=table-body]{background:none}[data-slot=table-row]{height:${height * scale}px}[data-slot=table-head],[data-slot=table-cell]{padding:0;height:${height * scale}px;vertical-align:top}${part === "head" ? "[data-slot=table-body]{display:none}" : "[data-slot=table-header]{display:none}"}`}</style>
        <DataTable
          scale={scale}
          columns={helper.columns([
            helper.accessor("name", { cell: () => text, header: () => text }),
          ])}
          data={[{ id: "probe", name: label, players: 0 }]}
        />
      </>
    );
  }

  return (
    <>
      <Input
        aria-label="Filter worlds"
        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
        onChange={(e) =>
          table.getColumn("name")?.setFilterValue(e.target.value)
        }
      />
      <button
        type="button"
        id="sort"
        onClick={() => table.getColumn("name")?.toggleSorting()}
      >
        Sort
      </button>
      <button
        type="button"
        id="visibility"
        onClick={() => table.getColumn("players")?.toggleVisibility()}
      >
        Columns
      </button>
      <button
        type="button"
        id="page-size"
        onClick={() => {
          table.setPageSize(4);
        }}
      >
        Page size
      </button>
      <Table scale={scale} aria-label="Worlds">
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  aria-sort={
                    header.column.getIsSorted() === "asc"
                      ? "ascending"
                      : header.column.getIsSorted() === "desc"
                        ? "descending"
                        : "none"
                  }
                >
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
                onClick={() => {
                  row.toggleSelected();
                  setEvents((v) => v + 1);
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
              <TableCell
                colSpan={Math.max(1, table.getVisibleLeafColumns().length)}
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <button
        type="button"
        id="previous"
        disabled={!table.getCanPreviousPage()}
        onClick={() => {
          table.previousPage();
        }}
      >
        Previous
      </button>
      <button
        type="button"
        id="next"
        disabled={!table.getCanNextPage()}
        onClick={() => {
          table.nextPage();
        }}
      >
        Next
      </button>
      <output id="page">{table.state.pagination.pageIndex + 1}</output>
      <output id="selection">{table.getSelectedRowModel().rows.length}</output>
      <button
        type="button"
        id="ref"
        onClick={() => {
          setEvents(table.getCoreRowModel().rows.length);
        }}
      >
        Ref
      </button>
      <output id="events">{events}</output>
    </>
  );
};
