import * as React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable, type DataTableFeatures, type DataTableInstance } from "../registry/ui/data-table";
type World = {
    id: string;
    name: string;
};
const h = createColumnHelper<DataTableFeatures, World>();
const ref = React.createRef<DataTableInstance<World>>();
export const api = <DataTable tableRef={ref} columns={h.columns([h.accessor("name", { header: "World", filterFn: "includesString", sortFn: "text" })])} data={[{ id: "a", name: "世界" }]} options={{ getRowId: row => row.id, initialState: { pagination: { pageIndex: 0, pageSize: 5 } } }} renderToolbar={table => <button onClick={() => table.getColumn("name")?.toggleSorting()}>Sort</button>} renderFooter={table => <button onClick={() => table.nextPage()}>Next</button>} rowProps={row => ({ onClick: () => row.toggleSelected() })} scale={1} textLayout={{ maxWidth: 100, align: "center" }} emptyMessage="Empty" aria-label="Worlds"/>;
