import {
  createColumnHelper,
  flexRender,
  useTable,
} from "@tanstack/react-table";
import type { CellContext, HeaderContext } from "@tanstack/react-table";
import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import { features } from "../registry/blocks/data-table-features";
import type { DataTableFeatures } from "../registry/blocks/data-table-features";
import { Button } from "../registry/ui/button";
import { Input } from "../registry/ui/input";
import { MinecraftDisclosureText } from "../registry/ui/minecraft-disclosure-text";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../registry/ui/table";
import type { DemoProps } from "../types";

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

const sortDirection = (
  sorted: false | "asc" | "desc"
): "none" | "ascending" | "descending" => {
  if (sorted === "asc") {
    return "ascending";
  }

  if (sorted === "desc") {
    return "descending";
  }

  return "none";
};

const WorldTableScale = React.createContext<1 | 2 | 3>(2);

const WorldValueCell = <Value extends string | number>(
  info: CellContext<DataTableFeatures, World, Value>
) => {
  const scale = React.useContext(WorldTableScale);

  return (
    <MinecraftDisclosureText scale={scale}>
      {info.getValue()}
    </MinecraftDisclosureText>
  );
};

const WorldNameHeader = ({
  column,
}: HeaderContext<DataTableFeatures, World, string>) => {
  const scale = React.useContext(WorldTableScale);

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
      className="w-(--demo-width) max-w-full"
      style={
        /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
        {
          "--demo-width": `${100 * scale}px`,
        } satisfies DemoVariables as DemoVariables
      }
      onClick={() => {
        column.toggleSorting();
      }}
    >{`World${sortIndicator}`}</Button>
  );
};

const columns = helper.columns([
  helper.accessor("name", {
    cell: WorldValueCell,
    filterFn: "includesString",
    header: WorldNameHeader,
    sortFn: "text",
  }),
  helper.accessor("players", {
    cell: WorldValueCell,
    header: "Players",
    sortFn: "alphanumeric",
  }),
]);

const DataTableDemo = ({ scale }: DemoProps) => {
  const table = useTable({
    columns,
    data: worlds,
    features,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 2 } },
  });

  return (
    <WorldTableScale.Provider value={scale}>
      <div className="demo-stage" data-stage="data-table">
        <div className="demo-options">
          <Input
            aria-label="Filter worlds"
            placeholder="Search worlds"
            scale={scale}
            className="w-(--demo-width) max-w-full"
            style={
              /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
              {
                "--demo-width": `${160 * scale}px`,
              } satisfies DemoVariables as DemoVariables
            }
            value={
              // SAFETY: This private name filter starts unset and is written only by this Input string value; the SDK intentionally returns unknown.
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Preserve shadcn's controlled filter design at this exact string-or-unset producer boundary.
              (table.getColumn("name")?.getFilterValue() as
                | string
                | undefined) ?? ""
            }
            onChange={(e) =>
              table.getColumn("name")?.setFilterValue(e.target.value)
            }
          />
          <Button
            type="button"
            scale={scale}
            className="w-(--demo-width) max-w-full"
            style={
              /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
              {
                "--demo-width": `${100 * scale}px`,
              } satisfies DemoVariables as DemoVariables
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
                  const headerId = header.id;

                  const _precedingariasort = sortDirection(
                    header.column.getIsSorted()
                  );

                  const headerContent = header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      );

                  return (
                    <TableHead key={headerId} aria-sort={_precedingariasort}>
                      {headerContent}
                    </TableHead>
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
        <div className="demo-options">
          <Button
            scale={scale}
            type="button"
            className="w-(--demo-width)"
            style={
              /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
              {
                "--demo-width": `${80 * scale}px`,
              } satisfies DemoVariables as DemoVariables
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
            className="w-(--demo-width)"
            style={
              /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
              {
                "--demo-width": `${80 * scale}px`,
              } satisfies DemoVariables as DemoVariables
            }
            disabled={!table.getCanNextPage()}
            onClick={() => {
              table.nextPage();
            }}
          >
            Next
          </Button>
        </div>
        <div className="demo-result">
          <span />
          <output aria-label="World selection">
            {table.getFilteredSelectedRowModel().rows.length} selected / Page{" "}
            {table.getPageCount() ? table.state.pagination.pageIndex + 1 : 0} of{" "}
            {table.getPageCount()}
          </output>
        </div>
      </div>
    </WorldTableScale.Provider>
  );
};

export { DataTableDemo as default };
