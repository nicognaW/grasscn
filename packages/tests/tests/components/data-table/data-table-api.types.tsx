import { DataTable } from "@grasscn/web/blocks/data-table";
import { features } from "@grasscn/web/blocks/data-table-features";
import type { DataTableFeatures } from "@grasscn/web/blocks/data-table-features";
import { createColumnHelper, useTable } from "@tanstack/react-table";

interface World {
  id: string;
  name: string;
}

const helper = createColumnHelper<DataTableFeatures, World>();

const columns = helper.columns([
  helper.accessor("name", {
    filterFn: "includesString",
    header: "World",
    sortFn: "text",
  }),
]);

export const example = (
  <DataTable columns={columns} data={[{ id: "a", name: "世界" }]} scale={1} />
);

export const TableComposition = () => {
  const table = useTable({
    columns,
    data: [{ id: "a", name: "世界" }],
    features,
  });

  return (
    <button onClick={() => table.getColumn("name")?.toggleSorting()}>
      Sort
    </button>
  );
};

// @ts-expect-error Toolbar state belongs to the table recipe, not a second component API.
<DataTable columns={columns} data={[]} renderToolbar={() => null} />;
