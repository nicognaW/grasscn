import { DataTable } from "@grasscn/web/blocks/data-table";
import {
  features,
  type DataTableFeatures,
} from "@grasscn/web/blocks/data-table-features";
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
type World = { id: string; name: string; players: number };
const helper = createColumnHelper<DataTableFeatures, World>(),
  worlds: World[] = [
    { id: "a", name: "Alpha", players: 4 },
    { id: "b", name: "你好，世界", players: 2 },
    { id: "c", name: "Birch", players: 8 },
    { id: "d", name: "Desert", players: 1 },
  ];
const p = new URLSearchParams(location.search),
  scale = Number(p.get("scale") ?? 2) as 1 | 2 | 3,
  part = p.get("part"),
  width = Number(p.get("width") ?? 200),
  height = Number(p.get("height") ?? 9),
  label = p.get("label") ?? "Minecraft";
export function DataTableFixture() {
  React.useLayoutEffect(() => {
    const bg = p.get("background") ?? "#202020";
    document.documentElement.style.background = document.body.style.background =
      bg;
  }, []);
  const [events, setEvents] = React.useState(0);
  const columns = React.useMemo(
    () =>
      helper.columns([
        helper.accessor("name", {
          header: "World",
          filterFn: "includesString",
          sortFn: "text",
        }),
        helper.accessor("players", {
          header: "Players",
          sortFn: "alphanumeric",
          cell: (info) => (
            <strong data-testid="rich-cell">{info.getValue()}</strong>
          ),
        }),
      ]),
    []
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
            helper.accessor("name", { header: () => text, cell: () => text }),
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
        id="sort"
        onClick={() => table.getColumn("name")?.toggleSorting()}
      >
        Sort
      </button>
      <button
        id="visibility"
        onClick={() => table.getColumn("players")?.toggleVisibility()}
      >
        Columns
      </button>
      <button id="page-size" onClick={() => table.setPageSize(4)}>
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
        id="previous"
        disabled={!table.getCanPreviousPage()}
        onClick={() => table.previousPage()}
      >
        Previous
      </button>
      <button
        id="next"
        disabled={!table.getCanNextPage()}
        onClick={() => table.nextPage()}
      >
        Next
      </button>
      <output id="page">{table.state.pagination.pageIndex + 1}</output>
      <output id="selection">{table.getSelectedRowModel().rows.length}</output>
      <button
        id="ref"
        onClick={() => setEvents(table.getCoreRowModel().rows.length)}
      >
        Ref
      </button>
      <output id="events">{events}</output>
    </>
  );
}
