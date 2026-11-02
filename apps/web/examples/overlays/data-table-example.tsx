"use client";

import { createColumnHelper } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table";
import type { DataTableFeatures } from "@/components/data-table-features";

interface World {
  name: string;
  players: number;
}

const helper = createColumnHelper<DataTableFeatures, World>();

const columns = helper.columns([
  helper.accessor("name", { header: "World" }),
  helper.accessor("players", { header: "Players" }),
]);

const worlds: World[] = [
  { name: "Grasslands", players: 4 },
  { name: "Deep Dark", players: 1 },
];

const Example = () => <DataTable columns={columns} data={worlds} />;

export default Example;
